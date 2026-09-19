iMersWAStore Base - Step 21 White Label Theme Engine & Admin Operations
=======================================================================

URUTAN INSTALL:
1. Supabase > SQL Editor > New Query.
2. Paste isi supabase/03_STEP21_WHITE_LABEL_ADMIN_OPERATIONS.sql.
3. Save query dengan nama:
   iMersWAStore Base - Step 21 White Label Theme Engine & Admin Operations
4. Klik Run. Target: Success. No rows returned.
5. Upload/replace source frontend ke repository GitHub.
6. Vercel akan redeploy otomatis.
7. Hard refresh dashboard (Ctrl+F5).

YANG DITAMBAHKAN:
- Theme Engine dashboard per store / tenant.
- 6 preset tema + custom warna/gradient/font/radius/shadow/density.
- Sidebar/menu admin lebih lengkap dan premium.
- Dashboard chart + quick actions + top products.
- Orders management.
- POS real via Supabase RPC.
- Category CRUD.
- Coupon CRUD + validation RPC.
- Shipping CRUD.
- Staff registry + permission.
- Video guide CRUD.
- Shared admin UI design system sehingga Inventory, Product, Article, Report ikut tampil konsisten.

CATATAN:
- Tidak perlu menjalankan 00_base_full.sql.
- Step 21 hanya untuk database existing yang sudah sampai Step 20.
- Login/invite staff Supabase Auth akan disambungkan di fase berikutnya; registry role/permission sudah siap.
