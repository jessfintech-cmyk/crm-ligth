-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar tabela para armazenar mensagens do WhatsApp
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_cpf TEXT NOT NULL,
  cliente_nome TEXT,
  cliente_telefone TEXT NOT NULL,
  remetente TEXT NOT NULL CHECK (remetente IN ('cliente', 'ia', 'agente')),
  texto TEXT NOT NULL,
  agente_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_whatsapp_messages_telefone ON public.whatsapp_messages(cliente_telefone);
CREATE INDEX idx_whatsapp_messages_cpf ON public.whatsapp_messages(cliente_cpf);
CREATE INDEX idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública
CREATE POLICY "Permitir leitura de mensagens"
ON public.whatsapp_messages
FOR SELECT
USING (true);

-- Política para permitir inserção pública (webhook vai inserir)
CREATE POLICY "Permitir inserção de mensagens"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_messages_updated_at
BEFORE UPDATE ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;