# iMersWAStore Base v5 — SINGLE STORE Master Menu Map

> Scope wajib: **1 aplikasi = 1 toko**. `store_id` tetap ada sebagai foreign key kompatibilitas database, bukan fitur multi-toko.

## Storefront
- Beranda marketplace + hero/banner
- Featured Promo
- Kategori Fisik & Digital
- Produk Fisik
- Pulsa/Data/Token/Top Up/Voucher/Digital
- Detail produk: multi Image URL, Video URL, rich description, tombol custom
- Variant, unit, berat, stok
- Artikel & Blog
- Tentang Kami
- Popup promo + banner tengah + announcement
- Cart + Checkout V2
- Kupon, PPN, service fee
- Ongkir Manual + RajaOngkir/Komerce
- Bank/E-Wallet/QRIS/COD
- Konfirmasi Pembayaran
- Cek Status Pesanan
- Register pelanggan, Login, Forgot/Reset Password, akun pelanggan
- Terms & Privacy
- SEO + OG + favicon + GA/Meta Pixel/TikTok Pixel

## Dashboard Owner / Staff
### Penjualan
- Dashboard
- Pesanan Masuk
- Konfirmasi Bayar
- Kasir POS

### Katalog & Konten
- Katalog Produk
- Kategori Produk
- Kupon & Promo
- Artikel & Blog (Quill)

### Pelanggan & Promosi
- CRM Pelanggan + tag + notes
- Broadcast WhatsApp & Email
- Marketing & SEO

### Operasional
- Inventory & Moving Average HPP
- Ongkir Manual
- Pembayaran & Rekening
- Manajemen Kasir/Staff + Supabase Auth invite + permission
- Profit Report

### Sistem
- Integrasi WhatsApp
- Integrasi Email
- RajaOngkir/Komerce
- White-label & Theme Engine
- Video Panduan

## Theme / White Label
Semua hanya untuk satu toko aktif:
- Logo + favicon + nama toko
- Primary/accent/sidebar/background
- 4 gradient metric cards
- Radius, shadow, font, density
- Hero storefront
- Marketing sections

## Staff Permission
- `pos`
- `orders`
- `products`
- `inventory`
- `reports`

Owner/Admin punya akses penuh. Staff hanya melihat menu yang diizinkan.
