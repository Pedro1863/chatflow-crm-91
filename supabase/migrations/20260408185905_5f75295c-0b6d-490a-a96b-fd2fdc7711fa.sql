
ALTER TABLE public.mensagens
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_id text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS file_name text;
