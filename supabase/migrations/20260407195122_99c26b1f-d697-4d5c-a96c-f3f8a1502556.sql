
-- 1. Atualizar a função de normalização para não usar "+"
CREATE OR REPLACE FUNCTION public.normalize_brazil_phone_e164(raw_phone text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
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
    RETURN cleaned;
  END IF;

  IF cleaned ~ '^\d{10,11}$' THEN
    RETURN '55' || cleaned;
  END IF;

  RETURN trimmed;
END;
$function$;

-- 2. Corrigir dados existentes - remover "+" de todos os telefones
UPDATE public.customers SET telefone = regexp_replace(telefone, '^\+', '') WHERE telefone LIKE '+%';
UPDATE public.contatos SET telefone = regexp_replace(telefone, '^\+', '') WHERE telefone LIKE '+%';
UPDATE public.leads_pipeline SET telefone = regexp_replace(telefone, '^\+', '') WHERE telefone LIKE '+%';
UPDATE public.mensagens SET telefone = regexp_replace(telefone, '^\+', '') WHERE telefone LIKE '+%';
UPDATE public.contacts SET phone = regexp_replace(phone, '^\+', '') WHERE phone LIKE '+%';
UPDATE public.template_sends SET telefone = regexp_replace(telefone, '^\+', '') WHERE telefone LIKE '+%';
UPDATE public.logs_envio_template SET telefone = regexp_replace(telefone, '^\+', '') WHERE telefone LIKE '+%';
