import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckRequest {
  paymentId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId }: CheckRequest = await req.json();
    
    console.log('Checking payment status for:', paymentId);

    const abacatePayToken = Deno.env.get('ABACATE_PAY_API_KEY');
    
    if (!abacatePayToken) {
      throw new Error('ABACATE_PAY_API_KEY not configured');
    }

    const url = `https://api.abacatepay.com/v1/pixQrCode/check/${paymentId}`;
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
      console.error('Abacate Pay API error:', data);
      throw new Error(data.error?.message || 'Failed to check payment status');
    }

    console.log('Payment status checked successfully:', data.data.status);

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
