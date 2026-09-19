-- ============================================================================
-- iMersWAStore Base - Step 21 White Label Theme Engine & Admin Operations
-- Target: Supabase existing backend (lanjutan Step 1-20)
--
-- Satu migration besar untuk:
--   1) Dashboard Theme Engine per toko / tenant (JSONB, dynamic, no hardcode)
--   2) Kupon & Promo
--   3) Registry Staff / Manajemen Kasir
--   4) Video Panduan per toko
--   5) POS metadata + RPC transaksi POS atomic
--   6) Public shipping read policy
--   7) Coupon validation RPC
--   8) API grants yang diperlukan dashboard owner
--
-- Aman / additive / idempotent:
--   - Tidak recreate tabel existing
--   - Tidak menghapus data
--   - RLS tetap aktif
--   - Anonymous tidak mendapat akses write
-- ============================================================================

begin;

grant usage on schema public to anon, authenticated;

-- --------------------------------------------------------------------------
-- A. WHITE LABEL DASHBOARD THEME ENGINE
-- --------------------------------------------------------------------------
alter table public.brand_settings
  add column if not exists dashboard_theme jsonb not null default
  '{
    "preset":"emerald",
    "primary":"#10b981",
    "accent":"#0ea5e9",
    "success":"#22c55e",
    "warning":"#f59e0b",
    "danger":"#ef4444",
    "sidebar_from":"#062d2b",
    "sidebar_to":"#0f766e",
    "page_bg":"#f4fbf8",
    "surface":"#ffffff",
    "text":"#10213e",
    "muted":"#718096",
    "border":"#dfeee8",
    "card_1":"linear-gradient(135deg,#0f766e 0%,#10b981 100%)",
    "card_2":"linear-gradient(135deg,#0ea5e9 0%,#2563eb 100%)",
    "card_3":"linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)",
    "card_4":"linear-gradient(135deg,#f97316 0%,#f59e0b 100%)",
    "radius":18,
    "shadow":"soft",
    "font":"Plus Jakarta Sans",
    "density":"comfortable"
  }'::jsonb;

alter table public.brand_settings
  add column if not exists dashboard_theme_updated_at timestamptz default now();

-- Isi default key yang belum ada tanpa menimpa custom key existing.
update public.brand_settings
set dashboard_theme =
  '{
    "preset":"emerald",
    "primary":"#10b981",
    "accent":"#0ea5e9",
    "success":"#22c55e",
    "warning":"#f59e0b",
    "danger":"#ef4444",
    "sidebar_from":"#062d2b",
    "sidebar_to":"#0f766e",
    "page_bg":"#f4fbf8",
    "surface":"#ffffff",
    "text":"#10213e",
    "muted":"#718096",
    "border":"#dfeee8",
    "card_1":"linear-gradient(135deg,#0f766e 0%,#10b981 100%)",
    "card_2":"linear-gradient(135deg,#0ea5e9 0%,#2563eb 100%)",
    "card_3":"linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)",
    "card_4":"linear-gradient(135deg,#f97316 0%,#f59e0b 100%)",
    "radius":18,
    "shadow":"soft",
    "font":"Plus Jakarta Sans",
    "density":"comfortable"
  }'::jsonb || coalesce(dashboard_theme,'{}'::jsonb)
where dashboard_theme is null
   or jsonb_typeof(dashboard_theme) <> 'object'
   or not (dashboard_theme ? 'primary');

comment on column public.brand_settings.dashboard_theme is
'Per-store white-label admin theme. Safe visual config only; no secrets.';

-- --------------------------------------------------------------------------
-- B. COUPON & PROMO
-- --------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null,
  name text,
  discount_type text not null default 'percent',
  discount_value numeric not null default 0,
  min_order numeric not null default 0,
  max_discount numeric,
  start_at timestamptz,
  end_at timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_discount_type_check check (discount_type in ('percent','fixed')),
  constraint coupons_discount_value_check check (discount_value >= 0),
  constraint coupons_min_order_check check (min_order >= 0),
  constraint coupons_usage_limit_check check (usage_limit is null or usage_limit > 0)
);

create unique index if not exists coupons_store_code_unique
  on public.coupons(store_id, lower(code));
create index if not exists coupons_store_active_idx
  on public.coupons(store_id, active);

alter table public.coupons enable row level security;
drop policy if exists "coupon store manage" on public.coupons;
create policy "coupon store manage"
on public.coupons for all
to authenticated
using (store_id = public.get_user_store_id())
with check (store_id = public.get_user_store_id());

-- --------------------------------------------------------------------------
-- C. STORE STAFF / CASHIER REGISTRY
-- auth_user_id optional agar registry bisa dibuat sebelum invite Supabase Auth.
-- --------------------------------------------------------------------------
create table if not exists public.store_staff (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.stores(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  role text not null default 'cashier',
  permissions jsonb not null default '{"pos":true,"orders":true,"products":false,"inventory":false,"reports":false}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_staff_role_check check (role in ('cashier','manager','inventory','admin'))
);

create unique index if not exists store_staff_store_auth_unique
  on public.store_staff(store_id, auth_user_id)
  where auth_user_id is not null;
create unique index if not exists store_staff_store_email_unique
  on public.store_staff(store_id, lower(email))
  where email is not null and btrim(email) <> '';
create index if not exists store_staff_store_active_idx
  on public.store_staff(store_id, active);

alter table public.store_staff enable row level security;
drop policy if exists "staff store manage" on public.store_staff;
create policy "staff store manage"
on public.store_staff for all
to authenticated
using (store_id = public.get_user_store_id())
with check (store_id = public.get_user_store_id());

-- --------------------------------------------------------------------------
-- D. VIDEO GUIDE PER STORE
-- --------------------------------------------------------------------------
create table if not exists public.video_guides (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  category text default 'Umum',
  video_url text not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists video_guides_store_order_idx
  on public.video_guides(store_id, sort_order, created_at desc);

alter table public.video_guides enable row level security;
drop policy if exists "guide store manage" on public.video_guides;
create policy "guide store manage"
on public.video_guides for all
to authenticated
using (store_id = public.get_user_store_id())
with check (store_id = public.get_user_store_id());

-- --------------------------------------------------------------------------
-- E. ORDER / POS METADATA
-- --------------------------------------------------------------------------
alter table public.orders
  add column if not exists source text not null default 'online';
alter table public.orders
  add column if not exists cashier_staff_id uuid;

-- Add FK only once.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_cashier_staff_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_cashier_staff_id_fkey
      foreign key (cashier_staff_id)
      references public.store_staff(id)
      on delete set null;
  end if;
end $$;

create index if not exists orders_store_source_created_idx
  on public.orders(store_id, source, created_at desc);

-- --------------------------------------------------------------------------
-- F. SHIPPING: owner CRUD + storefront read active methods
-- --------------------------------------------------------------------------
alter table public.shipping_settings enable row level security;

-- Legacy policy should only be authenticated.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='shipping_settings'
      and policyname='shipping store access'
  ) then
    alter policy "shipping store access" on public.shipping_settings to authenticated;
  end if;
end $$;

drop policy if exists "public view enabled shipping" on public.shipping_settings;
create policy "public view enabled shipping"
on public.shipping_settings for select
to anon, authenticated
using (
  enabled = true
  and exists (
    select 1 from public.stores s
    where s.id = shipping_settings.store_id
      and s.status = 'active'
  )
);

-- --------------------------------------------------------------------------
-- G. COUPON VALIDATION RPC
-- Anonymous user can validate ONE code, not enumerate coupons.
-- --------------------------------------------------------------------------
create or replace function public.validate_store_coupon(
  p_store_id uuid,
  p_code text,
  p_subtotal numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_discount numeric := 0;
begin
  if p_store_id is null or coalesce(btrim(p_code),'') = '' then
    return jsonb_build_object('valid',false,'message','Kode kupon tidak valid.');
  end if;

  select * into v_coupon
  from public.coupons
  where store_id = p_store_id
    and lower(code) = lower(btrim(p_code))
    and active = true
  limit 1;

  if not found then
    return jsonb_build_object('valid',false,'message','Kupon tidak ditemukan atau tidak aktif.');
  end if;

  if v_coupon.start_at is not null and now() < v_coupon.start_at then
    return jsonb_build_object('valid',false,'message','Kupon belum mulai berlaku.');
  end if;
  if v_coupon.end_at is not null and now() > v_coupon.end_at then
    return jsonb_build_object('valid',false,'message','Kupon sudah berakhir.');
  end if;
  if v_coupon.usage_limit is not null and v_coupon.usage_count >= v_coupon.usage_limit then
    return jsonb_build_object('valid',false,'message','Limit pemakaian kupon sudah habis.');
  end if;
  if coalesce(p_subtotal,0) < coalesce(v_coupon.min_order,0) then
    return jsonb_build_object('valid',false,'message','Minimum order belum terpenuhi.','min_order',v_coupon.min_order);
  end if;

  if v_coupon.discount_type = 'percent' then
    v_discount := coalesce(p_subtotal,0) * (v_coupon.discount_value / 100.0);
  else
    v_discount := v_coupon.discount_value;
  end if;

  if v_coupon.max_discount is not null then
    v_discount := least(v_discount, v_coupon.max_discount);
  end if;
  v_discount := least(v_discount, coalesce(p_subtotal,0));

  return jsonb_build_object(
    'valid',true,
    'id',v_coupon.id,
    'code',v_coupon.code,
    'name',v_coupon.name,
    'discount_type',v_coupon.discount_type,
    'discount_value',v_coupon.discount_value,
    'discount_amount',round(v_discount,2),
    'final_total',greatest(0,coalesce(p_subtotal,0)-v_discount)
  );
end;
$$;

revoke all on function public.validate_store_coupon(uuid,text,numeric) from public;
grant execute on function public.validate_store_coupon(uuid,text,numeric) to anon, authenticated;

-- --------------------------------------------------------------------------
-- H. POS RPC - atomic order + order items + stock movement
-- --------------------------------------------------------------------------
create or replace function public.create_pos_order(
  p_items jsonb,
  p_customer jsonb default '{}'::jsonb,
  p_payment_method text default 'cash',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_store_id uuid;
  v_customer_id uuid;
  v_staff_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric := 0;
  v_paid boolean := false;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty numeric;
  v_line numeric;
  v_customer_name text;
  v_customer_phone text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  v_store_id := public.get_user_store_id();
  if v_store_id is null then
    raise exception 'Store context not found';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'POS cart is invalid';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'POS cart is empty';
  end if;

  -- First pass: validate and calculate subtotal.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, coalesce((v_item->>'qty')::numeric,1));
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and store_id = v_store_id
      and status = true
    for update;

    if not found then
      raise exception 'Product not found or inactive';
    end if;
    if v_product.type = 'physical' and coalesce(v_product.stock,0) < v_qty then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;
    v_subtotal := v_subtotal + (coalesce(v_product.price,0) * v_qty);
  end loop;

  v_customer_name := nullif(btrim(coalesce(p_customer->>'name','')), '');
  v_customer_phone := nullif(btrim(coalesce(p_customer->>'phone','')), '');

  if v_customer_phone is not null then
    select id into v_customer_id
    from public.customers
    where store_id = v_store_id and phone = v_customer_phone
    order by created_at desc
    limit 1;

    if v_customer_id is null then
      insert into public.customers(store_id,name,phone)
      values(v_store_id,coalesce(v_customer_name,'Customer POS'),v_customer_phone)
      returning id into v_customer_id;
    else
      update public.customers
      set name = coalesce(v_customer_name,name)
      where id = v_customer_id;
    end if;
  elsif v_customer_name is not null then
    insert into public.customers(store_id,name)
    values(v_store_id,v_customer_name)
    returning id into v_customer_id;
  end if;

  select id into v_staff_id
  from public.store_staff
  where store_id = v_store_id
    and auth_user_id = auth.uid()
    and active = true
  limit 1;

  v_paid := lower(coalesce(p_payment_method,'cash')) in ('cash','qris','card','debit','credit');

  insert into public.orders(
    store_id, customer_id, status, payment_status, payment_method,
    subtotal, discount, shipping_cost, total_amount, notes, source, cashier_staff_id
  ) values (
    v_store_id, v_customer_id,
    case when v_paid then 'completed' else 'pending' end,
    case when v_paid then 'paid' else 'unpaid' end,
    coalesce(p_payment_method,'cash'),
    v_subtotal,0,0,v_subtotal,p_notes,'pos',v_staff_id
  )
  returning id, order_number into v_order_id, v_order_number;

  -- Second pass: create items + stock movements.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, coalesce((v_item->>'qty')::numeric,1));
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and store_id = v_store_id
    for update;

    v_line := coalesce(v_product.price,0) * v_qty;

    insert into public.order_items(
      order_id, product_id, product_name, qty, price, hpp, subtotal
    ) values (
      v_order_id, v_product.id, v_product.name, v_qty,
      coalesce(v_product.price,0), coalesce(v_product.hpp,0), v_line
    );

    if v_product.type = 'physical' then
      update public.products
      set stock = stock - v_qty,
          updated_at = now()
      where id = v_product.id;

      insert into public.inventory_transactions(
        store_id, product_id, type, qty, hpp, reference_type, reference_id, notes
      ) values (
        v_store_id, v_product.id, 'out', v_qty, coalesce(v_product.hpp,0),
        'pos_order', v_order_id, 'Penjualan melalui Kasir POS'
      );
    end if;
  end loop;

  return jsonb_build_object(
    'id',v_order_id,
    'order_number',v_order_number,
    'total_amount',v_subtotal,
    'payment_status',case when v_paid then 'paid' else 'unpaid' end,
    'status',case when v_paid then 'completed' else 'pending' end
  );
end;
$$;

revoke all on function public.create_pos_order(jsonb,jsonb,text,text) from public;
grant execute on function public.create_pos_order(jsonb,jsonb,text,text) to authenticated;

-- --------------------------------------------------------------------------
-- I. API PRIVILEGES - RLS tetap boundary utama
-- --------------------------------------------------------------------------
grant select, insert, update, delete on table
  public.coupons,
  public.store_staff,
  public.video_guides
  to authenticated;

grant select, insert, update, delete on table public.shipping_settings to authenticated;
grant select on table public.shipping_settings to anon;

grant select, insert, update on table public.orders to authenticated;
grant select, insert on table public.order_items to authenticated;
grant select, insert, update on table public.customers to authenticated;
grant select, update on table public.products to authenticated;
grant select, insert on table public.inventory_transactions to authenticated;

grant select, insert, update, delete on table public.categories to authenticated;
grant select, insert, update, delete on table public.product_media to authenticated;
grant select, insert, update, delete on table public.brand_settings to authenticated;
grant select, insert, update, delete on table public.store_settings to authenticated;

commit;

-- Expected SQL Editor result:
--   Success. No rows returned
--
-- Suggested saved query name:
--   iMersWAStore Base - Step 21 White Label Theme Engine & Admin Operations
