# iMersWAStore Base v5 — SINGLE STORE Full Commerce Suite

React + Vite + Supabase untuk **satu toko**. Ini bukan SaaS multi-tenant dan tidak membuat toko baru saat customer register.

## Yang sudah disambungkan
- Storefront marketplace + physical/digital product engine
- Product variant, multi-image URL, video URL, digital input field
- Cart + Checkout V2
- Customer Auth: register/login/forgot/reset/account
- Orders, POS, Inventory/HPP, Profit Report
- Categories, coupons, articles Quill
- Customer CRM + tag/notes
- Bank/E-Wallet/QRIS/COD
- Payment confirmation + public order tracking
- Manual shipping + RajaOngkir/Komerce integration
- WhatsApp gateway + Email integration settings
- Broadcast queue WhatsApp/Email
- Staff invite Supabase Auth + role/permission
- SEO/OG/favicon + Google Analytics/Meta Pixel/TikTok Pixel
- Popup promo, banner tengah, About Us, social, Terms/Privacy
- White-label dashboard Theme Engine untuk satu toko

## Environment Variables Vercel
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_STORE_ID=...
```
Jangan taruh `service_role` di frontend/Vite.

## Database upgrade
Database existing harus sudah menjalankan Step 1–21. Lalu jalankan:

`supabase/04_STEP22_SINGLE_STORE_FULL_COMMERCE_SUITE.sql`

Nama query yang disarankan:

`iMersWAStore Base - Step 22 SINGLE STORE Full Commerce Suite`

## Edge Functions
Fitur provider eksternal sengaja berjalan server-side supaya API key tidak bocor ke browser.

Deploy lima fungsi:
```bash
supabase functions deploy integration-test
supabase functions deploy broadcast-dispatch
supabase functions deploy shipping-rates --no-verify-jwt
supabase functions deploy order-notify --no-verify-jwt
supabase functions deploy staff-invite
```

`shipping-rates` dibuat public karena dipakai checkout customer, tetapi RajaOngkir API key dibaca dengan service role di Edge Function dan tidak dikirim ke browser.

## Provider
- WhatsApp: Fonnte native; StarSender/WAplus/XSender tersedia melalui configurable endpoint/webhook.
- Email: Mailketing API, SMTP, generic webhook.
- Shipping: Manual atau RajaOngkir/Komerce.

## Catatan validasi release
- JS/JSX/TS syntax diparse dengan TypeScript compiler.
- Relative import diperiksa.
- ZIP integrity diperiksa.
- `npm install` di environment generator timeout saat mengambil dependency, sehingga production `npm run build` belum diklaim terverifikasi di sini. Vercel akan menjadi build verification aktual.
- API provider eksternal tetap perlu dites dengan credential milik toko.
