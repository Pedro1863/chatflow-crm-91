
-- Table to track customer zone transitions for automation
CREATE TABLE public.customer_zone_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  current_zone text NOT NULL DEFAULT 'inativo',
  zone_entered_at timestamptz NOT NULL DEFAULT now(),
  template_sent boolean NOT NULL DEFAULT false,
  template_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);

-- Table to store automation ON/OFF settings per zone
CREATE TABLE public.automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Insert default settings for each zone
INSERT INTO public.automation_settings (zone, enabled) VALUES
  ('saudavel', false),
  ('em_risco', false),
  ('inativo', false);

-- Enable RLS
ALTER TABLE public.customer_zone_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all access to customer_zone_tracking" ON public.customer_zone_tracking FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to automation_settings" ON public.automation_settings FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for automation_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_settings;
