# Project Status — iMersWAStore Existing Supabase Sync

Snapshot backend yang dipakai untuk sinkronisasi:
- 33 public tables
- 299 columns
- 41 RLS policies
- 7 functions
- 3 triggers
- 6 views
- 2 storage buckets

## Sudah disinkronkan
- [x] `products.type` → UI `product_type`
- [x] `products.hpp` → UI HPP
- [x] `products.cover_image` → image utama
- [x] `products.status` → active state
- [x] `product_media` → multi image/video URL
- [x] `categories.type/status` → kategori storefront
- [x] `inventory_transactions` → inventory dashboard
- [x] `orders.total_amount` → dashboard/report
- [x] `stores` + `brand_settings` + `store_settings` → white label
- [x] Secure public checkout RPC compatibility
- [x] Moving-average HPP RPC compatibility
- [x] Digital transaction input fields
- [x] Search/filter/pagination/page-size

## SQL compatibility menambah field minimal
- `products.sku`
- `products.compare_at_price`
- `products.badge`
- `products.input_schema`
- `order_items.customer_inputs`
- `store_settings.tagline`
- `store_settings.announcement_text`

Core table existing tidak dibuat ulang.

- Supabase frontend environment configured for the existing project.
- Store context configured with existing store UUID from the owner profile setup.
- `.env.local` is git-ignored so it is not committed accidentally.
