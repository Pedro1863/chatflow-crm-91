
-- Tabela de pedidos individuais
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  id_pedido text,
  bling_id_pedido text,
  valor numeric NOT NULL DEFAULT 0,
  data_pedido timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id_pedido)
);

-- RLS permissiva (como as demais tabelas do projeto)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to orders" ON public.orders FOR ALL TO public USING (true) WITH CHECK (true);

-- Index para consultas mensais
CREATE INDEX idx_orders_data_pedido ON public.orders (data_pedido);
CREATE INDEX idx_orders_customer_id ON public.orders (customer_id);
