CREATE OR REPLACE FUNCTION public.churn_mensal(meses_atras integer DEFAULT 6)
RETURNS TABLE(
  mes text,
  total_clientes_ativos_inicio bigint,
  total_clientes_churnados_no_mes bigint,
  taxa_churn_percentual numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  i integer;
  inicio_mes timestamptz;
  fim_mes timestamptz;
  v_ativos_inicio bigint;
  v_churnados_mes bigint;
BEGIN
  FOR i IN 0..meses_atras-1 LOOP
    inicio_mes := date_trunc('month', current_date) - make_interval(months => i);
    fim_mes := inicio_mes + interval '1 month';

    WITH ativos_inicio AS (
      SELECT
        o.customer_id,
        max(o.data_pedido) AS ultimo_pedido_pre_mes
      FROM public.orders o
      WHERE o.data_pedido < inicio_mes
        AND o.data_pedido >= (inicio_mes - interval '30 days')
      GROUP BY o.customer_id
    ),
    sequencia AS (
      SELECT
        a.customer_id,
        a.ultimo_pedido_pre_mes AS data_referencia
      FROM ativos_inicio a

      UNION ALL

      SELECT
        o.customer_id,
        o.data_pedido AS data_referencia
      FROM public.orders o
      JOIN ativos_inicio a ON a.customer_id = o.customer_id
      WHERE o.data_pedido >= inicio_mes
        AND o.data_pedido < fim_mes
    ),
    intervalos AS (
      SELECT
        s.customer_id,
        s.data_referencia,
        lead(s.data_referencia) OVER (
          PARTITION BY s.customer_id
          ORDER BY s.data_referencia
        ) AS proximo_pedido
      FROM sequencia s
    ),
    churn_eventos AS (
      SELECT DISTINCT i2.customer_id
      FROM intervalos i2
      WHERE (i2.data_referencia + interval '30 days') >= inicio_mes
        AND (i2.data_referencia + interval '30 days') < fim_mes
        AND (i2.proximo_pedido IS NULL OR i2.proximo_pedido > (i2.data_referencia + interval '30 days'))
    )
    SELECT
      (SELECT count(*) FROM ativos_inicio),
      (SELECT count(*) FROM churn_eventos)
    INTO v_ativos_inicio, v_churnados_mes;

    mes := to_char(inicio_mes, 'YYYY-MM');
    total_clientes_ativos_inicio := v_ativos_inicio;
    total_clientes_churnados_no_mes := v_churnados_mes;

    IF v_ativos_inicio > 0 THEN
      taxa_churn_percentual := round((v_churnados_mes::numeric / v_ativos_inicio::numeric) * 100, 1);
    ELSE
      taxa_churn_percentual := 0;
    END IF;

    RETURN NEXT;
  END LOOP;
END;
$function$;