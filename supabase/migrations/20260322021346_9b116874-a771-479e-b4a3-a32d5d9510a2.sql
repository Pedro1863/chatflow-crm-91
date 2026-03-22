
-- Drop all overloaded versions of registrar_pedido
DROP FUNCTION IF EXISTS public.registrar_pedido(text, numeric);
DROP FUNCTION IF EXISTS public.registrar_pedido(text, numeric, text);
DROP FUNCTION IF EXISTS public.registrar_pedido(text, numeric, text, timestamptz);

-- New unified version that inserts into orders table
CREATE OR REPLACE FUNCTION public.registrar_pedido(
  _telefone text DEFAULT NULL,
  _valor_pedido numeric DEFAULT 0,
  _bling_id text DEFAULT NULL,
  _data_pedido timestamptz DEFAULT now(),
  _id_pedido text DEFAULT NULL,
  _nome_cliente text DEFAULT NULL
)
RETURNS SETOF customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _customer_id uuid;
BEGIN
  -- Find customer by bling_id or telefone
  IF _bling_id IS NOT NULL THEN
    SELECT id INTO _customer_id FROM public.customers WHERE bling_id = _bling_id;
  END IF;
  
  IF _customer_id IS NULL AND _telefone IS NOT NULL THEN
    SELECT id INTO _customer_id FROM public.customers WHERE telefone = _telefone;
  END IF;

  -- If no customer found, create one
  IF _customer_id IS NULL THEN
    INSERT INTO public.customers (
      telefone,
      bling_id,
      nome,
      data_primeiro_contato,
      data_conversao
    ) VALUES (
      COALESCE(_telefone, 'bling_' || _bling_id),
      _bling_id,
      _nome_cliente,
      _data_pedido,
      _data_pedido
    )
    RETURNING id INTO _customer_id;
  END IF;

  -- Insert into orders (skip if id_pedido already exists)
  IF _id_pedido IS NOT NULL THEN
    INSERT INTO public.orders (customer_id, id_pedido, valor, data_pedido)
    VALUES (_customer_id, _id_pedido, _valor_pedido, _data_pedido)
    ON CONFLICT (id_pedido) DO NOTHING;
  ELSE
    INSERT INTO public.orders (customer_id, valor, data_pedido)
    VALUES (_customer_id, _valor_pedido, _data_pedido);
  END IF;

  -- Recalculate totals from orders table
  UPDATE public.customers
  SET
    total_pedidos = (SELECT count(*) FROM public.orders WHERE customer_id = _customer_id),
    valor_total_comprado = (SELECT COALESCE(sum(valor), 0) FROM public.orders WHERE customer_id = _customer_id),
    data_ultimo_pedido = (SELECT max(data_pedido) FROM public.orders WHERE customer_id = _customer_id),
    data_conversao = COALESCE(data_conversao, _data_pedido),
    nome = COALESCE(nome, _nome_cliente)
  WHERE id = _customer_id;

  RETURN QUERY SELECT * FROM public.customers WHERE id = _customer_id;
END;
$$;
