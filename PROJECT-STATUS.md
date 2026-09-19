# Project Status — v5 SINGLE STORE Commerce Suite

## Scope
**SINGLE STORE ONLY.** Tidak ada tenant selector, multi-store signup, SaaS super admin, plan/subscription tenant, atau pembuatan store baru dari register.

## Ready in source
- Auth customer lengkap
- Owner/staff unified login routing
- Staff permission-aware dashboard navigation
- Full storefront sections
- Checkout V2
- Coupons/tax/service fee
- Manual shipping + secure RajaOngkir quote token
- Payment methods + confirmation
- Order tracking
- CRM
- Broadcast queue
- WA/Email/Shipping integration hub
- SEO/tracking/legal
- Theme engine / white label

## Requires deployment after Step 22
Supabase Edge Functions:
- `integration-test`
- `broadcast-dispatch`
- `shipping-rates`
- `order-notify`
- `staff-invite`

## External credentials still required for live test
- WhatsApp provider API key/token
- Mailketing API token or SMTP credentials
- RajaOngkir/Komerce API key + origin ID
