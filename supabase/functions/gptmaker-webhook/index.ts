import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema de validação para webhook
const webhookSchema = z.object({
  contextId: z.string().regex(/^\d{11}$/, 'CPF deve conter exatamente 11 dígitos'),
  prompt: z.string().min(1, 'Mensagem não pode estar vazia').max(4000, 'Mensagem muito longa (máximo 4000 caracteres)'),
  chatName: z.string().max(200, 'Nome muito longo').optional(),
  phone: z.string().regex(/^[\d+\-\s()]{10,20}$/, 'Formato de telefone inválido')
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    
    // Validar entrada antes de processar
    const validationResult = webhookSchema.safeParse(payload);
    if (!validationResult.success) {
      console.error('Dados inválidos no webhook:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          error: 'Dados inválidos no webhook',
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Webhook recebido e validado do GPT Maker');

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Usar dados validados
    const { contextId, prompt, chatName, phone } = validationResult.data;

    // Salvar mensagem do cliente no banco
    const { data: insertData, error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        cliente_cpf: contextId,
        cliente_nome: chatName,
        cliente_telefone: phone,
        remetente: 'cliente',
        texto: prompt,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Erro ao salvar mensagem:', insertError);
      throw new Error('Erro ao salvar mensagem no banco');
    }

    console.log('Mensagem salva com sucesso');

    // Categorizar mensagem automaticamente em background
    (async () => {
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/categorize-message`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messageId: insertData.id,
              messageText: prompt
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log('Mensagem categorizada:', result);
        }
      } catch (error) {
        console.error('Erro ao categorizar mensagem:', error);
      }
    })();

    // Enviar resposta automática via GPT Maker em background
    const GPTMAKER_TOKEN = Deno.env.get('GPTMAKER_TOKEN');
    const GPTMAKER_AGENT_ID = Deno.env.get('GPTMAKER_AGENT_ID');

    if (GPTMAKER_TOKEN && GPTMAKER_AGENT_ID) {
      // Processar resposta em background (sem await)
      (async () => {
        try {
          console.log('Enviando resposta automática...');
          const response = await fetch(
            `https://api.gptmaker.ai/v2/agent/${GPTMAKER_AGENT_ID}/conversation`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${GPTMAKER_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contextId,
                prompt,
                chatName,
                phone
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            console.log('Resposta automática enviada:', data);

            // Salvar resposta da IA no banco
            if (data.message) {
              await supabase
                .from('whatsapp_messages')
                .insert({
                  cliente_cpf: contextId,
                  cliente_nome: chatName,
                  cliente_telefone: phone,
                  remetente: 'ia',
                  texto: data.message,
                  agente_nome: 'GPT Maker',
                });
            }
          } else {
            console.error('Erro ao enviar resposta automática:', response.status);
          }
        } catch (error) {
          console.error('Erro no processamento em background:', error);
        }
      })();
    }

    // Responder imediatamente ao webhook
    return new Response(
      JSON.stringify({ success: true, message: 'Mensagem recebida e processada' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
