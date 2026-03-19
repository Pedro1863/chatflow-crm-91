
-- Add origem_tentativa column with default 'manual'
ALTER TABLE public.leads_pipeline 
ADD COLUMN origem_tentativa text NOT NULL DEFAULT 'manual';

-- Backfill existing records based on salvo_manualmente
UPDATE public.leads_pipeline 
SET origem_tentativa = CASE 
  WHEN salvo_manualmente = true THEN 'manual'
  WHEN popup_exibido = true THEN 'popup'
  ELSE 'manual'
END;

-- Create trigger to make origem_tentativa immutable after insert
CREATE OR REPLACE FUNCTION public.prevent_origem_tentativa_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.origem_tentativa IS DISTINCT FROM NEW.origem_tentativa THEN
    NEW.origem_tentativa := OLD.origem_tentativa;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER protect_origem_tentativa
BEFORE UPDATE ON public.leads_pipeline
FOR EACH ROW
EXECUTE FUNCTION public.prevent_origem_tentativa_change();
