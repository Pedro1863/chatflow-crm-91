ALTER TABLE public.mensagens ADD COLUMN status text NOT NULL DEFAULT 'sent';
ALTER TABLE public.mensagens ADD COLUMN whatsapp_message_id text;