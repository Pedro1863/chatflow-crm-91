CREATE OR REPLACE FUNCTION public.normalize_brazil_phone_e164(raw_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned text;
  trimmed text;
BEGIN
  IF raw_phone IS NULL THEN
    RETURN NULL;
  END IF;

  trimmed := btrim(raw_phone);

  IF trimmed = '' THEN
    RETURN '';
  END IF;

  IF trimmed LIKE 'bling_%' THEN
    RETURN trimmed;
  END IF;

  cleaned := regexp_replace(trimmed, '\D', '', 'g');

  IF cleaned = '' THEN
    RETURN trimmed;
  END IF;

  IF cleaned ~ '^55\d{10,11}$' THEN
    RETURN '+' || cleaned;
  END IF;

  IF cleaned ~ '^\d{10,11}$' THEN
    RETURN '+55' || cleaned;
  END IF;

  RETURN trimmed;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_customers_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.telefone := public.normalize_brazil_phone_e164(NEW.telefone);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_leads_pipeline_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.telefone := public.normalize_brazil_phone_e164(NEW.telefone);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_contatos_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.telefone := public.normalize_brazil_phone_e164(NEW.telefone);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_contacts_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.phone := public.normalize_brazil_phone_e164(NEW.phone);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_template_sends_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.telefone := public.normalize_brazil_phone_e164(NEW.telefone);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_logs_envio_template_phone_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.telefone := public.normalize_brazil_phone_e164(NEW.telefone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_customers_phone_before_write ON public.customers;
CREATE TRIGGER normalize_customers_phone_before_write
BEFORE INSERT OR UPDATE OF telefone ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.normalize_customers_phone_trigger();

DROP TRIGGER IF EXISTS normalize_leads_pipeline_phone_before_write ON public.leads_pipeline;
CREATE TRIGGER normalize_leads_pipeline_phone_before_write
BEFORE INSERT OR UPDATE OF telefone ON public.leads_pipeline
FOR EACH ROW
EXECUTE FUNCTION public.normalize_leads_pipeline_phone_trigger();

DROP TRIGGER IF EXISTS normalize_contatos_phone_before_write ON public.contatos;
CREATE TRIGGER normalize_contatos_phone_before_write
BEFORE INSERT OR UPDATE OF telefone ON public.contatos
FOR EACH ROW
EXECUTE FUNCTION public.normalize_contatos_phone_trigger();

DROP TRIGGER IF EXISTS normalize_contacts_phone_before_write ON public.contacts;
CREATE TRIGGER normalize_contacts_phone_before_write
BEFORE INSERT OR UPDATE OF phone ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.normalize_contacts_phone_trigger();

DROP TRIGGER IF EXISTS normalize_template_sends_phone_before_write ON public.template_sends;
CREATE TRIGGER normalize_template_sends_phone_before_write
BEFORE INSERT OR UPDATE OF telefone ON public.template_sends
FOR EACH ROW
EXECUTE FUNCTION public.normalize_template_sends_phone_trigger();

DROP TRIGGER IF EXISTS normalize_logs_envio_template_phone_before_write ON public.logs_envio_template;
CREATE TRIGGER normalize_logs_envio_template_phone_before_write
BEFORE INSERT OR UPDATE OF telefone ON public.logs_envio_template
FOR EACH ROW
EXECUTE FUNCTION public.normalize_logs_envio_template_phone_trigger();

CREATE OR REPLACE FUNCTION public.registrar_pedido(
  _telefone text DEFAULT NULL::text,
  _valor_pedido numeric DEFAULT 0,
  _bling_id text DEFAULT NULL::text,
  _data_pedido timestamp with time zone DEFAULT now(),
  _id_pedido text DEFAULT NULL::text,
  _nome_cliente text DEFAULT NULL::text
)
RETURNS SETOF public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _customer_id uuid;
  _normalized_phone text;
BEGIN
  _normalized_phone := public.normalize_brazil_phone_e164(_telefone);

  IF _bling_id IS NOT NULL THEN
    SELECT id INTO _customer_id FROM public.customers WHERE bling_id = _bling_id;
  END IF;

  IF _customer_id IS NULL THEN
    IF _bling_id IS NULL THEN
      RAISE EXCEPTION 'bling_id (ID Contato) é obrigatório para identificar o cliente';
    END IF;

    INSERT INTO public.customers (
      telefone,
      bling_id,
      nome,
      data_primeiro_contato,
      data_conversao
    ) VALUES (
      COALESCE(_normalized_phone, 'bling_' || _bling_id),
      _bling_id,
      _nome_cliente,
      _data_pedido,
      _data_pedido
    )
    RETURNING id INTO _customer_id;
  END IF;

  IF _id_pedido IS NOT NULL THEN
    INSERT INTO public.orders (customer_id, id_pedido, valor, data_pedido)
    VALUES (_customer_id, _id_pedido, _valor_pedido, _data_pedido)
    ON CONFLICT (id_pedido) DO NOTHING;
  ELSE
    INSERT INTO public.orders (customer_id, valor, data_pedido)
    VALUES (_customer_id, _valor_pedido, _data_pedido);
  END IF;

  UPDATE public.customers
  SET
    telefone = CASE
      WHEN _normalized_phone ~ '^\+55\d{10,11}$' THEN _normalized_phone
      ELSE telefone
    END,
    total_pedidos = (SELECT count(*) FROM public.orders WHERE customer_id = _customer_id),
    valor_total_comprado = (SELECT COALESCE(sum(valor), 0) FROM public.orders WHERE customer_id = _customer_id),
    data_ultimo_pedido = (SELECT max(data_pedido) FROM public.orders WHERE customer_id = _customer_id),
    data_conversao = COALESCE(data_conversao, _data_pedido),
    nome = COALESCE(nome, _nome_cliente)
  WHERE id = _customer_id;

  RETURN QUERY SELECT * FROM public.customers WHERE id = _customer_id;
END;
$function$;