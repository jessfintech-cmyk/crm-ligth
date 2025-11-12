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
    const { prompt, contextId, chatName, phone, status, valorSolicitado, banco } = await req.json();
    
    const GPTMAKER_TOKEN = Deno.env.get('GPTMAKER_TOKEN');
    const GPTMAKER_AGENT_ID = Deno.env.get('GPTMAKER_AGENT_ID');
    
    if (!GPTMAKER_TOKEN || !GPTMAKER_AGENT_ID) {
      throw new Error('GPTMAKER_TOKEN ou GPTMAKER_AGENT_ID não configurado');
    }

    // Configurar contexto do agente baseado no status do cliente
    const agentesContexto: Record<string, string> = {
      novo: `CONTEXTO: Você é um Agente de Captação especializado em crédito consignado. O cliente ${chatName} está iniciando uma solicitação de R$ ${valorSolicitado}. Seja cordial, entusiasta e proativo. Apresente-se e explique os próximos passos de forma clara e confiante.`,
      analise: `CONTEXTO: Você é um Agente de Análise de crédito consignado. O cliente ${chatName} tem uma proposta em análise no ${banco} de R$ ${valorSolicitado}. Seja detalhista e orientador. Explique o processo de análise e documentos necessários.`,
      retencao: `CONTEXTO: Você é um Agente de Retenção bancária. O cliente ${chatName} aguarda retorno do ${banco} sobre a proposta de R$ ${valorSolicitado}. Seja paciente e informativo. Mantenha tranquilidade sobre prazos bancários.`,
      documentacao: `CONTEXTO: Você é um Agente de Documentação. Auxilie ${chatName} com documentos para o crédito de R$ ${valorSolicitado} no ${banco}. Seja organizado e claro. Liste documentos necessários de forma objetiva.`,
      pagamento: `CONTEXTO: Você é um Agente de Pagamento. A proposta de ${chatName} foi aprovada! São R$ ${valorSolicitado} do ${banco}. Seja profissional e conclusivo. Confirme dados e parabenize.`,
      finalizado: `CONTEXTO: Você é um Agente de Pós-venda. Faça follow-up com ${chatName} sobre o crédito de R$ ${valorSolicitado}. Seja atencioso e focado em relacionamento. Busque satisfação do cliente.`
    };

    const contextoAgente = agentesContexto[status || 'novo'] || `CONTEXTO: Você é um assistente especializado em crédito consignado. Seja cordial e prestativo.`;
    
    // Adicionar contexto ao prompt
    const promptComContexto = `${contextoAgente}\n\nMENSAGEM DO CLIENTE: ${prompt}`;

    console.log('Enviando para GPT Maker:', {
      agentId: GPTMAKER_AGENT_ID,
      contextId,
      chatName,
      status: status || 'novo'
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
          prompt: promptComContexto,
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
