
CREATE OR REPLACE FUNCTION public.churn_mensal(meses_atras integer DEFAULT 6)
RETURNS TABLE (
  mes text,
  total_clientes_ativos_inicio bigint,
  total_clientes_churnados_no_mes bigint,
  taxa_churn_percentual numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  i integer;
  inicio_mes date;
  fim_mes date;
  ativos_inicio bigint;
  churnados_mes bigint;
BEGIN
  FOR i IN 0..meses_atras-1 LOOP
    inicio_mes := date_trunc('month', current_date) - (i || ' months')::interval;
    fim_mes := (inicio_mes + interval '1 month')::date;

    SELECT count(*) INTO ativos_inicio
    FROM public.customers
    WHERE data_ultimo_pedido IS NOT NULL
      AND data_ultimo_pedido >= (inicio_mes - interval '30 days')
      AND data_primeiro_contato < inicio_mes;

    SELECT count(*) INTO churnados_mes
    FROM public.customers
    WHERE data_ultimo_pedido IS NOT NULL
      AND (data_ultimo_pedido + interval '30 days') >= inicio_mes
      AND (data_ultimo_pedido + interval '30 days') < fim_mes
      AND data_primeiro_contato < inicio_mes;

    mes := to_char(inicio_mes, 'YYYY-MM');
    total_clientes_ativos_inicio := ativos_inicio;
    total_clientes_churnados_no_mes := churnados_mes;

    IF ativos_inicio > 0 THEN
      taxa_churn_percentual := round((churnados_mes::numeric / ativos_inicio::numeric) * 100, 1);
    ELSE
      taxa_churn_percentual := 0;
    END IF;

    RETURN NEXT;
  END LOOP;
END;
$$;
