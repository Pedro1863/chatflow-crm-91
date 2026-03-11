
-- Tabela customers (clientes convertidos)
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  telefone text NOT NULL,
  data_primeiro_contato timestamp with time zone DEFAULT now(),
  data_conversao timestamp with time zone,
  total_pedidos integer DEFAULT 0,
  valor_total_comprado numeric DEFAULT 0,
  data_ultimo_pedido timestamp with time zone,
  origem_lead text,
  status_cliente text DEFAULT 'ativo'
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to customers" ON public.customers
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela leads_pipeline (leads não convertidos)
CREATE TABLE public.leads_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  telefone text NOT NULL,
  data_entrada timestamp with time zone DEFAULT now(),
  etapa_pipeline text DEFAULT 'primeiro_contato_sem_resposta',
  motivo_perda text,
  data_ultima_interacao timestamp with time zone,
  status text DEFAULT 'ativo'
);

ALTER TABLE public.leads_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to leads_pipeline" ON public.leads_pipeline
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads_pipeline;
