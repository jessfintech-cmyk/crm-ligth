import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificação do webhook (GET)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'lovable_whatsapp_token';

      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verificado com sucesso');
        return new Response(challenge, { status: 200 });
      } else {
        console.error('Falha na verificação do webhook');
        return new Response('Forbidden', { status: 403 });
      }
    }

    // Recebimento de mensagens (POST)
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Webhook recebido:', JSON.stringify(body, null, 2));

      // Inicializar cliente Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Processar mensagens recebidas
      if (body.entry && body.entry[0]?.changes) {
        for (const change of body.entry[0].changes) {
          if (change.value?.messages) {
            for (const message of change.value.messages) {
              const from = message.from;
              const text = message.text?.body || '';
              const name = change.value.contacts?.[0]?.profile?.name || 'Desconhecido';

              console.log(`Mensagem de ${name} (${from}): ${text}`);

              // Salvar mensagem no banco de dados
              const { error: insertError } = await supabase
                .from('whatsapp_messages')
                .insert({
                  cliente_telefone: from,
                  cliente_nome: name,
                  cliente_cpf: from, // Usar telefone como identificador temporário
                  remetente: 'cliente',
                  texto: text,
                });

              if (insertError) {
                console.error('Erro ao salvar mensagem:', insertError);
              } else {
                console.log('Mensagem salva no banco de dados');
              }

              // Aqui você pode adicionar lógica para responder automaticamente
              // ou processar a mensagem com IA
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error) {
    console.error('Erro em whatsapp-webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
