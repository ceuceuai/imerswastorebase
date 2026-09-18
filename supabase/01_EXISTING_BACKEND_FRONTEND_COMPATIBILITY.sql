-- ============================================================
-- iMersWAStore Base - Existing Supabase Backend Compatibility
-- Target schema snapshot: 33 public tables / existing Step 1-16 backend
-- Safe goal: additive patch only; DO NOT recreate existing core tables.
-- ============================================================

begin;

-- -----------------------------------------------------------------
-- 1) Add only frontend fields that do not yet exist in the current DB
-- -----------------------------------------------------------------
alter table public.products
  add column if not exists sku text,
  add column if not exists compare_at_price numeric default null,
  add column if not exists badge text,
  add column if not exists input_schema jsonb not null default '[]'::jsonb;

alter table public.order_items
  add column if not exists customer_inputs jsonb not null default '{}'::jsonb;

alter table public.store_settings
  add column if not exists tagline text,
  add column if not exists announcement_text text;

create unique index if not exists products_store_sku_unique
  on public.products(store_id, sku)
  where sku is not null and btrim(sku) <> '';

-- -----------------------------------------------------------------
-- 2) Public storefront read access.
--    Only non-secret catalog/branding/homepage rows are exposed.
-- -----------------------------------------------------------------
alter table public.stores enable row level security;
alter table public.store_settings enable row level security;
alter table public.brand_settings enable row level security;
alter table public.homepage_banners enable row level security;
alter table public.featured_products enable row level security;

-- Existing owner policies remain in place. PostgreSQL combines SELECT
-- policies with OR, so these are additive and do not remove owner access.
drop policy if exists "public view active stores" on public.stores;
create policy "public view active stores"
on public.stores for select
to anon, authenticated
using (status = 'active');

drop policy if exists "public view store settings" on public.store_settings;
create policy "public view store settings"
on public.store_settings for select
to anon, authenticated
using (
  exists (
    select 1 from public.stores s
    where s.id = store_settings.store_id
      and s.status = 'active'
  )
);

drop policy if exists "public view brand settings" on public.brand_settings;
create policy "public view brand settings"
on public.brand_settings for select
to anon, authenticated
using (
  exists (
    select 1 from public.stores s
    where s.id = brand_settings.store_id
      and s.status = 'active'
  )
);

drop policy if exists "public view active homepage banners" on public.homepage_banners;
create policy "public view active homepage banners"
on public.homepage_banners for select
to anon, authenticated
using (
  status = true
  and exists (
    select 1 from public.stores s
    where s.id = homepage_banners.store_id
      and s.status = 'active'
  )
);

drop policy if exists "public view active featured products" on public.featured_products;
create policy "public view active featured products"
on public.featured_products for select
to anon, authenticated
using (
  status = true
  and exists (
    select 1 from public.stores s
    where s.id = featured_products.store_id
      and s.status = 'active'
  )
);

-- -----------------------------------------------------------------
-- 3) Secure public checkout RPC.
--    Anonymous visitors cannot insert arbitrary orders directly.
--    Product price/HPP are always read from DB, never trusted from browser.
-- -----------------------------------------------------------------
create or replace function public.create_store_order(
  p_store_id uuid,
  p_customer jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store public.stores%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_line numeric;
  v_subtotal numeric := 0;
  v_name text := nullif(btrim(coalesce(p_customer->>'name','')), '');
  v_phone text := nullif(btrim(coalesce(p_customer->>'phone','')), '');
  v_email text := nullif(btrim(coalesce(p_customer->>'email','')), '');
  v_address text := nullif(btrim(coalesce(p_customer->>'address','')), '');
  v_notes text := nullif(btrim(coalesce(p_customer->>'notes','')), '');
begin
  if p_store_id is null then
    raise exception 'Store tidak valid';
  end if;

  select * into v_store
  from public.stores
  where id = p_store_id and status = 'active';

  if not found then
    raise exception 'Store tidak ditemukan / tidak aktif';
  end if;

  if v_name is null then raise exception 'Nama pelanggan wajib diisi'; end if;
  if v_phone is null then raise exception 'Nomor WhatsApp wajib diisi'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;

  -- Validate every item and calculate subtotal using authoritative DB price.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if nullif(v_item->>'product_id','') is null then
      raise exception 'Produk tidak valid';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and store_id = p_store_id
      and status = true;

    if not found then
      raise exception 'Produk tidak tersedia';
    end if;

    v_qty := greatest(coalesce(nullif(v_item->>'qty','')::numeric, 1), 1);

    if coalesce(v_product.type,'physical') = 'physical'
       and coalesce(v_product.stock,0) < v_qty then
      raise exception 'Stok % tidak mencukupi', v_product.name;
    end if;

    v_subtotal := v_subtotal + (coalesce(v_product.price,0) * v_qty);
  end loop;

  insert into public.customers(store_id, name, phone, email, address)
  values (p_store_id, v_name, v_phone, v_email, v_address)
  returning id into v_customer_id;

  insert into public.orders(
    store_id,
    customer_id,
    order_number,
    status,
    payment_status,
    subtotal,
    discount,
    shipping_cost,
    total_amount,
    notes
  ) values (
    p_store_id,
    v_customer_id,
    null,
    'pending',
    'unpaid',
    v_subtotal,
    0,
    0,
    v_subtotal,
    v_notes
  ) returning id, order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and store_id = p_store_id
      and status = true;

    v_qty := greatest(coalesce(nullif(v_item->>'qty','')::numeric, 1), 1);
    v_line := coalesce(v_product.price,0) * v_qty;

    insert into public.order_items(
      order_id,
      product_id,
      product_name,
      qty,
      price,
      hpp,
      subtotal,
      customer_inputs
    ) values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_qty,
      coalesce(v_product.price,0),
      coalesce(v_product.hpp,0),
      v_line,
      coalesce(v_item->'customer_inputs','{}'::jsonb)
    );
  end loop;

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_subtotal,
    'status', 'pending'
  );
end;
$$;

revoke all on function public.create_store_order(uuid,jsonb,jsonb) from public;
grant execute on function public.create_store_order(uuid,jsonb,jsonb) to anon, authenticated;

-- -----------------------------------------------------------------
-- 4) Atomic inventory movement + moving-average HPP.
--    Only owner/admin/manager of the same store may execute it.
-- -----------------------------------------------------------------
create or replace function public.record_inventory_transaction(
  p_product_id uuid,
  p_type text,
  p_qty numeric,
  p_hpp numeric default 0,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_product public.products%rowtype;
  v_new_stock numeric;
  v_new_hpp numeric;
  v_tx_id uuid;
begin
  if auth.uid() is null then raise exception 'Login diperlukan'; end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found or v_profile.store_id is null then
    raise exception 'Profil toko tidak ditemukan';
  end if;

  if coalesce(v_profile.role,'') not in ('owner','admin','manager') then
    raise exception 'Tidak memiliki izin inventory';
  end if;

  if p_type not in ('in','out','adjustment_in','adjustment_out') then
    raise exception 'Tipe inventory tidak valid';
  end if;

  if coalesce(p_qty,0) <= 0 then raise exception 'Qty harus lebih dari 0'; end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and store_id = v_profile.store_id
  for update;

  if not found then raise exception 'Produk tidak ditemukan'; end if;

  if p_type in ('in','adjustment_in') then
    v_new_stock := coalesce(v_product.stock,0) + p_qty;
    if coalesce(p_hpp,0) > 0 and v_new_stock > 0 then
      v_new_hpp := (
        (coalesce(v_product.stock,0) * coalesce(v_product.hpp,0)) +
        (p_qty * p_hpp)
      ) / v_new_stock;
    else
      v_new_hpp := coalesce(v_product.hpp,0);
    end if;
  else
    v_new_stock := coalesce(v_product.stock,0) - p_qty;
    if v_new_stock < 0 then raise exception 'Stok tidak mencukupi'; end if;
    v_new_hpp := coalesce(v_product.hpp,0);
  end if;

  update public.products
  set stock = v_new_stock,
      hpp = v_new_hpp,
      updated_at = now()
  where id = v_product.id;

  insert into public.inventory_transactions(
    store_id, product_id, type, qty, hpp, notes
  ) values (
    v_profile.store_id,
    v_product.id,
    case when p_type in ('in','adjustment_in') then 'in' else 'out' end,
    p_qty,
    case when coalesce(p_hpp,0) > 0 then p_hpp else coalesce(v_product.hpp,0) end,
    p_notes
  ) returning id into v_tx_id;

  return jsonb_build_object(
    'transaction_id', v_tx_id,
    'product_id', v_product.id,
    'stock', v_new_stock,
    'hpp', v_new_hpp
  );
end;
$$;

revoke all on function public.record_inventory_transaction(uuid,text,numeric,numeric,text) from public;
grant execute on function public.record_inventory_transaction(uuid,text,numeric,numeric,text) to authenticated;

commit;

-- ============================================================
-- POST-CHECK (optional, read-only):
-- select column_name from information_schema.columns
-- where table_schema='public' and table_name='products'
-- order by ordinal_position;
--
-- select proname, pg_get_function_identity_arguments(oid)
-- from pg_proc p join pg_namespace n on n.oid=p.pronamespace
-- where n.nspname='public' and proname in ('create_store_order','record_inventory_transaction');
-- ============================================================
