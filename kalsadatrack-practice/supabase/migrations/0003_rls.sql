-- 2.3 Row Level Security
create or replace function public.is_admin()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

alter table public.cities enable row level security;
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.report_photos enable row level security;
alter table public.confirmations enable row level security;
alter table public.ratings enable row level security;
alter table public.flags enable row level security;

create policy "cities_read" on public.cities
  for select to anon, authenticated using (true);

create policy "profiles_read" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (display_name, accepted_guidelines_at) on public.profiles to authenticated;

create policy "reports_read" on public.reports
  for select to anon, authenticated
  using (not is_hidden or user_id = auth.uid() or public.is_admin());
create policy "reports_insert_own" on public.reports
  for insert to authenticated with check (user_id = auth.uid());
create policy "reports_admin_update" on public.reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "reports_admin_delete" on public.reports
  for delete to authenticated using (public.is_admin());

create policy "photos_read" on public.report_photos
  for select to anon, authenticated
  using (exists (select 1 from public.reports r where r.id = report_id));
create policy "photos_insert_own" on public.report_photos
  for insert to authenticated
  with check (exists (select 1 from public.reports r where r.id = report_id and r.user_id = auth.uid()));
create policy "photos_admin_delete" on public.report_photos
  for delete to authenticated using (public.is_admin());

create policy "confirmations_read" on public.confirmations
  for select to anon, authenticated using (true);
create policy "confirmations_insert_own" on public.confirmations
  for insert to authenticated with check (user_id = auth.uid());

create policy "ratings_read" on public.ratings
  for select to anon, authenticated using (true);
create policy "ratings_insert_own" on public.ratings
  for insert to authenticated with check (user_id = auth.uid());
create policy "ratings_update_own" on public.ratings
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "flags_insert_own" on public.flags
  for insert to authenticated with check (user_id = auth.uid());
create policy "flags_admin_read" on public.flags
  for select to authenticated using (public.is_admin());
