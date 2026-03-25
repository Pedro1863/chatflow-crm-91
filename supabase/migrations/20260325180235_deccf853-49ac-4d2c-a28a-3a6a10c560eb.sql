CREATE TABLE public.logs_envio_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  telefone text NOT NULL,
  template_name text NOT NULL,
  status text NOT NULL DEFAULT 'sucesso',
  erro text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.logs_envio_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to logs_envio_template"
  ON public.logs_envio_template
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);