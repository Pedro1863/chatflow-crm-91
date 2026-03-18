
CREATE OR REPLACE FUNCTION public.registrar_pedido(
  _telefone text,
  _valor_pedido numeric DEFAULT 0
)
RETURNS SETOF public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.customers
  SET
    total_pedidos = COALESCE(total_pedidos, 0) + 1,
    valor_total_comprado = COALESCE(valor_total_comprado, 0) + _valor_pedido,
    data_ultimo_pedido = now()
  WHERE telefone = _telefone;

  RETURN QUERY SELECT * FROM public.customers WHERE telefone = _telefone;
END;
$$;
