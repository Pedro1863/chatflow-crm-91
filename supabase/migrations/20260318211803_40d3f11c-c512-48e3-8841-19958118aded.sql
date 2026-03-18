
CREATE OR REPLACE FUNCTION public.metricas_aquisicao_mensal(meses_atras integer DEFAULT 6)
RETURNS TABLE(
  mes text,
  novos_clientes bigint,
  receita_novos numeric,
  receita_recorrentes numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  i integer;
  inicio_mes date;
  fim_mes date;
BEGIN
  FOR i IN 0..meses_atras-1 LOOP
    inicio_mes := date_trunc('month', current_date) - (i || ' months')::interval;
    fim_mes := (inicio_mes + interval '1 month')::date;

    mes := to_char(inicio_mes, 'YYYY-MM');

    SELECT count(*) INTO novos_clientes
    FROM public.customers
    WHERE data_conversao >= inicio_mes AND data_conversao < fim_mes;

    SELECT COALESCE(sum(valor_total_comprado), 0) INTO receita_novos
    FROM public.customers
    WHERE data_conversao >= inicio_mes AND data_conversao < fim_mes
      AND total_pedidos <= 1;

    SELECT COALESCE(sum(valor_total_comprado), 0) INTO receita_recorrentes
    FROM public.customers
    WHERE total_pedidos > 1
      AND data_ultimo_pedido >= inicio_mes AND data_ultimo_pedido < fim_mes;

    RETURN NEXT;
  END LOOP;
END;
$$;
