
CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text,
  waba_id text,
  phone_number_id text,
  display_phone_number text,
  business_id text,
  signup_code text,
  status text NOT NULL DEFAULT 'pending',
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to whatsapp_accounts"
ON public.whatsapp_accounts FOR ALL
USING (true) WITH CHECK (true);

INSERT INTO public.system_settings (key, value) VALUES
  ('meta_app_id', ''),
  ('meta_config_id', ''),
  ('meta_signup_webhook_url', '')
ON CONFLICT (key) DO NOTHING;
