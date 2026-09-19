-- ============================================================================
-- iMersWAStore Base - Step 22 SINGLE STORE Full Commerce Suite
-- Target: existing database after Step 1-21.
-- IMPORTANT: This release is SINGLE STORE. store_id is kept only as an
-- internal data key for compatibility/future-proofing. There is no tenant UI,
-- tenant selector, SaaS super-admin, or multi-store creation flow.
--
-- Adds / completes:
--   * single-store runtime guard
--   * customer registration/account mapping
--   * complete homepage, checkout, legal, SEO & tracking settings
--   * bank/e-wallet/QRIS/COD payment management
--   * WA / Email / RajaOngkir private integration settings
--   * customer CRM tags/notes
--   * broadcast campaign queue
--   * payment confirmation + public order lookup
--   * Checkout V2 with coupon, tax/service fee, shipping & inventory movement
--   * secure RPCs for integrations and account routing
--
-- Safe / additive / idempotent:
--   * does not recreate existing core tables
--   * does not delete business data
--   * policy names are dropped before recreation
--   * functions are CREATE OR REPLACE
-- ============================================================================

begin;

grant usage on schema public to anon, authenticated;

-- --------------------------------------------------------------------------
-- A. SINGLE STORE RUNTIME
-- --------------------------------------------------------------------------
create table if not exists public.single_store_runtime (
  singleton boolean primary key default true check (singleton = true),
  store_id uuid not null unique references public.stores(id) on delete restrict,
  customer_registration_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Use the oldest active store as the one and only runtime store. This keeps the
-- migration reusable and avoids hard-coding a project-specific UUID.
insert into public.single_store_runtime(singleton, store_id)
select true, s.id
from public.stores s
where s.status = 'active'
order by s.created_at asc nulls last, s.id
limit 1
on conflict (singleton) do update
set store_id = excluded.store_id,
    updated_at = now();

alter table public.single_store_runtime enable row level security;
drop policy if exists "public read single store runtime" on public.single_store_runtime;
create policy "public read single store runtime"
on public.single_store_runtime for select
to anon, authenticated
using (singleton = true);

grant select on public.single_store_runtime to anon, authenticated;

create or replace function public.get_single_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select store_id from public.single_store_runtime where singleton = true limit 1
$$;
revoke all on function public.get_single_store_id() from public;
grant execute on function public.get_single_store_id() to anon, authenticated;

create or replace function public.is_single_store_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.store_id = public.get_single_store_id()
      and coalesce(p.role,'') in ('owner','admin','manager')
  )
$$;
revoke all on function public.is_single_store_admin() from public;
grant execute on function public.is_single_store_admin() to authenticated;

-- --------------------------------------------------------------------------
-- B. STOREFRONT / SEO / CHECKOUT / LEGAL SETTINGS
-- --------------------------------------------------------------------------
alter table public.store_settings
  add column if not exists announcement_link text,
  add column if not exists homepage_config jsonb not null default '{
    "show_blog":true,
    "show_banner_mid":false,
    "banner_mid_image":"",
    "banner_mid_link":"",
    "show_popup":false,
    "popup_image":"",
    "popup_title":"",
    "popup_desc":"",
    "popup_btn_text":"Belanja Sekarang",
    "popup_btn_link":"#promo",
    "about_enabled":true,
    "about_title":"Tentang Kami",
    "about_content":"",
    "about_image":""
  }'::jsonb,
  add column if not exists seo_config jsonb not null default '{
    "meta_title":"",
    "meta_description":"",
    "keywords":"",
    "og_image":"",
    "canonical_url":"",
    "robots":"index,follow"
  }'::jsonb,
  add column if not exists tracking_config jsonb not null default '{
    "google_analytics_id":"",
    "meta_pixel_id":"",
    "tiktok_pixel_id":""
  }'::jsonb,
  add column if not exists legal_config jsonb not null default '{
    "terms_enabled":true,
    "terms_content":"",
    "privacy_enabled":true,
    "privacy_content":""
  }'::jsonb,
  add column if not exists checkout_config jsonb not null default '{
    "tax_enabled":false,
    "tax_percent":0,
    "service_fee_enabled":false,
    "service_fee_type":"fixed",
    "service_fee_value":0,
    "allow_cod":true,
    "payment_confirmation_enabled":true,
    "order_tracking_enabled":true
  }'::jsonb;

-- Payment method details used by storefront.
alter table public.payment_settings
  add column if not exists instructions text,
  add column if not exists icon_url text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists payment_settings_store_sort_idx
  on public.payment_settings(store_id, enabled, sort_order, created_at);

-- Public may only READ enabled payment methods. Owner CRUD remains RLS-limited.
alter table public.payment_settings enable row level security;
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='payment_settings' and policyname='payment store access'
  ) then
    alter policy "payment store access" on public.payment_settings to authenticated;
  end if;
end $$;
drop policy if exists "public view enabled payment methods" on public.payment_settings;
create policy "public view enabled payment methods"
on public.payment_settings for select
to anon, authenticated
using (
  enabled = true
  and store_id = public.get_single_store_id()
);

grant select on public.payment_settings to anon, authenticated;
grant insert, update, delete on public.payment_settings to authenticated;

-- Product commerce metadata needed by shipping and GAS parity.
alter table public.products
  add column if not exists unit text not null default 'pcs',
  add column if not exists weight_grams numeric not null default 0;
alter table public.product_variants
  add column if not exists weight_grams numeric,
  add column if not exists unit text,
  add column if not exists active boolean not null default true;

-- --------------------------------------------------------------------------
-- C. CUSTOMER ACCOUNT + CRM
-- --------------------------------------------------------------------------
alter table public.customers
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists customers_store_auth_user_unique
  on public.customers(store_id, auth_user_id)
  where auth_user_id is not null;
create index if not exists customers_store_phone_idx on public.customers(store_id, phone);
create index if not exists customers_store_email_idx on public.customers(store_id, lower(email));

alter table public.customer_profiles enable row level security;
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='customer_profiles' and policyname='customer own profile'
  ) then
    alter policy "customer own profile" on public.customer_profiles to authenticated;
  end if;
end $$;

grant select, insert, update on public.customer_profiles to authenticated;

-- Customers may read/update only their own linked CRM row. Store admin retains
-- the existing store policy from the earlier backend.
alter table public.customers enable row level security;
drop policy if exists "customer read own crm row" on public.customers;
create policy "customer read own crm row"
on public.customers for select
to authenticated
using (auth_user_id = auth.uid());
drop policy if exists "customer update own crm row" on public.customers;
create policy "customer update own crm row"
on public.customers for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid() and store_id = public.get_single_store_id());

grant select, insert, update, delete on public.customers to authenticated;

-- Create customer profile/CRM link automatically for public customer signups.
-- Admin/staff accounts are NOT auto-created here.
create or replace function public.handle_single_store_customer_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_account_type text;
  v_name text;
  v_phone text;
begin
  v_account_type := coalesce(new.raw_user_meta_data->>'account_type','customer');
  if v_account_type <> 'customer' then
    return new;
  end if;

  select store_id into v_store_id
  from public.single_store_runtime
  where singleton = true and customer_registration_enabled = true;

  if v_store_id is null then
    return new;
  end if;

  v_name := nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name','')), '');
  v_phone := nullif(btrim(coalesce(new.raw_user_meta_data->>'phone','')), '');

  insert into public.customer_profiles(id, store_id, full_name, phone)
  values(new.id, v_store_id, coalesce(v_name, split_part(coalesce(new.email,''),'@',1)), v_phone)
  on conflict (id) do update
  set store_id = excluded.store_id,
      full_name = coalesce(excluded.full_name, public.customer_profiles.full_name),
      phone = coalesce(excluded.phone, public.customer_profiles.phone);

  insert into public.customers(store_id, auth_user_id, name, phone, email)
  values(v_store_id, new.id, coalesce(v_name, split_part(coalesce(new.email,''),'@',1)), v_phone, new.email)
  on conflict (store_id, auth_user_id) where auth_user_id is not null
  do update set
    name = excluded.name,
    phone = coalesce(excluded.phone, public.customers.phone),
    email = coalesce(excluded.email, public.customers.email),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_single_store_customer_signup on auth.users;
create trigger trg_single_store_customer_signup
after insert on auth.users
for each row execute function public.handle_single_store_customer_signup();

-- Unified login routing without exposing private tables.
create or replace function public.resolve_account_role()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_customer public.customer_profiles%rowtype;
  v_staff public.store_staff%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('authenticated',false);
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if found and v_profile.store_id = public.get_single_store_id() then
    -- Owner is the primary single-store administrator. Staff accounts must also
    -- exist in store_staff and be active; their menu permissions are returned
    -- to the frontend so a cashier does not get an owner-style navigation.
    if coalesce(v_profile.role,'owner') = 'owner' then
      return jsonb_build_object(
        'authenticated',true,
        'account_type','admin',
        'role','owner',
        'store_id',v_profile.store_id,
        'name',v_profile.full_name,
        'active',true,
        'permissions',jsonb_build_object('all',true)
      );
    end if;

    select * into v_staff
    from public.store_staff
    where auth_user_id = auth.uid()
      and store_id = v_profile.store_id
    limit 1;

    if found then
      return jsonb_build_object(
        'authenticated',true,
        'account_type',case when v_staff.active then 'admin' else 'disabled' end,
        'role',coalesce(v_staff.role,v_profile.role,'cashier'),
        'store_id',v_profile.store_id,
        'name',coalesce(v_staff.name,v_profile.full_name),
        'active',v_staff.active,
        'permissions',coalesce(v_staff.permissions,'{}'::jsonb)
      );
    end if;

    return jsonb_build_object('authenticated',true,'account_type','disabled','role',coalesce(v_profile.role,'staff'),'active',false);
  end if;

  select * into v_customer from public.customer_profiles where id = auth.uid();
  if found and v_customer.store_id = public.get_single_store_id() then
    return jsonb_build_object(
      'authenticated',true,
      'account_type','customer',
      'role','customer',
      'store_id',v_customer.store_id,
      'name',v_customer.full_name,
      'active',true
    );
  end if;

  return jsonb_build_object('authenticated',true,'account_type','unknown');
end;
$$;
revoke all on function public.resolve_account_role() from public;
grant execute on function public.resolve_account_role() to authenticated;

-- Customer may read their own orders through the customer linkage.
alter table public.orders enable row level security;
drop policy if exists "customer view own orders" on public.orders;
create policy "customer view own orders"
on public.orders for select
to authenticated
using (
  customer_id in (
    select c.id from public.customers c where c.auth_user_id = auth.uid()
  )
);

alter table public.order_items enable row level security;
drop policy if exists "customer view own order items" on public.order_items;
create policy "customer view own order items"
on public.order_items for select
to authenticated
using (
  order_id in (
    select o.id
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.auth_user_id = auth.uid()
  )
);

grant select on public.orders, public.order_items to authenticated;

-- --------------------------------------------------------------------------
-- D. NOTIFICATION AUTOMATION + PRIVATE INTEGRATIONS
-- --------------------------------------------------------------------------
alter table public.automation_settings
  add column if not exists whatsapp_recipient text,
  add column if not exists email_recipient text,
  add column if not exists auto_reply_enabled boolean not null default false,
  add column if not exists auto_reply_message text,
  add column if not exists order_notification_template text default 'Order baru {order_number} dari {name}. Total {total}.',
  add column if not exists customer_order_template text default 'Halo {name}, pesanan {order_number} sudah kami terima. Total {total}.',
  add column if not exists payment_notification_template text default 'Konfirmasi pembayaran baru untuk {order_number} dari {name}, sejumlah {amount}.',
  add column if not exists email_order_subject text default 'Order Baru {order_number}',
  add column if not exists email_order_template text default '<p>Order baru <b>{order_number}</b> dari {name}. Total {total}.</p>',
  add column if not exists low_stock_threshold numeric not null default 5,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='automation_settings' and policyname='store automation access'
  ) then
    alter policy "store automation access" on public.automation_settings to authenticated;
  end if;
end $$;
grant select,insert,update,delete on public.automation_settings to authenticated;

-- Raw secrets are intentionally NOT selectable from the browser.
create table if not exists public.integration_settings (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.stores(id) on delete cascade,
  channel text not null,
  provider text,
  enabled boolean not null default false,
  sender text,
  from_name text,
  from_email text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_settings_channel_check check (channel in ('whatsapp','email','shipping')),
  constraint integration_settings_store_channel_unique unique(store_id, channel)
);

create table if not exists public.integration_secrets (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.stores(id) on delete cascade,
  channel text not null,
  secrets jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_secrets_channel_check check (channel in ('whatsapp','email','shipping')),
  constraint integration_secrets_store_channel_unique unique(store_id, channel)
);

alter table public.integration_settings enable row level security;
alter table public.integration_secrets enable row level security;

drop policy if exists "single store admin integration settings" on public.integration_settings;
create policy "single store admin integration settings"
on public.integration_settings for all
to authenticated
using (store_id = public.get_single_store_id() and public.is_single_store_admin())
with check (store_id = public.get_single_store_id() and public.is_single_store_admin());

-- No browser table grant for integration_secrets. Edge Functions use service role;
-- owner writes secrets through save_single_store_integration().
revoke all on table public.integration_secrets from anon, authenticated;
grant select, insert, update, delete on public.integration_settings to authenticated;

-- Move an existing legacy WA token into the private secret table once, then
-- clear the browser-readable legacy column. This keeps upgrades compatible.
insert into public.integration_secrets(store_id,channel,secrets,updated_at)
select a.store_id,'whatsapp',jsonb_build_object('api_key',a.whatsapp_token),now()
from public.automation_settings a
where a.store_id=public.get_single_store_id()
  and nullif(btrim(coalesce(a.whatsapp_token,'')),'') is not null
on conflict(store_id,channel) do nothing;
update public.automation_settings
set whatsapp_token=null,updated_at=now()
where store_id=public.get_single_store_id()
  and nullif(btrim(coalesce(whatsapp_token,'')),'') is not null;

create or replace function public.get_single_store_integrations()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not public.is_single_store_admin() then
    raise exception 'Tidak memiliki akses integrasi';
  end if;

  select coalesce(jsonb_object_agg(s.channel, jsonb_build_object(
    'channel',s.channel,
    'provider',s.provider,
    'enabled',s.enabled,
    'sender',s.sender,
    'from_name',s.from_name,
    'from_email',s.from_email,
    'config',s.config,
    'secret_saved', exists(
      select 1 from public.integration_secrets x
      where x.store_id=s.store_id and x.channel=s.channel and x.secrets <> '{}'::jsonb
    ),
    'updated_at',s.updated_at
  )), '{}'::jsonb)
  into v_result
  from public.integration_settings s
  where s.store_id = public.get_single_store_id();

  return v_result;
end;
$$;
revoke all on function public.get_single_store_integrations() from public;
grant execute on function public.get_single_store_integrations() to authenticated;

create or replace function public.save_single_store_integration(
  p_channel text,
  p_provider text,
  p_enabled boolean,
  p_sender text default null,
  p_from_name text default null,
  p_from_email text default null,
  p_config jsonb default '{}'::jsonb,
  p_secrets jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_store_id uuid;
begin
  if not public.is_single_store_admin() then
    raise exception 'Tidak memiliki akses integrasi';
  end if;
  if p_channel not in ('whatsapp','email','shipping') then
    raise exception 'Channel integrasi tidak valid';
  end if;
  v_store_id := public.get_single_store_id();

  insert into public.integration_settings(store_id,channel,provider,enabled,sender,from_name,from_email,config,updated_at)
  values(v_store_id,p_channel,p_provider,p_enabled,p_sender,p_from_name,p_from_email,coalesce(p_config,'{}'::jsonb),now())
  on conflict(store_id,channel) do update set
    provider=excluded.provider,
    enabled=excluded.enabled,
    sender=excluded.sender,
    from_name=excluded.from_name,
    from_email=excluded.from_email,
    config=excluded.config,
    updated_at=now();

  if p_secrets is not null then
    insert into public.integration_secrets(store_id,channel,secrets,updated_at)
    values(v_store_id,p_channel,p_secrets,now())
    on conflict(store_id,channel) do update set secrets=excluded.secrets,updated_at=now();
  end if;

  return jsonb_build_object('ok',true,'channel',p_channel);
end;
$$;
revoke all on function public.save_single_store_integration(text,text,boolean,text,text,text,jsonb,jsonb) from public;
grant execute on function public.save_single_store_integration(text,text,boolean,text,text,text,jsonb,jsonb) to authenticated;

-- Seed non-secret integration rows. No credentials are inserted.
insert into public.integration_settings(store_id,channel,provider,enabled,config)
select r.store_id,'whatsapp','fonnte',false,'{"endpoint":"https://api.fonnte.com/send"}'::jsonb
from public.single_store_runtime r where r.singleton=true
on conflict(store_id,channel) do nothing;
insert into public.integration_settings(store_id,channel,provider,enabled,config)
select r.store_id,'email','mailketing',false,'{"endpoint":"https://api.mailketing.co.id/api/v1/send"}'::jsonb
from public.single_store_runtime r where r.singleton=true
on conflict(store_id,channel) do nothing;
insert into public.integration_settings(store_id,channel,provider,enabled,config)
select r.store_id,'shipping','manual',false,'{"base_url":"https://rajaongkir.komerce.id/api/v1/","couriers":"jne:sicepat:jnt:ninja:tiki:anteraja:pos"}'::jsonb
from public.single_store_runtime r where r.singleton=true
on conflict(store_id,channel) do nothing;

-- --------------------------------------------------------------------------
-- E. BROADCAST WA / EMAIL QUEUE
-- --------------------------------------------------------------------------
create table if not exists public.broadcast_campaigns (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.stores(id) on delete cascade,
  channel text not null,
  name text not null,
  subject text,
  message text not null,
  segment jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  total_recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint broadcast_campaigns_channel_check check(channel in ('whatsapp','email')),
  constraint broadcast_campaigns_status_check check(status in ('draft','queued','sending','sent','partial','failed','cancelled'))
);

create table if not exists public.broadcast_recipients (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.broadcast_campaigns(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  recipient text not null,
  recipient_name text,
  status text not null default 'pending',
  error_message text,
  provider_response jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint broadcast_recipients_status_check check(status in ('pending','sending','sent','failed','skipped'))
);
create index if not exists broadcast_campaigns_store_created_idx on public.broadcast_campaigns(store_id,created_at desc);
create index if not exists broadcast_recipients_campaign_status_idx on public.broadcast_recipients(campaign_id,status,created_at);

alter table public.broadcast_campaigns enable row level security;
alter table public.broadcast_recipients enable row level security;
drop policy if exists "single store admin campaigns" on public.broadcast_campaigns;
create policy "single store admin campaigns" on public.broadcast_campaigns for all to authenticated
using(store_id=public.get_single_store_id() and public.is_single_store_admin())
with check(store_id=public.get_single_store_id() and public.is_single_store_admin());
drop policy if exists "single store admin recipients" on public.broadcast_recipients;
create policy "single store admin recipients" on public.broadcast_recipients for all to authenticated
using(exists(select 1 from public.broadcast_campaigns c where c.id=broadcast_recipients.campaign_id and c.store_id=public.get_single_store_id()) and public.is_single_store_admin())
with check(exists(select 1 from public.broadcast_campaigns c where c.id=broadcast_recipients.campaign_id and c.store_id=public.get_single_store_id()) and public.is_single_store_admin());

grant select,insert,update,delete on public.broadcast_campaigns,public.broadcast_recipients to authenticated;

-- Create a campaign + recipient queue from CRM in one atomic call.
create or replace function public.queue_customer_broadcast(
  p_channel text,
  p_name text,
  p_subject text,
  p_message text,
  p_customer_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_store_id uuid;
  v_campaign_id uuid;
  v_count integer;
begin
  if not public.is_single_store_admin() then raise exception 'Tidak memiliki akses broadcast'; end if;
  if p_channel not in ('whatsapp','email') then raise exception 'Channel tidak valid'; end if;
  v_store_id:=public.get_single_store_id();

  insert into public.broadcast_campaigns(store_id,channel,name,subject,message,status,created_by)
  values(v_store_id,p_channel,p_name,p_subject,p_message,'queued',auth.uid())
  returning id into v_campaign_id;

  insert into public.broadcast_recipients(campaign_id,customer_id,recipient,recipient_name)
  select v_campaign_id,c.id,
    case when p_channel='whatsapp' then c.phone else c.email end,
    c.name
  from public.customers c
  where c.store_id=v_store_id
    and (p_customer_ids is null or c.id=any(p_customer_ids))
    and nullif(btrim(case when p_channel='whatsapp' then c.phone else c.email end),'') is not null;

  get diagnostics v_count=row_count;
  update public.broadcast_campaigns set total_recipients=v_count where id=v_campaign_id;
  return jsonb_build_object('id',v_campaign_id,'queued',v_count);
end;
$$;
revoke all on function public.queue_customer_broadcast(text,text,text,text,uuid[]) from public;
grant execute on function public.queue_customer_broadcast(text,text,text,text,uuid[]) to authenticated;

-- --------------------------------------------------------------------------
-- F. ORDER/PAYMENT ENHANCEMENTS + PUBLIC TRACKING
-- --------------------------------------------------------------------------
alter table public.orders
  add column if not exists shipping_method text,
  add column if not exists coupon_code text,
  add column if not exists tax_amount numeric not null default 0,
  add column if not exists service_fee numeric not null default 0,
  add column if not exists customer_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists shipping_address text,
  add column if not exists tracking_number text,
  add column if not exists notification_token uuid not null default uuid_generate_v4(),
  add column if not exists notified_at timestamptz;

create unique index if not exists orders_notification_token_unique on public.orders(notification_token);

create table if not exists public.payment_confirmations (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  payer_name text not null,
  payer_phone text not null,
  amount numeric not null default 0,
  payment_method text,
  bank_name text,
  proof_url text,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  notified_at timestamptz,
  constraint payment_confirmation_status_check check(status in ('pending','verified','rejected'))
);
alter table public.payment_confirmations
  add column if not exists notified_at timestamptz;
create index if not exists payment_confirmations_store_created_idx on public.payment_confirmations(store_id,created_at desc);
alter table public.payment_confirmations enable row level security;
drop policy if exists "single store admin payment confirmations" on public.payment_confirmations;
create policy "single store admin payment confirmations"
on public.payment_confirmations for all to authenticated
using(store_id=public.get_single_store_id() and public.is_single_store_admin())
with check(store_id=public.get_single_store_id() and public.is_single_store_admin());
grant select,update,delete on public.payment_confirmations to authenticated;

create or replace function public.lookup_public_order(
  p_store_id uuid,
  p_order_number text,
  p_phone text
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order public.orders%rowtype;
  v_customer public.customers%rowtype;
  v_items jsonb;
begin
  if p_store_id <> public.get_single_store_id() then raise exception 'Store tidak valid'; end if;
  select o,c into v_order,v_customer
  from public.orders o
  join public.customers c on c.id=o.customer_id
  where o.store_id=p_store_id
    and upper(o.order_number)=upper(btrim(p_order_number))
    and right(regexp_replace(coalesce(c.phone,''),'\D','','g'),6)=right(regexp_replace(coalesce(p_phone,''),'\D','','g'),6)
  limit 1;
  if not found then return jsonb_build_object('found',false); end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'product_name',oi.product_name,'qty',oi.qty,'price',oi.price,'subtotal',oi.subtotal
  ) order by oi.created_at),'[]'::jsonb)
  into v_items from public.order_items oi where oi.order_id=v_order.id;

  return jsonb_build_object(
    'found',true,'order_number',v_order.order_number,'status',v_order.status,
    'payment_status',v_order.payment_status,'payment_method',v_order.payment_method,
    'subtotal',v_order.subtotal,'discount',v_order.discount,'shipping_cost',v_order.shipping_cost,
    'tax_amount',v_order.tax_amount,'service_fee',v_order.service_fee,'total_amount',v_order.total_amount,
    'shipping_method',v_order.shipping_method,'tracking_number',v_order.tracking_number,
    'created_at',v_order.created_at,'customer_name',v_customer.name,'items',v_items
  );
end;
$$;
revoke all on function public.lookup_public_order(uuid,text,text) from public;
grant execute on function public.lookup_public_order(uuid,text,text) to anon,authenticated;

create or replace function public.submit_payment_confirmation(
  p_store_id uuid,
  p_order_number text,
  p_phone text,
  p_payer_name text,
  p_amount numeric,
  p_payment_method text default null,
  p_bank_name text default null,
  p_proof_url text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order_id uuid;
  v_customer_phone text;
  v_notify_token uuid;
  v_id uuid;
begin
  if p_store_id <> public.get_single_store_id() then raise exception 'Store tidak valid'; end if;
  select o.id,c.phone,o.notification_token into v_order_id,v_customer_phone,v_notify_token
  from public.orders o join public.customers c on c.id=o.customer_id
  where o.store_id=p_store_id and upper(o.order_number)=upper(btrim(p_order_number)) limit 1;
  if v_order_id is null or right(regexp_replace(coalesce(v_customer_phone,''),'\D','','g'),6) <> right(regexp_replace(coalesce(p_phone,''),'\D','','g'),6) then
    raise exception 'Nomor order / WhatsApp tidak cocok';
  end if;
  insert into public.payment_confirmations(store_id,order_id,payer_name,payer_phone,amount,payment_method,bank_name,proof_url,notes)
  values(p_store_id,v_order_id,btrim(p_payer_name),btrim(p_phone),greatest(coalesce(p_amount,0),0),p_payment_method,p_bank_name,p_proof_url,p_notes)
  returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id,'order_id',v_order_id,'notification_token',v_notify_token);
end;
$$;
revoke all on function public.submit_payment_confirmation(uuid,text,text,text,numeric,text,text,text,text) from public;
grant execute on function public.submit_payment_confirmation(uuid,text,text,text,numeric,text,text,text,text) to anon,authenticated;

-- Short-lived RajaOngkir quotes are written only by the shipping Edge Function.
-- Checkout validates the opaque token so customers cannot edit shipping price in
-- the browser and submit an arbitrary lower number.
create table if not exists public.shipping_quotes (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.stores(id) on delete cascade,
  quote_token uuid not null unique default uuid_generate_v4(),
  destination_id text not null,
  courier text not null,
  service text,
  description text,
  cost numeric not null check(cost >= 0),
  etd text,
  weight_grams numeric not null default 0,
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  created_at timestamptz not null default now()
);
create index if not exists shipping_quotes_token_expiry_idx on public.shipping_quotes(quote_token,expires_at);
alter table public.shipping_quotes enable row level security;
revoke all on table public.shipping_quotes from anon, authenticated;

-- --------------------------------------------------------------------------
-- G. CHECKOUT V2 - authoritative price, coupon, tax/service, shipping, stock
-- --------------------------------------------------------------------------
create or replace function public.create_store_order_v2(
  p_store_id uuid,
  p_customer jsonb,
  p_items jsonb,
  p_checkout jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,auth
as $$
declare
  v_store public.stores%rowtype;
  v_settings public.store_settings%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_notification_token uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_qty numeric;
  v_price numeric;
  v_hpp numeric;
  v_line numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_shipping numeric := 0;
  v_tax numeric := 0;
  v_service numeric := 0;
  v_total numeric := 0;
  v_coupon jsonb;
  v_coupon_id uuid;
  v_shipping_id uuid;
  v_shipping_quote_token uuid;
  v_shipping_quote public.shipping_quotes%rowtype;
  v_payment_id uuid;
  v_payment public.payment_settings%rowtype;
  v_shipping_row public.shipping_settings%rowtype;
  v_cfg jsonb := '{}'::jsonb;
  v_name text := nullif(btrim(coalesce(p_customer->>'name','')), '');
  v_phone text := nullif(btrim(coalesce(p_customer->>'phone','')), '');
  v_email text := nullif(btrim(coalesce(p_customer->>'email','')), '');
  v_address text := nullif(btrim(coalesce(p_customer->>'address','')), '');
  v_notes text := nullif(btrim(coalesce(p_customer->>'notes','')), '');
  v_coupon_code text := nullif(btrim(coalesce(p_checkout->>'coupon_code','')), '');
  v_shipping_method text;
  v_auth_customer uuid;
begin
  if p_store_id is null or p_store_id <> public.get_single_store_id() then raise exception 'Store tidak valid'; end if;
  select * into v_store from public.stores where id=p_store_id and status='active';
  if not found then raise exception 'Store tidak aktif'; end if;
  if v_name is null then raise exception 'Nama pelanggan wajib diisi'; end if;
  if v_phone is null then raise exception 'Nomor WhatsApp wajib diisi'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'Keranjang kosong'; end if;

  select * into v_settings from public.store_settings where store_id=p_store_id order by created_at asc limit 1;
  v_cfg := coalesce(v_settings.checkout_config,'{}'::jsonb);

  -- Calculate using authoritative DB prices and lock stock.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(coalesce(nullif(v_item->>'qty','')::numeric,1),1);
    select * into v_product from public.products
    where id=(v_item->>'product_id')::uuid and store_id=p_store_id and status=true for update;
    if not found then raise exception 'Produk tidak tersedia'; end if;

    v_price:=coalesce(v_product.price,0); v_hpp:=coalesce(v_product.hpp,0);
    if nullif(v_item->>'variant_id','') is not null then
      select * into v_variant from public.product_variants
      where id=(v_item->>'variant_id')::uuid and product_id=v_product.id for update;
      if not found then raise exception 'Varian produk tidak tersedia'; end if;
      v_price:=coalesce(v_variant.price,v_price); v_hpp:=coalesce(v_variant.hpp,v_hpp);
      if v_product.type='physical' and coalesce(v_variant.stock,0)<v_qty then raise exception 'Stok varian % tidak cukup',v_product.name; end if;
    elsif v_product.type='physical' and coalesce(v_product.stock,0)<v_qty then
      raise exception 'Stok % tidak cukup',v_product.name;
    end if;
    v_subtotal:=v_subtotal+(v_price*v_qty);
  end loop;

  -- Coupon via the existing validated function.
  if v_coupon_code is not null then
    v_coupon:=public.validate_store_coupon(p_store_id,v_coupon_code,v_subtotal);
    if coalesce((v_coupon->>'valid')::boolean,false) then
      v_discount:=coalesce((v_coupon->>'discount_amount')::numeric,0);
      v_coupon_id:=nullif(v_coupon->>'id','')::uuid;
    else
      raise exception '%',coalesce(v_coupon->>'message','Kupon tidak valid');
    end if;
  end if;

  -- Manual shipping method is validated from the enabled method table.
  if nullif(p_checkout->>'shipping_id','') is not null then
    v_shipping_id:=(p_checkout->>'shipping_id')::uuid;
    select * into v_shipping_row from public.shipping_settings
    where id=v_shipping_id and store_id=p_store_id and enabled=true;
    if found then v_shipping:=coalesce(v_shipping_row.price,0);v_shipping_method:=v_shipping_row.name; end if;
  elsif nullif(p_checkout->>'shipping_quote_token','') is not null then
    v_shipping_quote_token := (p_checkout->>'shipping_quote_token')::uuid;
    select * into v_shipping_quote
    from public.shipping_quotes
    where quote_token=v_shipping_quote_token
      and store_id=p_store_id
      and expires_at > now()
    limit 1;
    if not found then raise exception 'Quote ongkir sudah tidak valid / kedaluwarsa'; end if;
    v_shipping:=v_shipping_quote.cost;
    v_shipping_method:=left(concat_ws(' ',v_shipping_quote.courier,v_shipping_quote.service),160);
  end if;

  if coalesce((v_cfg->>'tax_enabled')::boolean,false) then
    v_tax:=round(greatest(v_subtotal-v_discount,0)*(greatest(coalesce((v_cfg->>'tax_percent')::numeric,0),0)/100.0),2);
  end if;
  if coalesce((v_cfg->>'service_fee_enabled')::boolean,false) then
    if coalesce(v_cfg->>'service_fee_type','fixed')='percent' then
      v_service:=round(greatest(v_subtotal-v_discount,0)*(greatest(coalesce((v_cfg->>'service_fee_value')::numeric,0),0)/100.0),2);
    else
      v_service:=greatest(coalesce((v_cfg->>'service_fee_value')::numeric,0),0);
    end if;
  end if;

  if nullif(p_checkout->>'payment_id','') is not null then
    v_payment_id:=(p_checkout->>'payment_id')::uuid;
    select * into v_payment from public.payment_settings
    where id=v_payment_id and store_id=p_store_id and enabled=true;
    if not found then raise exception 'Metode pembayaran tidak tersedia'; end if;
  end if;

  v_total:=greatest(v_subtotal-v_discount+v_shipping+v_tax+v_service,0);

  -- Reuse registered customer CRM row when possible.
  if auth.uid() is not null then
    select id into v_auth_customer from public.customers
    where store_id=p_store_id and auth_user_id=auth.uid() limit 1;
  end if;
  if v_auth_customer is not null then
    v_customer_id:=v_auth_customer;
    update public.customers set name=v_name,phone=v_phone,email=coalesce(v_email,email),address=coalesce(v_address,address),updated_at=now() where id=v_customer_id;
  else
    select id into v_customer_id from public.customers
    where store_id=p_store_id and phone=v_phone order by created_at desc limit 1;
    if v_customer_id is null then
      insert into public.customers(store_id,name,phone,email,address)
      values(p_store_id,v_name,v_phone,v_email,v_address) returning id into v_customer_id;
    else
      update public.customers set name=v_name,email=coalesce(v_email,email),address=coalesce(v_address,address),updated_at=now() where id=v_customer_id;
    end if;
  end if;

  insert into public.orders(
    store_id,customer_id,status,payment_status,payment_method,subtotal,discount,shipping_cost,
    tax_amount,service_fee,total_amount,notes,source,shipping_method,coupon_code,customer_snapshot,shipping_address
  ) values(
    p_store_id,v_customer_id,'pending','unpaid',coalesce(v_payment.provider_name,v_payment.payment_type,'manual'),
    v_subtotal,v_discount,v_shipping,v_tax,v_service,v_total,v_notes,'online',v_shipping_method,v_coupon_code,
    jsonb_build_object('name',v_name,'phone',v_phone,'email',v_email),v_address
  ) returning id,order_number,notification_token into v_order_id,v_order_number,v_notification_token;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty:=greatest(coalesce(nullif(v_item->>'qty','')::numeric,1),1);
    select * into v_product from public.products where id=(v_item->>'product_id')::uuid and store_id=p_store_id for update;
    v_price:=coalesce(v_product.price,0);v_hpp:=coalesce(v_product.hpp,0);
    if nullif(v_item->>'variant_id','') is not null then
      select * into v_variant from public.product_variants where id=(v_item->>'variant_id')::uuid and product_id=v_product.id for update;
      v_price:=coalesce(v_variant.price,v_price);v_hpp:=coalesce(v_variant.hpp,v_hpp);
    else
      v_variant.id:=null;
    end if;
    v_line:=v_price*v_qty;
    insert into public.order_items(order_id,product_id,variant_id,product_name,qty,price,hpp,subtotal,customer_inputs)
    values(v_order_id,v_product.id,v_variant.id,v_product.name,v_qty,v_price,v_hpp,v_line,coalesce(v_item->'customer_inputs','{}'::jsonb));

    if v_product.type='physical' then
      if v_variant.id is not null then
        update public.product_variants set stock=stock-v_qty where id=v_variant.id;
      else
        update public.products set stock=stock-v_qty,updated_at=now() where id=v_product.id;
      end if;
      insert into public.inventory_transactions(store_id,product_id,variant_id,type,qty,hpp,reference_type,reference_id,notes)
      values(p_store_id,v_product.id,v_variant.id,'out',v_qty,v_hpp,'online_order',v_order_id,'Penjualan toko online');
    end if;
  end loop;

  if v_coupon_id is not null then update public.coupons set usage_count=usage_count+1,updated_at=now() where id=v_coupon_id; end if;

  return jsonb_build_object(
    'id',v_order_id,'order_number',v_order_number,'subtotal',v_subtotal,'discount',v_discount,
    'shipping_cost',v_shipping,'tax_amount',v_tax,'service_fee',v_service,'total_amount',v_total,
    'payment_method',coalesce(v_payment.provider_name,v_payment.payment_type,'manual'),'status','pending',
    'notification_token',v_notification_token
  );
end;
$$;
revoke all on function public.create_store_order_v2(uuid,jsonb,jsonb,jsonb) from public;
grant execute on function public.create_store_order_v2(uuid,jsonb,jsonb,jsonb) to anon,authenticated;

-- --------------------------------------------------------------------------
-- H. API PRIVILEGES FOR ADMIN MODULES
-- RLS remains the row-level boundary.
-- --------------------------------------------------------------------------
grant select,insert,update,delete on public.store_settings,public.brand_settings to authenticated;
grant select,insert,update,delete on public.payment_confirmations to authenticated;

commit;

-- Expected SQL Editor result:
--   Success. No rows returned
--
-- Suggested query name:
--   iMersWAStore Base - Step 22 SINGLE STORE Full Commerce Suite
-- ============================================================================
