
ALTER TABLE public.whatsapp_accounts
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Only one default account
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_accounts_one_default
  ON public.whatsapp_accounts (is_default) WHERE is_default = true;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_accounts_phone_number_id_unique
  ON public.whatsapp_accounts (phone_number_id) WHERE phone_number_id IS NOT NULL;

ALTER TABLE public.mensagens
  ADD COLUMN IF NOT EXISTS whatsapp_account_id uuid;

ALTER TABLE public.contatos
  ADD COLUMN IF NOT EXISTS whatsapp_account_id uuid;

ALTER TABLE public.logs_envio_template
  ADD COLUMN IF NOT EXISTS whatsapp_account_id uuid;

ALTER TABLE public.template_sends
  ADD COLUMN IF NOT EXISTS whatsapp_account_id uuid;

CREATE INDEX IF NOT EXISTS idx_mensagens_account_telefone
  ON public.mensagens (whatsapp_account_id, telefone);

CREATE INDEX IF NOT EXISTS idx_contatos_account
  ON public.contatos (whatsapp_account_id);
