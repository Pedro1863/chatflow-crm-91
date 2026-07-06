CREATE TABLE public.n8n_processed_messages (
  mensagem_id uuid PRIMARY KEY,
  template_name text,
  telefone text,
  processed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.n8n_processed_messages TO authenticated;
GRANT ALL ON public.n8n_processed_messages TO service_role;
GRANT SELECT, INSERT ON public.n8n_processed_messages TO anon;

ALTER TABLE public.n8n_processed_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "n8n idempotency open access"
  ON public.n8n_processed_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_n8n_processed_at ON public.n8n_processed_messages(processed_at DESC);