
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS bling_id text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_customers_bling_id ON public.customers (bling_id);
