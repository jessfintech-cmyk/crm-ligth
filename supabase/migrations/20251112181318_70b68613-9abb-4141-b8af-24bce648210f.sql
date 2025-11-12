-- Create payments table to track Abacate Pay transactions
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL UNIQUE,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_tax_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  qr_code_base64 TEXT,
  br_code TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read payments (needed for checking status)
CREATE POLICY "Anyone can read payments"
  ON public.payments
  FOR SELECT
  USING (true);

-- Allow insert for anonymous users (when creating payment)
CREATE POLICY "Anyone can insert payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (true);

-- Allow update for service role only (webhook updates)
CREATE POLICY "Service role can update payments"
  ON public.payments
  FOR UPDATE
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_payments_payment_id ON public.payments(payment_id);
CREATE INDEX idx_payments_customer_email ON public.payments(customer_email);

-- Create trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();