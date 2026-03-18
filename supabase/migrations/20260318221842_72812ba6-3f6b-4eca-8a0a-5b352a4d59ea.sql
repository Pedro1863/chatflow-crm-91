
-- Add new columns to leads_pipeline for attempt tracking
ALTER TABLE public.leads_pipeline
  ADD COLUMN IF NOT EXISTS convertido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_interacao timestamptz DEFAULT now();

-- Function: when registrar_pedido updates a customer, mark most recent unconverted lead as converted
CREATE OR REPLACE FUNCTION public.marcar_lead_convertido_por_telefone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when data_ultimo_pedido changes (new order registered)
  IF NEW.data_ultimo_pedido IS DISTINCT FROM OLD.data_ultimo_pedido THEN
    UPDATE public.leads_pipeline
    SET convertido = true
    WHERE telefone = NEW.telefone
      AND convertido = false
      AND id = (
        SELECT id FROM public.leads_pipeline
        WHERE telefone = NEW.telefone AND convertido = false
        ORDER BY data_interacao DESC NULLS LAST
        LIMIT 1
      );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on customers table
DROP TRIGGER IF EXISTS trg_marcar_lead_convertido ON public.customers;
CREATE TRIGGER trg_marcar_lead_convertido
  AFTER UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.marcar_lead_convertido_por_telefone();

-- Also handle INSERT (first order creates customer)
CREATE OR REPLACE FUNCTION public.marcar_lead_convertido_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.leads_pipeline
  SET convertido = true
  WHERE telefone = NEW.telefone
    AND convertido = false
    AND id = (
      SELECT id FROM public.leads_pipeline
      WHERE telefone = NEW.telefone AND convertido = false
      ORDER BY data_interacao DESC NULLS LAST
      LIMIT 1
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_marcar_lead_convertido_insert ON public.customers;
CREATE TRIGGER trg_marcar_lead_convertido_insert
  AFTER INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.marcar_lead_convertido_insert();
