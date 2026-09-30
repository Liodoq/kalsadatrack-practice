-- 2.6 Verify: run after 0001-0005. Every row should say ok = true.
select 'tables with RLS = 7' as check, (select count(*) from pg_tables where schemaname = 'public' and rowsecurity) = 7 as ok
union all select 'cities = 17', (select count(*) from public.cities) = 17
union all select 'report-photos bucket', exists (select 1 from storage.buckets where id = 'report-photos' and public)
union all select 'signup trigger', exists (select 1 from pg_trigger where tgname = 'on_auth_user_created');
