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

-- 4. CUSTOMER QR ORDERS: customers are not logged in, so they get ONE
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
