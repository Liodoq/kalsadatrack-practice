-- Phase 5/8/9: read-only views. security_invoker = true means each view obeys the caller's RLS.

-- One row per report with everything the map and details page need.
create or replace view public.report_summaries
with (security_invoker = true) as
select
  r.id, r.user_id, r.city_id, c.name as city_name, p.display_name as reporter_name,
  r.street, r.description, r.lat, r.lng, r.first_noticed, r.status,
  r.is_verified, r.is_hidden, r.created_at,
  (select count(*) from public.confirmations x where x.report_id = r.id)::int as confirmation_count,
  (select count(distinct x.user_id) from public.confirmations x where x.report_id = r.id)::int as confirmer_count,
  (select round(avg(t.score), 1) from public.ratings t where t.report_id = r.id)::float8 as avg_rating,
  (select count(*) from public.ratings t where t.report_id = r.id)::int as rating_count,
  (select ph.storage_path from public.report_photos ph where ph.report_id = r.id order by ph.created_at limit 1) as cover_path
from public.reports r
join public.cities c on c.id = r.city_id
join public.profiles p on p.id = r.user_id;

-- City rankings: active (not reported finished) reports and average inconvenience.
create or replace view public.city_rankings
with (security_invoker = true) as
select
  c.id, c.name,
  count(r.id) filter (where r.status <> 'reported_finished')::int as active_count,
  count(r.id) filter (where r.status <> 'reported_finished' and r.is_verified)::int as verified_count,
  count(r.id)::int as total_count,
  (select round(avg(t.score), 2)
     from public.ratings t join public.reports r2 on r2.id = t.report_id
    where r2.city_id = c.id and not r2.is_hidden and r2.status <> 'reported_finished')::float8 as avg_inconvenience
from public.cities c
left join public.reports r on r.city_id = c.id and not r.is_hidden
group by c.id, c.name;

-- Flagged reports for the admin page (flags are admin-only, so others get no rows).
create or replace view public.flagged_reports
with (security_invoker = true) as
select
  r.id, r.street, c.name as city_name, r.status, r.is_hidden, r.is_verified, r.created_at,
  count(f.id)::int as flag_count,
  array_agg(distinct f.reason) as reasons,
  max(f.created_at) as last_flagged_at
from public.flags f
join public.reports r on r.id = f.report_id
join public.cities c on c.id = r.city_id
group by r.id, c.name;

grant select on public.report_summaries, public.city_rankings, public.flagged_reports to anon, authenticated;
