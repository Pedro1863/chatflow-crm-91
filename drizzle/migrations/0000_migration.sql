create or replace function public.link_template_wamid_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log record;
begin
  if new.vendedor = 'automação'
     and new.direcao = 'saida'
     and new.whatsapp_message_id is null
     and new.telefone is not null then
    select l.whatsapp_message_id, l.status
      into v_log
    from public.logs_envio_template l
    where l.telefone = new.telefone
      and l.whatsapp_message_id is not null
      and l.created_at > now() - interval '15 minutes'
      and not exists (
        select 1 from public.mensagens m
        where m.whatsapp_message_id = l.whatsapp_message_id
      )
    order by l.created_at desc
    limit 1;

    if found then
      new.whatsapp_message_id := v_log.whatsapp_message_id;
      if v_log.status in ('sent', 'delivered', 'read') then
        new.status := v_log.status;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_link_template_wamid on public.mensagens;
create trigger trg_link_template_wamid
before insert on public.mensagens
for each row execute function public.link_template_wamid_on_message_insert();