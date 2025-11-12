import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId, message } = await req.json();
    
    const GPTMAKER_TOKEN = Deno.env.get('GPTMAKER_TOKEN');
    
    if (!GPTMAKER_TOKEN) {
      throw new Error('GPTMAKER_TOKEN não configurado');
    }

    if (!chatId || !message) {
      throw new Error('chatId e message são obrigatórios');
    }

    console.log('Enviando mensagem para chat:', chatId);

    const response = await fetch(
      `https://api.gptmaker.ai/v2/chat/${chatId}/send-message`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GPTMAKER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro GPT Maker:', response.status, errorText);
      throw new Error(`Erro na API do GPT Maker: ${response.status}`);
    }

    const data = await response.json();
    console.log('Mensagem enviada com sucesso:', data);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro em gptmaker-send:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
