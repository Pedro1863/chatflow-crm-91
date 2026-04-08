
INSERT INTO public.system_settings (key, value) VALUES
  ('template_msg_template_aquisicao', ''),
  ('template_msg_template_retencao_ativos', ''),
  ('template_msg_tamplate_cliente_risco', ''),
  ('template_msg_template_retencao_inativos', ''),
  ('template_msg_template_saudaveis', '')
ON CONFLICT (key) DO NOTHING;
