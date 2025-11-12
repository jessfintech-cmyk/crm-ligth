import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  data: {
    id: string;
    status: string;
    amount: number;
    paidAt?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    // Initialize Supabase client with service role key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paymentId = payload.data.id;
    const newStatus = payload.data.status;

    // Update payment status in database
    const { data, error } = await supabaseAdmin
      .from('payments')
      .update({
        status: newStatus,
        paid_at: newStatus === 'COMPLETED' ? new Date().toISOString() : null,
      })
      .eq('payment_id', paymentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment:', error);
      throw error;
    }

    console.log('Payment updated successfully:', data);

    return new Response(
      JSON.stringify({ success: true, payment: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in webhook handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
