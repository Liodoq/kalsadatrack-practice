-- Phase 4: run AFTER signing up in the app. Replace the email with yours.
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'your-email@example.com');

select display_name, is_admin from public.profiles where is_admin;
