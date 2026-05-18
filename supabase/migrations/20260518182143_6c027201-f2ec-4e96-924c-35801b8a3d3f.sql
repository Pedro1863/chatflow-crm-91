INSERT INTO public.system_settings (key, value)
VALUES ('n8n_media_upload_webhook_url', '')
ON CONFLICT (key) DO NOTHING;