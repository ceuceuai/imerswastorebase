-- ============================================================
-- iMersWAStore Base - Step 18 Frontend API Grants & Public Catalog
-- Purpose:
--   Fix PostgREST/Supabase API "permission denied for table ..."
--   after Step 17. RLS policies already control which rows may be used;
--   this step grants the table-level privileges required for the API.
--
-- Safe / additive / idempotent:
--   - Does NOT recreate tables
--   - Does NOT disable RLS
--   - Does NOT grant anonymous write access
-- ============================================================

begin;

-- Supabase API roles must be able to use the public schema.
grant usage on schema public to anon, authenticated;

-- ------------------------------------------------------------
-- PUBLIC STOREFRONT: READ ONLY
-- RLS still limits rows (active store/products/categories, etc.).
-- ------------------------------------------------------------
grant select on table
  public.stores,
  public.store_settings,
  public.brand_settings,
  public.homepage_banners,
  public.featured_products,
  public.products,
  public.categories,
  public.product_media
  to anon, authenticated;

-- ------------------------------------------------------------
-- OWNER / STAFF FRONTEND: READ
-- Access is still restricted by the existing RLS policies.
-- ------------------------------------------------------------
grant select on table
  public.profiles,
  public.orders,
  public.order_items,
  public.inventory_transactions
  to authenticated;

-- ------------------------------------------------------------
-- OWNER / STAFF FRONTEND: CATALOG + BRANDING CRUD
-- RLS remains the security boundary; authenticated users do NOT
-- receive unrestricted cross-store access from these grants alone.
-- ------------------------------------------------------------
grant insert, update, delete on table
  public.products,
  public.categories,
  public.product_media,
  public.brand_settings,
  public.store_settings,
  public.homepage_banners,
  public.featured_products
  to authenticated;

-- Store identity/settings are edited by the owner UI.
grant update on table public.stores to authenticated;

commit;

-- Expected result in SQL Editor:
--   Success. No rows returned
--
-- After running this step, refresh the deployed Vercel storefront.
-- No frontend redeploy is required for this permission fix.
