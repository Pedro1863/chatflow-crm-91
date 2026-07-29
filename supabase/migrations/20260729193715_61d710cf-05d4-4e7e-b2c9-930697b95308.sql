GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_settings TO anon, authenticated;
GRANT ALL ON public.automation_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO anon, authenticated;
GRANT ALL ON public.contacts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contatos TO anon, authenticated;
GRANT ALL ON public.contatos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO anon, authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_zone_tracking TO anon, authenticated;
GRANT ALL ON public.customer_zone_tracking TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads_pipeline TO anon, authenticated;
GRANT ALL ON public.leads_pipeline TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logs_envio_template TO anon, authenticated;
GRANT ALL ON public.logs_envio_template TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensagens TO anon, authenticated;
GRANT ALL ON public.mensagens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.n8n_processed_messages TO anon, authenticated;
GRANT ALL ON public.n8n_processed_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_events TO anon, authenticated;
GRANT ALL ON public.sales_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO anon, authenticated;
GRANT ALL ON public.system_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_sends TO anon, authenticated;
GRANT ALL ON public.template_sends TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_accounts TO anon, authenticated;
GRANT ALL ON public.whatsapp_accounts TO service_role;

CREATE POLICY "App can access automation settings"
ON public.automation_settings
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access contacts"
ON public.contacts
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access contatos"
ON public.contatos
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access conversations"
ON public.conversations
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access customer zone tracking"
ON public.customer_zone_tracking
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access customers"
ON public.customers
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access leads pipeline"
ON public.leads_pipeline
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access template logs"
ON public.logs_envio_template
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access mensagens"
ON public.mensagens
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access messages"
ON public.messages
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access processed messages"
ON public.n8n_processed_messages
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access orders"
ON public.orders
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access sales events"
ON public.sales_events
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access system settings"
ON public.system_settings
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access template sends"
ON public.template_sends
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "App can access whatsapp accounts"
ON public.whatsapp_accounts
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);