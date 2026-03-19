
-- Add popup/manual save control columns to leads_pipeline
ALTER TABLE public.leads_pipeline
  ADD COLUMN IF NOT EXISTS salvo_manualmente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_exibido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popup_ciclo_data date NULL;
