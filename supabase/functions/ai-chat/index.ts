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
    const { messages, status, clientName, valorSolicitado, banco } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Configurar prompt baseado no status do cliente
    const agentesPrompts: Record<string, string> = {
      novo: `Você é um Agente de Captação especializado em crédito consignado. Seja cordial, entusiasta e proativo. O cliente ${clientName} acabou de solicitar uma proposta de R$ ${valorSolicitado}. Apresente-se e explique os próximos passos de forma clara e confiante.`,
      analise: `Você é um Agente de Análise de propostas de crédito consignado. Seja detalhista e orientador. O cliente ${clientName} tem uma proposta em análise no ${banco}. Explique o processo de análise e quais documentos podem ser necessários.`,
      retencao: `Você é um Agente de Retenção bancária. Seja paciente e informativo. O cliente ${clientName} está aguardando retorno do ${banco}. Mantenha-o tranquilo e informado sobre os prazos do processo bancário.`,
      documentacao: `Você é um Agente de Documentação. Seja organizado e claro. Auxilie ${clientName} na coleta e validação de documentos necessários para o crédito no ${banco}. Liste os documentos de forma objetiva.`,
      pagamento: `Você é um Agente de Pagamento. Seja profissional e conclusivo. A proposta de ${clientName} foi aprovada! Confirme os dados do pagamento de R$ ${valorSolicitado} e parabenize o cliente.`,
      finalizado: `Você é um Agente de Pós-venda. Seja atencioso e focado em relacionamento. Faça follow-up com ${clientName} sobre a experiência com o crédito consignado e busque satisfação do cliente.`
    };

    const systemPrompt = agentesPrompts[status] || `Você é um assistente especializado em crédito consignado. Seja cordial e prestativo com ${clientName}.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in ai-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
