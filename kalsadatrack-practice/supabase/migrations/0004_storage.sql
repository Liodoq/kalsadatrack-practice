-- 2.4 Photo storage bucket (5 MB, JPEG/PNG/WebP)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy "photos_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos_admin_delete_files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'report-photos' and public.is_admin());
