DROP TABLE IF EXISTS public.template_sends;

CREATE TABLE public.template_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  telefone text NOT NULL,
  sent_date date NOT NULL DEFAULT current_date,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, template_name, sent_date)
);

ALTER TABLE public.template_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to template_sends"
  ON public.template_sends
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);