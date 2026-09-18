# Supabase untuk project ini

Project ini **bukan** untuk database kosong. Backend Supabase iMersWAStore yang sudah ada (Step 1–16) tetap menjadi master.

Jangan jalankan SQL foundation lama dari package frontend sebelumnya.

Jalankan hanya:

`01_EXISTING_BACKEND_FRONTEND_COMPATIBILITY.sql`

Patch ini additive: menambah field frontend yang belum ada, public read policy untuk storefront, secure checkout RPC, dan inventory RPC. Core table existing tidak dibuat ulang.
