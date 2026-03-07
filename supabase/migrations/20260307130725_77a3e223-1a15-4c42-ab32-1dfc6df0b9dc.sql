
-- Tabela contatos (nova estrutura simplificada)
CREATE TABLE public.contatos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text,
  telefone text NOT NULL,
  empresa text,
  cidade text,
  status_funil text NOT NULL DEFAULT 'novo_lead',
  origem text,
  ultima_interacao timestamp with time zone,
  data_criacao timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS para contatos
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to contatos" ON public.contatos FOR ALL USING (true) WITH CHECK (true);

-- Tabela mensagens (nova estrutura simplificada)
CREATE TABLE public.mensagens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contato_id uuid NOT NULL REFERENCES public.contatos(id) ON DELETE CASCADE,
  telefone text,
  mensagem text NOT NULL,
  direcao text NOT NULL DEFAULT 'entrada',
  vendedor text,
  timestamp timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS para mensagens
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to mensagens" ON public.mensagens FOR ALL USING (true) WITH CHECK (true);
