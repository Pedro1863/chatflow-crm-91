
-- Inline role checks in policies so no SECURITY DEFINER function stays API-callable
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'automation_settings','contacts','contatos','conversations','customer_zone_tracking',
    'customers','leads_pipeline','logs_envio_template','mensagens','messages','orders',
    'sales_events','system_settings','template_sends','whatsapp_accounts','n8n_processed_messages'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "CRM staff full access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "CRM staff full access" ON public.%I FOR ALL TO authenticated
         USING (EXISTS (SELECT 1 FROM public.user_roles ur
                        WHERE ur.user_id = auth.uid() AND ur.role IN (''admin'',''staff'')))
         WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur
                        WHERE ur.user_id = auth.uid() AND ur.role IN (''admin'',''staff'')))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "whatsapp-media staff read" ON storage.objects;
DROP POLICY IF EXISTS "whatsapp-media staff insert" ON storage.objects;
DROP POLICY IF EXISTS "whatsapp-media staff update" ON storage.objects;
DROP POLICY IF EXISTS "whatsapp-media staff delete" ON storage.objects;

CREATE POLICY "whatsapp-media staff read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'whatsapp-media' AND EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','staff')));

CREATE POLICY "whatsapp-media staff insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whatsapp-media' AND EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','staff')));

CREATE POLICY "whatsapp-media staff update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'whatsapp-media' AND EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','staff')))
  WITH CHECK (bucket_id = 'whatsapp-media' AND EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','staff')));

CREATE POLICY "whatsapp-media staff delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'whatsapp-media' AND EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','staff')));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_crm_staff(uuid) FROM PUBLIC, anon, authenticated;

-- Metrics functions run with the caller's own privileges
CREATE OR REPLACE FUNCTION public.churn_mensal(meses_atras integer DEFAULT 6)
 RETURNS TABLE(mes text, total_clientes_ativos_inicio bigint, total_clientes_churnados_no_mes bigint, taxa_churn_percentual numeric)
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
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
      SELECT o.customer_id, max(o.data_pedido) AS ultimo_pedido_pre_mes
      FROM public.orders o
      WHERE o.data_pedido < inicio_mes
        AND o.data_pedido >= (inicio_mes - interval '30 days')
      GROUP BY o.customer_id
    ),
    sequencia AS (
      SELECT a.customer_id, a.ultimo_pedido_pre_mes AS data_referencia FROM ativos_inicio a
      UNION ALL
      SELECT o.customer_id, o.data_pedido AS data_referencia
      FROM public.orders o
      JOIN ativos_inicio a ON a.customer_id = o.customer_id
      WHERE o.data_pedido >= inicio_mes AND o.data_pedido < fim_mes
    ),
    intervalos AS (
      SELECT s.customer_id, s.data_referencia,
        lead(s.data_referencia) OVER (PARTITION BY s.customer_id ORDER BY s.data_referencia) AS proximo_pedido
      FROM sequencia s
    ),
    churn_eventos AS (
      SELECT DISTINCT i2.customer_id
      FROM intervalos i2
      WHERE (i2.data_referencia + interval '30 days') >= inicio_mes
        AND (i2.data_referencia + interval '30 days') < fim_mes
        AND (i2.proximo_pedido IS NULL OR i2.proximo_pedido > (i2.data_referencia + interval '30 days'))
    )
    SELECT (SELECT count(*) FROM ativos_inicio), (SELECT count(*) FROM churn_eventos)
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

CREATE OR REPLACE FUNCTION public.metricas_aquisicao_mensal(meses_atras integer DEFAULT 6)
 RETURNS TABLE(mes text, novos_clientes bigint, receita_novos numeric, receita_recorrentes numeric)
 LANGUAGE plpgsql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
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

    SELECT COALESCE(sum(o.valor), 0) INTO receita_novos
    FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    WHERE o.data_pedido >= inicio_mes AND o.data_pedido < fim_mes
      AND c.data_conversao >= inicio_mes AND c.data_conversao < fim_mes;

    SELECT COALESCE(sum(o.valor), 0) INTO receita_recorrentes
    FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id
    WHERE o.data_pedido >= inicio_mes AND o.data_pedido < fim_mes
      AND c.data_conversao < inicio_mes;

    RETURN NEXT;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.churn_mensal(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.churn_mensal(integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.metricas_aquisicao_mensal(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.metricas_aquisicao_mensal(integer) TO authenticated, service_role;
