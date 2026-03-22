
CREATE OR REPLACE FUNCTION public.metricas_aquisicao_mensal(meses_atras integer DEFAULT 6)
RETURNS TABLE(mes text, novos_clientes bigint, receita_novos numeric, receita_recorrentes numeric)
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

    -- Novos clientes: baseado em data_conversao
    SELECT count(*) INTO novos_clientes
    FROM public.customers
    WHERE data_conversao >= inicio_mes AND data_conversao < fim_mes;

    -- Receita de novos: pedidos do mês de clientes cuja data_conversao é neste mês
    SELECT COALESCE(sum(o.valor), 0) INTO receita_novos
    FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    WHERE o.data_pedido >= inicio_mes AND o.data_pedido < fim_mes
      AND c.data_conversao >= inicio_mes AND c.data_conversao < fim_mes;

    -- Receita de recorrentes: pedidos do mês de clientes cuja data_conversao é anterior
    SELECT COALESCE(sum(o.valor), 0) INTO receita_recorrentes
    FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    WHERE o.data_pedido >= inicio_mes AND o.data_pedido < fim_mes
      AND c.data_conversao < inicio_mes;

    RETURN NEXT;
  END LOOP;
END;
$$;
