import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckRequest {
  pixId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pixId }: CheckRequest = await req.json();
    
    console.log('Checking PIX payment status for:', pixId);

    const abacatePayToken = Deno.env.get('ABACATE_PAY_API_KEY');
    
    if (!abacatePayToken) {
      throw new Error('ABACATE_PAY_API_KEY not configured');
    }

    const url = `https://api.abacatepay.com/v1/pixQrCode/check?id=${pixId}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${abacatePayToken}`,
      }
    };

    console.log('Calling Abacate Pay Check API...');
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      console.error('Abacate Pay Check API error:', data);
      throw new Error(data.error?.message || 'Failed to check PIX payment');
    }

    console.log('PIX payment status checked:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in abacate-pay-check function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
