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
    const { messageId, messageText } = await req.json();
    
    if (!messageId || !messageText) {
      throw new Error('messageId e messageText são obrigatórios');
    }

    console.log('Categorizando mensagem:', { messageId, messageText });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurado');
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar tags disponíveis
    const { data: tagsDisponiveis, error: tagsError } = await supabase
      .from('tags')
      .select('id, nome');

    if (tagsError) {
      console.error('Erro ao buscar tags:', tagsError);
      throw new Error('Erro ao buscar tags');
    }

    const tagsNomes = tagsDisponiveis.map(t => t.nome).join(', ');

    // Usar IA para categorizar a mensagem
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema de categorização de mensagens de crédito consignado.
Analise a mensagem e retorne APENAS as tags mais relevantes separadas por vírgula.
Tags disponíveis: ${tagsNomes}
Retorne no máximo 3 tags. Se nenhuma tag se aplicar perfeitamente, escolha as mais próximas.
IMPORTANTE: Retorne APENAS os nomes das tags, separados por vírgula, sem explicações ou texto adicional.`
          },
          {
            role: 'user',
            content: `Mensagem: "${messageText}"`
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const categorizacao = data.choices[0].message.content.trim();
    console.log('Categorização recebida:', categorizacao);

    // Processar tags retornadas
    const tagsRetornadas = categorizacao
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0);

    console.log('Tags identificadas:', tagsRetornadas);

    // Associar tags à mensagem
    for (const tagNome of tagsRetornadas) {
      const tag = tagsDisponiveis.find(t => 
        t.nome.toLowerCase() === tagNome.toLowerCase()
      );

      if (tag) {
        const { error: insertError } = await supabase
          .from('message_tags')
          .insert({
            message_id: messageId,
            tag_id: tag.id,
            confianca: 0.90
          })
          .select()
          .single();

        if (insertError && !insertError.message.includes('duplicate')) {
          console.error('Erro ao inserir tag:', insertError);
        } else {
          console.log(`Tag "${tag.nome}" associada à mensagem`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tags: tagsRetornadas,
        messageId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro em categorize-message:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
