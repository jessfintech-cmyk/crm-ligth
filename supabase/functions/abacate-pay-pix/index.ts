import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PixRequest {
  amount: number;
  description: string;
  customer: {
    name: string;
    cellphone: string;
    email: string;
    taxId: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, description, customer }: PixRequest = await req.json();
    
    console.log('Creating PIX QR Code for:', customer.email);

    const abacatePayToken = Deno.env.get('ABACATE_PAY_API_KEY');
    
    if (!abacatePayToken) {
      throw new Error('ABACATE_PAY_API_KEY not configured');
    }

    const url = 'https://api.abacatepay.com/v1/pixQrCode/create';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${abacatePayToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        expiresIn: 3600, // 1 hour
        description,
        customer: {
          name: customer.name,
          cellphone: customer.cellphone,
          email: customer.email,
          taxId: customer.taxId
        },
        metadata: {
          externalId: `landing-${Date.now()}`
        }
      })
    };

    console.log('Calling Abacate Pay API...');
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      console.error('Abacate Pay API error:', data);
      throw new Error(data.error?.message || 'Failed to create PIX QR Code');
    }

    console.log('PIX QR Code created successfully:', data.data.id);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in abacate-pay-pix function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
