
insert into storage.buckets (id, name, public)
values ('whatsapp-media', 'whatsapp-media', true)
on conflict (id) do update set public = true;

create policy "whatsapp-media public read"
on storage.objects for select
using (bucket_id = 'whatsapp-media');

create policy "whatsapp-media public insert"
on storage.objects for insert
with check (bucket_id = 'whatsapp-media');

create policy "whatsapp-media public update"
on storage.objects for update
using (bucket_id = 'whatsapp-media');

create policy "whatsapp-media public delete"
on storage.objects for delete
using (bucket_id = 'whatsapp-media');
