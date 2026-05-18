ALTER TABLE public.mensagens
  ADD COLUMN IF NOT EXISTS reply_to_wamid text,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid;

CREATE INDEX IF NOT EXISTS idx_mensagens_reply_to_wamid
  ON public.mensagens (reply_to_wamid)
  WHERE reply_to_wamid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_message_id
  ON public.mensagens (whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;