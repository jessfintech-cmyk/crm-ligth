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
    const { prompt, contextId, chatName, phone } = await req.json();
    
    const GPTMAKER_TOKEN = Deno.env.get('GPTMAKER_TOKEN');
    const GPTMAKER_AGENT_ID = Deno.env.get('GPTMAKER_AGENT_ID');
    
    if (!GPTMAKER_TOKEN || !GPTMAKER_AGENT_ID) {
      throw new Error('GPTMAKER_TOKEN ou GPTMAKER_AGENT_ID não configurado');
    }

    console.log('Enviando mensagem para GPT Maker:', {
      agentId: GPTMAKER_AGENT_ID,
      contextId,
      chatName,
      phone
    });

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro GPT Maker:', response.status, errorText);
      throw new Error(`Erro na API do GPT Maker: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta do GPT Maker:', data);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro em gptmaker-chat:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Desculpe, houve um erro ao processar sua mensagem.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
