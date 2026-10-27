-- Private bucket for record photos. Files live under {owner_id}/{record_id}/.
-- The phone resizes photos before upload, so 5 MB is a generous ceiling.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('record-photos', 'record-photos', false, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy record_photos_objects_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy record_photos_objects_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy record_photos_objects_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy record_photos_objects_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
