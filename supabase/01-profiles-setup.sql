-- =====================================================================
-- STEP 1 of 2 : USER ACCOUNTS AND ROLES
-- Run this in Supabase -> SQL Editor -> New query -> paste -> Run.
-- It is SAFE to run while the app is live: it does not lock or change
-- your orders or inventory. (It also adds the safe "door" that the
-- customer QR page uses to place orders.)
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

-- 6. CUSTOMER QR ORDERS: customers are not logged in, so they get ONE
--    safe door: this function. It can only add items to the running bill
--    of a table (or start a new bill). It cannot read or change anything else.
create or replace function public.place_customer_order(p_table text, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   public.orders%rowtype;
  v_exists  boolean;
  v_item    jsonb;
  v_old     jsonb := '[]'::jsonb;
  v_new     jsonb := '[]'::jsonb;
  v_round   integer := 1;
  v_name    text;
  v_qty     integer;
  v_price   numeric;
  v_sub     numeric;
  v_total   numeric;
begin
  if p_table is null or p_table !~ '^T-[0-9]{1,3}$' then
    raise exception 'Invalid table';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 50 then
    raise exception 'Invalid order';
  end if;

  -- the table's running (not yet settled) bill, if there is one
  select * into v_order
  from public.orders
  where table_number = p_table
    and status not in ('Completed', 'Cancelled')
  order by created_at desc
  limit 1
  for update;
  v_exists := found;

  if v_exists then
    v_old := coalesce(v_order.items::text, '[]')::jsonb;
    select coalesce(max(coalesce((e ->> 'round')::integer, 1)), 1) + 1
      into v_round
    from jsonb_array_elements(v_old) e;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_name  := left(trim(coalesce(v_item ->> 'name', '')), 80);
    v_qty   := (v_item ->> 'quantity')::integer;
    v_price := (v_item ->> 'price')::numeric;

    if v_name = '' or v_qty is null or v_qty < 1 or v_qty > 50
       or v_price is null or v_price <= 0 or v_price > 10000 then
      raise exception 'Invalid item';
    end if;

    v_new := v_new || jsonb_build_object(
      'name', v_name, 'quantity', v_qty, 'price', v_price, 'round', v_round
    );
  end loop;

  select coalesce(sum((e ->> 'quantity')::numeric * (e ->> 'price')::numeric), 0)
    into v_sub
  from jsonb_array_elements(v_old || v_new) e;

  v_total := round(v_sub * 1.05);   -- 5% GST, same as the app

  if v_exists then
    update public.orders
       set items = v_old || v_new,
           total_amount = v_total,
           status = 'Pending'
     where id = v_order.id;
  else
    insert into public.orders (table_number, items, status, total_amount, payment_mode)
    values (p_table, v_new, 'Pending', v_total, 'Pending');
  end if;

  return v_round;
end;
$$;

revoke all on function public.place_customer_order(text, jsonb) from public;
grant execute on function public.place_customer_order(text, jsonb) to anon, authenticated;
