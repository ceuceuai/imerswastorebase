-- ============================================================================
-- iMersWAStore Base - Step 24 FINAL ESSENTIALS (SINGLE STORE)
-- Requires: Step 22 FIX1 + Step 23 already applied.
-- Scope:
--   1) Dynamic social links per store
--   2) Public WhatsApp prefill (safe RPC; automation table remains private)
--   3) Real low-stock notification settings + anti-spam state
--   4) Disclaimer / Terms / Privacy legal defaults
-- Notes:
--   - SINGLE STORE only
--   - additive/idempotent
--   - no Secret Tap Login
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- A. STOREFRONT SOCIAL + LEGAL SETTINGS
-- --------------------------------------------------------------------------
alter table public.store_settings
  add column if not exists social_media jsonb not null default '[]'::jsonb;

-- Keep old legal content, only add missing disclaimer defaults.
update public.store_settings
set legal_config = '{
  "terms_enabled": true,
  "terms_content": "",
  "privacy_enabled": true,
  "privacy_content": "",
  "disclaimer_enabled": true,
  "disclaimer_title": "Disclaimer",
  "disclaimer_footer_text": "Informasi, harga, stok, promo, dan ketentuan dapat berubah sesuai kebijakan toko.",
  "disclaimer_content": ""
}'::jsonb || coalesce(legal_config, '{}'::jsonb)
where legal_config is null
   or not (coalesce(legal_config, '{}'::jsonb) ? 'disclaimer_enabled')
   or not (coalesce(legal_config, '{}'::jsonb) ? 'disclaimer_content')
   or not (coalesce(legal_config, '{}'::jsonb) ? 'disclaimer_footer_text');

-- --------------------------------------------------------------------------
-- B. LOW STOCK AUTOMATION - REAL EXECUTION SUPPORT
-- --------------------------------------------------------------------------
alter table public.automation_settings
  add column if not exists stock_alert_notification boolean not null default true,
  add column if not exists low_stock_notification_template text not null default 'Stok rendah di {store}. Batas: {threshold}.\n{items}',
  add column if not exists last_stock_alert_at timestamptz,
  add column if not exists last_stock_alert_signature text;

-- --------------------------------------------------------------------------
-- C. SAFE PUBLIC WHATSAPP PREFILL
-- Exposes ONLY the storefront prefill fields, never admin recipients/templates.
-- --------------------------------------------------------------------------
create or replace function public.get_public_whatsapp_prefill()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'enabled', coalesce(a.auto_reply_enabled, false),
    'message', coalesce(a.auto_reply_message, ''),
    'whatsapp', coalesce(s.whatsapp, ''),
    'store_name', coalesce(s.name, '')
  )
  from public.stores s
  left join lateral (
    select auto_reply_enabled, auto_reply_message
    from public.automation_settings x
    where x.store_id = s.id
    order by x.created_at asc nulls last, x.id
    limit 1
  ) a on true
  where s.id = public.get_single_store_id()
  limit 1
$$;

revoke all on function public.get_public_whatsapp_prefill() from public;
grant execute on function public.get_public_whatsapp_prefill() to anon, authenticated;

commit;
