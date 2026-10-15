-- =====================================================================
-- STEP 2 of 2 : LOCK THE DATABASE
-- Run this ONLY AFTER:
--   (a) the new login version of the app is live, and
--   (b) you have signed in successfully as the OWNER.
-- After this, strangers can no longer read or change your orders,
-- and staff can no longer see inventory.
-- =====================================================================

-- 1. Remove EVERY old rule on these tables. (Old "allow all" rules
--    would otherwise keep the data open to everyone.)
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('orders', 'inventory_items')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.orders          enable row level security;
alter table public.inventory_items enable row level security;

-- Nobody who is not logged in can touch these tables directly
revoke all on public.orders          from anon;
revoke all on public.inventory_items from anon;

-- 2. ORDERS: owner and staff can read, create and update. Only owner can delete.
create policy "staff read orders" on public.orders
  for select to authenticated
  using (public.app_role() in ('owner', 'staff'));

create policy "staff create orders" on public.orders
  for insert to authenticated
  with check (public.app_role() in ('owner', 'staff'));

create policy "staff update orders" on public.orders
  for update to authenticated
  using (public.app_role() in ('owner', 'staff'))
  with check (public.app_role() in ('owner', 'staff'));

create policy "owner delete orders" on public.orders
  for delete to authenticated
  using (public.app_role() = 'owner');

-- 3. INVENTORY: owner only
create policy "owner manages inventory" on public.inventory_items
  for all to authenticated
  using (public.app_role() = 'owner')
  with check (public.app_role() = 'owner');
