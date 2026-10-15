-- =====================================================================
-- STEP 1 of 2 : USER ACCOUNTS AND ROLES
-- Run this in Supabase -> SQL Editor -> New query -> paste -> Run.
-- It is SAFE to run while the app is live: it does not touch orders
-- or inventory.
-- =====================================================================

-- 1. One row per login, holding the role: owner, staff or pending
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'pending'
             check (role in ('owner', 'staff', 'pending')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2. Helper: what is the role of the person who is logged in?
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke all on function public.app_role() from public, anon;
grant execute on function public.app_role() to authenticated;

-- 3. Who can see / change profiles
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "owner reads all profiles" on public.profiles;
create policy "owner reads all profiles" on public.profiles
  for select to authenticated
  using (public.app_role() = 'owner');

drop policy if exists "owner updates profiles" on public.profiles;
create policy "owner updates profiles" on public.profiles
  for update to authenticated
  using (public.app_role() = 'owner')
  with check (public.app_role() = 'owner');

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

-- 4. Every new login automatically gets a profile with role 'pending'.
--    Nobody can use the system until the owner changes 'pending' to
--    'staff' or 'owner'. (This keeps strangers out even if sign-ups
--    are accidentally left open.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Logins that already exist get a profile too (as 'pending')
insert into public.profiles (id, email, full_name, role)
select id, email, split_part(email, '@', 1), 'pending'
from auth.users
on conflict (id) do nothing;
