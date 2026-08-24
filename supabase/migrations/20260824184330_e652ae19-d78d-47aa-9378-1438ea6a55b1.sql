CREATE OR REPLACE FUNCTION public.reset_status_funil_on_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_order timestamptz;
  v_status text;
  v_msg_at timestamptz;
BEGIN
  IF NEW.direcao IS DISTINCT FROM 'entrada' OR NEW.telefone IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status_funil INTO v_status
  FROM public.contatos
  WHERE telefone = NEW.telefone
  ORDER BY ultima_interacao DESC NULLS LAST
  LIMIT 1;

  IF v_status IS DISTINCT FROM 'cliente' THEN
    RETURN NEW;
  END IF;

  SELECT max(data_ultimo_pedido) INTO v_last_order
  FROM public.customers
  WHERE telefone = NEW.telefone;

  v_msg_at := COALESCE(NEW.created_at, now());

  IF v_last_order IS NOT NULL
     AND v_msg_at > v_last_order
     -- carência: mensagens no mesmo dia (America/Sao_Paulo) da venda não reiniciam o funil
     AND (v_msg_at AT TIME ZONE 'America/Sao_Paulo')::date
         > (v_last_order AT TIME ZONE 'America/Sao_Paulo')::date
  THEN
    UPDATE public.contatos
    SET status_funil = 'novo_lead',
        ultima_interacao = v_msg_at
    WHERE telefone = NEW.telefone
      AND status_funil = 'cliente';
  END IF;

  RETURN NEW;
END;
$function$;