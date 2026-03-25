
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to system_settings"
  ON public.system_settings FOR ALL TO public
  USING (true) WITH CHECK (true);

INSERT INTO public.system_settings (key, value) VALUES ('n8n_webhook_url', '')
ON CONFLICT (key) DO NOTHING;
