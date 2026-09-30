-- Phase 10: demo data (18 reports). Run AFTER 0009. Owned by the admin account.
-- Run the WHOLE file with nothing highlighted.

do $$
begin
  if not exists (select 1 from public.profiles where is_admin) then
    raise exception 'Run 0009_make_admin.sql first.';
  end if;
  if exists (select 1 from public.reports where street = 'Commonwealth Ave near Batasan Rd') then
    raise exception 'Demo data is already loaded.';
  end if;
end $$;

-- Pause the insert trigger (it forces status = unfinished) so demo rows keep their statuses.
alter table public.reports disable trigger reports_validate;

with v (city, street, description, lat, lng, days_ago, status, verified, score) as (
  values
  ('Quezon City', 'Commonwealth Ave near Batasan Rd', 'Outer lane excavated with barriers. No visible activity during rush hour.', 14.6880, 121.0870, 214, 'unfinished', true, 5),
  ('Quezon City', 'Katipunan Ave southbound', 'Pipe trench covered with steel plates. Plates shift when vehicles pass.', 14.6365, 121.0745, 96, 'unfinished', true, 4),
  ('Quezon City', 'Quezon Ave near Roosevelt Ave', 'Sidewalk dug up for about 30 m. Pedestrians walk on the road.', 14.6440, 121.0200, 41, 'resumed', false, 3),
  ('Manila', 'Taft Ave near Vito Cruz', 'One lane closed with concrete barriers. Workers seen on some days.', 14.5635, 120.9945, 158, 'resumed', true, 4),
  ('Manila', 'España Blvd near Lacson Ave', 'Road patch left unpaved, gravel on the surface.', 14.6090, 120.9890, 63, 'unfinished', false, 3),
  ('Makati', 'J.P. Rizal Ave', 'Drainage work with open section behind barriers.', 14.5680, 121.0300, 120, 'unfinished', true, 4),
  ('Makati', 'Chino Roces Ave', 'Lane re-blocking area fenced off; concrete poured, not reopened.', 14.5470, 121.0160, 22, 'reported_finished', false, 2),
  ('Pasig', 'C. Raymundo Ave', 'Excavation at the intersection; traffic narrowed to one lane.', 14.5790, 121.0830, 301, 'unfinished', true, 5),
  ('Pasig', 'Shaw Blvd eastbound', 'Manhole work with cones. Cones left overnight.', 14.5790, 121.0620, 34, 'unfinished', false, 3),
  ('Taguig', 'C-5 Road service lane', 'Service lane blocked by stockpiled materials.', 14.5390, 121.0690, 77, 'resumed', false, 3),
  ('Mandaluyong', 'Boni Ave', 'Road surface removed for about 50 m, uneven asphalt edge.', 14.5740, 121.0330, 188, 'unfinished', true, 4),
  ('San Juan', 'N. Domingo St', 'Water line trench with temporary patch, bumpy surface.', 14.6040, 121.0310, 15, 'unfinished', false, 2),
  ('Marikina', 'Sumulong Hwy', 'Slope protection work, one lane coned off.', 14.6300, 121.1000, 132, 'unfinished', false, 3),
  ('Caloocan', 'Rizal Ave Ext near Monumento', 'Excavated area near the curb, barriers partly fallen.', 14.6560, 120.9840, 245, 'unfinished', true, 5),
  ('Valenzuela', 'MacArthur Hwy, Malinta', 'Drainage upgrade; open canal section beside the lane.', 14.7000, 120.9600, 57, 'resumed', false, 4),
  ('Parañaque', 'Dr. A. Santos Ave (Sucat Rd)', 'Road widening; lane shifts marked with cones.', 14.4830, 121.0130, 402, 'unfinished', true, 5),
  ('Las Piñas', 'Alabang–Zapote Rd', 'Asphalt overlay started, section left unfinished.', 14.4460, 120.9930, 88, 'unfinished', false, 3),
  ('Muntinlupa', 'National Rd, Putatan', 'Utility pole relocation; holes near the shoulder.', 14.3980, 121.0360, 29, 'reported_finished', false, 2)
),
owner as (
  select id from public.profiles where is_admin order by created_at limit 1
),
ins as (
  insert into public.reports (user_id, city_id, street, description, lat, lng, first_noticed, status, is_verified)
  select (select id from owner), c.id, v.street, v.description, v.lat, v.lng,
         current_date - v.days_ago, v.status::public.report_status, v.verified
  from v join public.cities c on c.name = v.city
  returning id, user_id, street
),
rt as (
  insert into public.ratings (report_id, user_id, score)
  select ins.id, ins.user_id, v.score::smallint from ins join v on v.street = ins.street
)
-- Two flags so the admin page has something to show.
insert into public.flags (report_id, user_id, reason)
select ins.id, ins.user_id, 'duplicate'::public.flag_reason from ins where ins.street = 'Shaw Blvd eastbound'
union all
select ins.id, ins.user_id, 'false'::public.flag_reason from ins where ins.street = 'Chino Roces Ave';

alter table public.reports enable trigger reports_validate;

select count(*) as demo_reports from public.reports;
