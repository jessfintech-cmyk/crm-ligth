import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Webhook recebido do GPT Maker:', payload);

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extrair dados da mensagem do webhook
    const { 
      contextId, // CPF do cliente
      prompt, // Mensagem do cliente
      chatName, // Nome do cliente
      phone // Telefone do cliente
    } = payload;

    if (!contextId || !prompt || !phone) {
      console.error('Dados incompletos no webhook:', payload);
      return new Response(
        JSON.stringify({ error: 'Dados incompletos no webhook' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Salvar mensagem do cliente no banco
    const { error: insertError } = await supabase
      .from('whatsapp_messages')
      .insert({
        cliente_cpf: contextId,
        cliente_nome: chatName,
        cliente_telefone: phone,
        remetente: 'cliente',
        texto: prompt,
      });

    if (insertError) {
      console.error('Erro ao salvar mensagem:', insertError);
      throw new Error('Erro ao salvar mensagem no banco');
    }

    console.log('Mensagem salva com sucesso');

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
