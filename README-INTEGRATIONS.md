# iMersWAStore Base — Integration Hotfix (Single Store)

Hotfix ini dibuat dari audit langsung source GAS `iMersWAStore-Bisnis-GAS-v1.2-FULL-UPDATE-PACK` dan master frontend Supabase saat ini.

## WhatsApp provider — endpoint & payload GAS asli

- Fonnte: `https://api.fonnte.com/send`
  - Header: `Authorization: TOKEN`
  - Body form: `target`, `message`
- WAplus: `https://app.waplus.id/send-message`
  - JSON: `api_key`, `sender`, `number`, `message`
  - `sender` wajib
- StarSender: `https://api.starsender.online/api/send`
  - Header: `Authorization: DEVICE_API_KEY`
  - JSON: `messageType: text`, `to`, `body`
- XSender: `https://xsender.id/send-message`
  - JSON: `api_key`, `sender`, `number`, `message`
  - `sender` wajib

`providers.ts` sekarang memakai format di atas, bukan payload generik untuk semua provider.

## Email

Paket GAS v1.2 tidak memiliki Mailketing/SMTP provider; email reset lama menggunakan `MailApp`. Versi Supabase mempertahankan upgrade:

- Mailketing API v1: `https://api.mailketing.co.id/api/v1/send`
- SMTP / email hosting via host + port + username + password
- Generic webhook email

Tombol Test Email menjalankan Edge Function `integration-test`.

## RajaOngkir / Komerce

Base URL: `https://rajaongkir.komerce.id/api/v1/`

- Search destination: `destination/domestic-destination`
- Domestic cost: `calculate/domestic-cost`
- API key tetap di server/Edge Function dan tidak dikirim ke browser.
- Integration Hub sekarang punya Test RajaOngkir.

## Edge Functions yang perlu aktif untuk test fitur

- `integration-test`
- `broadcast-dispatch`
- `order-notify`
- `shipping-rates`
- `staff-invite`

Meng-upload source ke GitHub/Vercel **tidak otomatis mendeploy Supabase Edge Functions**.

Dengan Supabase CLI dari root project:

```bash
supabase functions deploy integration-test
supabase functions deploy broadcast-dispatch
supabase functions deploy order-notify --no-verify-jwt
supabase functions deploy shipping-rates --no-verify-jwt
supabase functions deploy staff-invite
```

Setelah deploy, buka Dashboard Owner → Integrasi WA / Email / RajaOngkir, simpan credential, lalu gunakan tombol Test.

## File frontend yang berubah

- `src/pages/OwnerIntegrations.jsx`

Homepage tidak disentuh.
