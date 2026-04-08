
CREATE OR REPLACE FUNCTION public.normalize_brazil_phone_e164(raw_phone text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  cleaned text;
  trimmed text;
  ddd text;
  local_number text;
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

  -- Already correct: 55 + DDD(2) + 9 digits = 13 digits
  IF cleaned ~ '^55\d{11}$' THEN
    RETURN cleaned;
  END IF;

  -- 55 + DDD(2) + 8 digits: mobile missing the leading 9
  IF cleaned ~ '^55\d{10}$' THEN
    ddd := substring(cleaned from 3 for 2);
    local_number := substring(cleaned from 5);
    IF local_number ~ '^[6-9]' THEN
      RETURN '55' || ddd || '9' || local_number;
    END IF;
    RETURN cleaned;
  END IF;

  -- Local: 11 digits (DDD + 9 + 8)
  IF cleaned ~ '^\d{11}$' THEN
    RETURN '55' || cleaned;
  END IF;

  -- Local: 10 digits (DDD + 8), add 9 for mobiles
  IF cleaned ~ '^\d{10}$' THEN
    ddd := substring(cleaned from 1 for 2);
    local_number := substring(cleaned from 3);
    IF local_number ~ '^[6-9]' THEN
      RETURN '55' || ddd || '9' || local_number;
    END IF;
    RETURN '55' || cleaned;
  END IF;

  RETURN trimmed;
END;
$function$;
