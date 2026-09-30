-- 2.1 Tables
create type public.report_status as enum ('unfinished', 'resumed', 'reported_finished');
create type public.flag_reason as enum ('spam', 'duplicate', 'false', 'inappropriate');

create table public.cities (
  id smallint generated always as identity primary key,
  name text not null unique,
  lat double precision not null,
  lng double precision not null
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 3 and 30),
  is_admin boolean not null default false,
  accepted_guidelines_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  city_id smallint not null references public.cities(id),
  street text not null check (char_length(street) between 2 and 120),
  description text check (char_length(description) <= 500),
  lat double precision not null,
  lng double precision not null,
  first_noticed date not null,
  status public.report_status not null default 'unfinished',
  is_verified boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.confirmations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  confirmed_on date not null default (now() at time zone 'Asia/Manila')::date,
  created_at timestamptz not null default now(),
  unique (report_id, user_id, confirmed_on)
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  updated_at timestamptz not null default now(),
  unique (report_id, user_id)
);

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reason public.flag_reason not null,
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

create index on public.reports (city_id);
create index on public.reports (status);
create index on public.confirmations (report_id);
create index on public.ratings (report_id);
create index on public.flags (report_id);
