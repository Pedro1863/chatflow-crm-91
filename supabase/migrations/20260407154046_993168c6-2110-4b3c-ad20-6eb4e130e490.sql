INSERT INTO public.system_settings (key, value)
VALUES ('n8n_chat_webhook_url', '')
ON CONFLICT DO NOTHING;