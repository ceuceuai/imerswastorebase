# iMersWAStore Base Frontend — Existing Supabase Sync

React + Vite frontend yang sudah disesuaikan dengan backend Supabase iMersWAStore existing (Step 1–16), bukan database foundation baru.

## Penting

JANGAN jalankan SQL foundation dari package frontend lama. Backend existing tetap menjadi master.

Jalankan hanya:

`supabase/01_EXISTING_BACKEND_FRONTEND_COMPATIBILITY.sql`

Patch tersebut additive dan tidak membuat ulang 33 core table yang sudah ada.

## Fitur frontend

- Marketplace Home responsive
- Featured Promo
- Produk fisik dipisah dari Produk Digital / Pulsa / Token / Top Up
- Product Quick View
- Multi Image URL melalui `product_media`
- Video URL melalui `product_media`
- Hyperlink description format `[Teks](https://url.com)`
- Optional button detail menggunakan `products.button_text` + `products.preview_url`
- Visual Digital Transaction Field Builder
- Cart localStorage + secure public checkout RPC
- Supabase Auth owner login
- Dashboard Owner
- Product CRUD + search/filter/pagination/page size
- Inventory + moving-average HPP via RPC
- Profit report berdasarkan `orders` + `order_items`
- White-label settings dari `stores`, `brand_settings`, `store_settings`
- Vercel + Netlify SPA rewrite

## Setup

1. Jalankan SQL compatibility patch di Supabase SQL Editor.
2. Copy `.env.example` menjadi `.env`.
3. Isi:

```env
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_STORE_ID=...
```

4. Jalankan:

```bash
npm install
npm run dev
```

## Kenapa perlu VITE_STORE_ID?

Backend existing bersifat multi-store dan tabel produk/kategori memakai `store_id`. Storefront publik harus memfilter satu toko tertentu supaya data antar toko tidak tercampur.

## Keamanan

Gunakan anon/publishable key saja di frontend. Jangan pernah menaruh `service_role`, secret key, database password, atau personal access token di source/browser.

## Supabase project connection

This package is configured locally via `.env.local` for the existing iMersWAStore Base Supabase project. For Vercel, add the same `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_STORE_ID` in Project Settings → Environment Variables. Do not add a service-role/secret key to the frontend.
