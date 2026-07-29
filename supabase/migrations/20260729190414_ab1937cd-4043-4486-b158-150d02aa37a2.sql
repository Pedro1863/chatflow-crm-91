
-- 1) Lock all public tables behind authentication
DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'automation_settings','contacts','contatos','conversations','customer_zone_tracking',
    'customers','leads_pipeline','logs_envio_template','mensagens','messages','orders',
    'sales_events','system_settings','template_sends','whatsapp_accounts','n8n_processed_messages'
  ] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "Authenticated staff full access" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- 2) Storage: whatsapp-media stays public-readable by URL, but no listing and no anonymous writes
DROP POLICY IF EXISTS "whatsapp-media public read" ON storage.objects;
DROP POLICY IF EXISTS "whatsapp-media public insert" ON storage.objects;
DROP POLICY IF EXISTS "whatsapp-media public update" ON storage.objects;
DROP POLICY IF EXISTS "whatsapp-media public delete" ON storage.objects;

CREATE POLICY "whatsapp-media authenticated read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'whatsapp-media');

CREATE POLICY "whatsapp-media authenticated insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "whatsapp-media authenticated update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'whatsapp-media')
  WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "whatsapp-media authenticated delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'whatsapp-media');

-- 3) SECURITY DEFINER functions: no anonymous execution
REVOKE ALL ON FUNCTION public.registrar_pedido(text, numeric, text, timestamptz, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_pedido(text, numeric, text, timestamptz, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.churn_mensal(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.churn_mensal(integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.metricas_aquisicao_mensal(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.metricas_aquisicao_mensal(integer) TO authenticated, service_role;

-- Trigger-only functions must never be callable through the API
REVOKE ALL ON FUNCTION public.marcar_lead_convertido_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.marcar_lead_convertido_por_telefone() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_status_funil_on_new_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_origem_tentativa_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_contacts_phone_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_contatos_phone_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_customers_phone_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_leads_pipeline_phone_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_logs_envio_template_phone_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_template_sends_phone_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.normalize_brazil_phone_e164(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.normalize_brazil_phone_e164(text) TO authenticated, service_role;
