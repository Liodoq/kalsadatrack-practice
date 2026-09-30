-- Phase 3: server-side rules. Errors raised here reach the app as HTTP 400.

-- Reports: reject future dates and locations outside NCR; non-admins cannot pre-set status/verified/hidden.
create or replace function public.validate_report()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.first_noticed > (now() at time zone 'Asia/Manila')::date then
    raise exception 'Date first noticed cannot be in the future.';
  end if;
  if new.lat not between 14.33 and 14.80 or new.lng not between 120.90 and 121.14 then
    raise exception 'Location must be inside Metro Manila (NCR).';
  end if;
  if tg_op = 'INSERT' and not public.is_admin() then
    new.status := 'unfinished';
    new.is_verified := false;
    new.is_hidden := false;
    new.created_at := now();
  end if;
  return new;
end;
$$;

create trigger reports_validate
  before insert or update of lat, lng, first_noticed on public.reports
  for each row execute function public.validate_report();

-- Confirmations: you cannot confirm your own report.
create or replace function public.check_confirmation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from reports where id = new.report_id and user_id = new.user_id) then
    raise exception 'You cannot confirm your own report.';
  end if;
  return new;
end;
$$;

create trigger confirmations_check
  before insert on public.confirmations
  for each row execute function public.check_confirmation();

-- Verification: 3 different people confirming marks the report Verified.
create or replace function public.apply_verification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update reports set is_verified = true
  where id = new.report_id
    and not is_verified
    and (select count(distinct user_id) from confirmations where report_id = new.report_id) >= 3;
  return null;
end;
$$;

create trigger confirmations_verify
  after insert on public.confirmations
  for each row execute function public.apply_verification();

-- Ratings: keep updated_at current when a rating is edited.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger ratings_touch
  before update on public.ratings
  for each row execute function public.touch_updated_at();

-- Photos: max 3 per report, and the file must be in the uploader's own folder.
create or replace function public.check_report_photo()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from report_photos where report_id = new.report_id) >= 3 then
    raise exception 'A report can have at most 3 photos.';
  end if;
  if split_part(new.storage_path, '/', 1) <> coalesce(auth.uid()::text, '') and not public.is_admin() then
    raise exception 'Photo path must be inside your own folder.';
  end if;
  return new;
end;
$$;

create trigger report_photos_check
  before insert on public.report_photos
  for each row execute function public.check_report_photo();

-- Admins can dismiss flags after reviewing a report.
create policy "flags_admin_delete" on public.flags
  for delete to authenticated using (public.is_admin());
