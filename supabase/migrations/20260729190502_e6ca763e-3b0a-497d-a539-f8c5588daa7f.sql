
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own roles" ON public.user_roles;
CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_crm_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'staff')
  )
$$;

REVOKE ALL ON FUNCTION public.is_crm_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_crm_staff(uuid) TO authenticated, service_role;

-- First user becomes admin, everyone else is a plain user with no CRM access
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_default_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- Replace the permissive authenticated policies with role-scoped ones
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'automation_settings','contacts','contatos','conversations','customer_zone_tracking',
    'customers','leads_pipeline','logs_envio_template','mensagens','messages','orders',
    'sales_events','system_settings','template_sends','whatsapp_accounts','n8n_processed_messages'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated staff full access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "CRM staff full access" ON public.%I FOR ALL TO authenticated
         USING (public.is_crm_staff(auth.uid()))
         WITH CHECK (public.is_crm_staff(auth.uid()))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "whatsapp-media authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "whatsapp-media authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "whatsapp-media authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "whatsapp-media authenticated delete" ON storage.objects;

CREATE POLICY "whatsapp-media staff read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'whatsapp-media' AND public.is_crm_staff(auth.uid()));

CREATE POLICY "whatsapp-media staff insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whatsapp-media' AND public.is_crm_staff(auth.uid()));

CREATE POLICY "whatsapp-media staff update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'whatsapp-media' AND public.is_crm_staff(auth.uid()))
  WITH CHECK (bucket_id = 'whatsapp-media' AND public.is_crm_staff(auth.uid()));

CREATE POLICY "whatsapp-media staff delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'whatsapp-media' AND public.is_crm_staff(auth.uid()));
