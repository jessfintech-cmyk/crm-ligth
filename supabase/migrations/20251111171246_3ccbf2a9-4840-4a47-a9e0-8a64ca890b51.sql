-- Criar tabela de tags
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#8B5CF6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de relacionamento entre mensagens e tags
CREATE TABLE public.message_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  confianca DECIMAL(3,2) DEFAULT 0.95,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, tag_id)
);

-- Criar índices
CREATE INDEX idx_message_tags_message_id ON public.message_tags(message_id);
CREATE INDEX idx_message_tags_tag_id ON public.message_tags(tag_id);

-- Habilitar RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_tags ENABLE ROW LEVEL SECURITY;

-- Políticas para tags
CREATE POLICY "Permitir leitura de tags"
ON public.tags
FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de tags"
ON public.tags
FOR INSERT
WITH CHECK (true);

-- Políticas para message_tags
CREATE POLICY "Permitir leitura de message_tags"
ON public.message_tags
FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção de message_tags"
ON public.message_tags
FOR INSERT
WITH CHECK (true);

-- Inserir tags padrão
INSERT INTO public.tags (nome, cor) VALUES
  ('Simulação', '#3B82F6'),
  ('Documentação', '#F59E0B'),
  ('Dúvida', '#8B5CF6'),
  ('Reclamação', '#EF4444'),
  ('Aprovação', '#10B981'),
  ('Urgente', '#DC2626'),
  ('Pagamento', '#059669'),
  ('Novo Lead', '#6366F1'),
  ('Follow-up', '#84CC16'),
  ('Satisfação', '#14B8A6')
ON CONFLICT (nome) DO NOTHING;

-- Habilitar realtime para tags
ALTER PUBLICATION supabase_realtime ADD TABLE public.tags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_tags;