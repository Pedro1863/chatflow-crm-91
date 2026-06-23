-- Reset status_funil = 'cliente' -> 'novo_lead' sempre que chegar uma mensagem de entrada
-- posterior ao último pedido do cliente. Funciona para QUALQUER inserção em public.mensagens.

CREATE OR REPLACE FUNCTION public.reset_status_funil_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_order timestamptz;
  v_status text;
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

  IF v_last_order IS NOT NULL
     AND COALESCE(NEW.created_at, now()) > v_last_order THEN
    UPDATE public.contatos
    SET status_funil = 'novo_lead',
        ultima_interacao = COALESCE(NEW.created_at, now())
    WHERE telefone = NEW.telefone
      AND status_funil = 'cliente';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_status_funil_on_new_message ON public.mensagens;
CREATE TRIGGER trg_reset_status_funil_on_new_message
AFTER INSERT ON public.mensagens
FOR EACH ROW
EXECUTE FUNCTION public.reset_status_funil_on_new_message();

-- Backfill: corrige contatos que JÁ estão como 'cliente' mas têm interação após o último pedido
UPDATE public.contatos c
SET status_funil = 'novo_lead'
FROM public.customers cu
WHERE c.telefone = cu.telefone
  AND c.status_funil = 'cliente'
  AND cu.data_ultimo_pedido IS NOT NULL
  AND c.ultima_interacao IS NOT NULL
  AND c.ultima_interacao > cu.data_ultimo_pedido;