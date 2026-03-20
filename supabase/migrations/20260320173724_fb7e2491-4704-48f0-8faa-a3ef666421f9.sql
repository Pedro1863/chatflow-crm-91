
-- Update registrar_pedido to accept actual order date for historical imports
CREATE OR REPLACE FUNCTION public.registrar_pedido(
  _telefone text DEFAULT NULL::text,
  _valor_pedido numeric DEFAULT 0,
  _bling_id text DEFAULT NULL::text,
  _data_pedido timestamp with time zone DEFAULT now()
)
 RETURNS SETOF customers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF _bling_id IS NOT NULL THEN
    UPDATE public.customers
    SET
      total_pedidos = COALESCE(total_pedidos, 0) + 1,
      valor_total_comprado = COALESCE(valor_total_comprado, 0) + _valor_pedido,
      data_ultimo_pedido = GREATEST(COALESCE(data_ultimo_pedido, '1970-01-01'::timestamptz), _data_pedido),
      data_conversao = COALESCE(data_conversao, _data_pedido)
    WHERE bling_id = _bling_id;

    RETURN QUERY SELECT * FROM public.customers WHERE bling_id = _bling_id;
  ELSIF _telefone IS NOT NULL THEN
    UPDATE public.customers
    SET
      total_pedidos = COALESCE(total_pedidos, 0) + 1,
      valor_total_comprado = COALESCE(valor_total_comprado, 0) + _valor_pedido,
      data_ultimo_pedido = GREATEST(COALESCE(data_ultimo_pedido, '1970-01-01'::timestamptz), _data_pedido),
      data_conversao = COALESCE(data_conversao, _data_pedido)
    WHERE telefone = _telefone;

    RETURN QUERY SELECT * FROM public.customers WHERE telefone = _telefone;
  END IF;
END;
$function$;
