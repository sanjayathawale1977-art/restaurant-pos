-- =====================================================================
-- APPROVE LOGINS (owner / staff)
-- Run one block at a time in Supabase -> SQL Editor.
-- Replace the email in quotes with the real email, then Run.
-- =====================================================================

-- See everyone who has a login and their current role
select email, full_name, role from public.profiles order by created_at;

-- Make a person the OWNER (do this first for yourself)
-- update public.profiles set role = 'owner' where email = 'PUT-EMAIL-HERE';

-- Make a person STAFF (waiter / cashier / kitchen)
-- update public.profiles set role = 'staff' where email = 'PUT-EMAIL-HERE';

-- Stop a person from using the system (set back to pending)
-- update public.profiles set role = 'pending' where email = 'PUT-EMAIL-HERE';

-- Change the name shown in the app
-- update public.profiles set full_name = 'Ramesh' where email = 'PUT-EMAIL-HERE';
