
CREATE OR REPLACE FUNCTION public.registrar_pedido(
  _telefone text DEFAULT NULL,
  _valor_pedido numeric DEFAULT 0,
  _bling_id text DEFAULT NULL
)
RETURNS SETOF customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Try matching by bling_id first (more reliable), then by telefone
  IF _bling_id IS NOT NULL THEN
    UPDATE public.customers
    SET
      total_pedidos = COALESCE(total_pedidos, 0) + 1,
      valor_total_comprado = COALESCE(valor_total_comprado, 0) + _valor_pedido,
      data_ultimo_pedido = now()
    WHERE bling_id = _bling_id;

    RETURN QUERY SELECT * FROM public.customers WHERE bling_id = _bling_id;
  ELSIF _telefone IS NOT NULL THEN
    UPDATE public.customers
    SET
      total_pedidos = COALESCE(total_pedidos, 0) + 1,
      valor_total_comprado = COALESCE(valor_total_comprado, 0) + _valor_pedido,
      data_ultimo_pedido = now()
    WHERE telefone = _telefone;

    RETURN QUERY SELECT * FROM public.customers WHERE telefone = _telefone;
  END IF;
END;
$$;
