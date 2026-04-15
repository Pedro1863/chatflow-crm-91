
CREATE OR REPLACE FUNCTION public.marcar_lead_convertido_por_telefone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.data_ultimo_pedido IS DISTINCT FROM OLD.data_ultimo_pedido THEN
    UPDATE public.leads_pipeline
    SET convertido = true,
        popup_exibido = true,
        popup_ciclo_data = CURRENT_DATE
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
$function$;

CREATE OR REPLACE FUNCTION public.marcar_lead_convertido_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.leads_pipeline
  SET convertido = true,
      popup_exibido = true,
      popup_ciclo_data = CURRENT_DATE
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
$function$;
