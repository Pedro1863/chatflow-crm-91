DROP TRIGGER IF EXISTS reset_status_funil_on_new_message_trigger ON public.mensagens;

CREATE TRIGGER reset_status_funil_on_new_message_trigger
AFTER INSERT ON public.mensagens
FOR EACH ROW
EXECUTE FUNCTION public.reset_status_funil_on_new_message();