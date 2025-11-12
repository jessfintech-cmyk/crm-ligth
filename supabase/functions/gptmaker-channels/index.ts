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
    const GPTMAKER_TOKEN = Deno.env.get('GPTMAKER_TOKEN');
    const GPTMAKER_AGENT_ID = Deno.env.get('GPTMAKER_AGENT_ID');
    
    if (!GPTMAKER_TOKEN) {
      throw new Error('GPTMAKER_TOKEN não configurado');
    }

    if (!GPTMAKER_AGENT_ID) {
      throw new Error('GPTMAKER_AGENT_ID não configurado');
    }

    console.log('Buscando canais do agente:', GPTMAKER_AGENT_ID);

    const response = await fetch(
      `https://api.gptmaker.ai/v2/agent/${GPTMAKER_AGENT_ID}/search`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${GPTMAKER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro GPT Maker:', response.status, errorText);
      throw new Error(`Erro na API do GPT Maker: ${response.status}`);
    }

    const data = await response.json();
    console.log('Canais recebidos:', data.count || 0);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro em gptmaker-channels:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        data: [],
        count: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
