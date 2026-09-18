# Supabase Schema Audit

Snapshot CSV berhasil dibaca.

## Backend existing
- 33 tabel public
- 299 kolom
- 37 index
- 41 RLS policy
- 93 constraint
- 7 function
- 3 trigger
- 6 view
- 2 storage bucket (`brand-assets`, `product-media`)

## Mismatch utama frontend lama vs backend existing

1. Frontend lama memakai `products.product_type`, backend memakai `products.type`.
2. Frontend lama memakai `products.avg_cost`, backend memakai `products.hpp`.
3. Frontend lama memakai `products.image_url`, backend memakai `products.cover_image` + `product_media`.
4. Frontend lama memakai `products.active`, backend memakai `products.status`.
5. Frontend lama memakai `categories.group_type/active`, backend memakai `categories.type/status`.
6. Frontend lama memakai `inventory_movements`, backend memakai `inventory_transactions`.
7. Frontend lama memakai `orders.grand_total`, backend memakai `orders.total_amount`.
8. Frontend lama mengharapkan `v_profit_orders`; backend existing menyediakan summary views yang berbeda.
9. Frontend lama mengharapkan RPC `create_store_order`; snapshot existing belum memilikinya.
10. White label existing dipisah ke `stores`, `brand_settings`, dan `store_settings`.

Package Supabase-Sync sudah diubah mengikuti backend existing dan menyediakan satu compatibility patch additive.
