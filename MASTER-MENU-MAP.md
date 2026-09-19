# iMersWAStore Base — Admin Menu Map (Supabase)

## Sudah aktif di frontend + backend
- Dashboard premium
- Pesanan Masuk
- Kasir POS
- Katalog Produk
- Kategori Produk
- Kupon & Promo
- Artikel & Blog (Quill rich text)
- Inventory & HPP
- Ongkir
- Manajemen Kasir / Staff Registry
- Profit Report
- Pengaturan Toko + White Label Dashboard Theme Engine
- Video Panduan

## White Label Theme Engine
Tema disimpan per toko pada `brand_settings.dashboard_theme` dan memengaruhi dashboard tenant saja.
Tersedia preset: Emerald Pro, Ocean Blue, Royal Purple, Sunset Commerce, Midnight Premium, Rose Boutique.
Owner dapat mengganti primary/accent, sidebar, background, surface, 4 gradient card statistik, radius, font, shadow dan density.

## Catatan lanjutan
- Registry staff dan permission sudah tersedia. Login/invite staff via Supabase Auth Admin/Edge Function belum diaktifkan pada patch ini.
- Kupon CRUD + RPC validasi sudah tersedia. Penerapan diskon ke checkout online akan disambungkan pada fase checkout/payment berikutnya.
- POS sudah memakai RPC atomic untuk order, order item, pengurangan stok fisik dan inventory movement.
