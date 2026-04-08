
-- Move all messages from the old duplicate contact to the correct one
UPDATE public.mensagens 
SET contato_id = '578d62f2-a64b-4998-a50f-71d1b6806d4d'
WHERE contato_id = 'f066ac94-0b57-48b7-b1e0-ebea659134eb';

-- Update the correct contact with the earliest creation date and latest interaction
UPDATE public.contatos
SET 
  data_criacao = '2026-03-11 13:06:23.757151+00',
  ultima_interacao = '2026-04-08 18:27:24.238+00'
WHERE id = '578d62f2-a64b-4998-a50f-71d1b6806d4d';

-- Delete the duplicate contact
DELETE FROM public.contatos 
WHERE id = 'f066ac94-0b57-48b7-b1e0-ebea659134eb';
