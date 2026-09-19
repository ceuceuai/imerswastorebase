# iMersWAStore Base v5.5 - Final Essentials (Single Store)

Scope remains SINGLE STORE. No Secret Tap Login.

Added/completed:
- Owner change password from Dashboard > Pengaturan > Keamanan (current password verification).
- Dynamic Social Media: add/edit/delete/unlimited links per store.
- WhatsApp storefront prefill: the old GAS "Auto Reply" is correctly treated as opening text for Chat Kami and post-checkout WhatsApp.
- Real low-stock alerts: online checkout, POS, inventory movement, and product stock editing trigger stock checks; alerts can be sent via configured WA/email. Duplicate identical alerts are throttled for 6 hours.
- Footer & Legal: dynamic Disclaimer, Syarat & Ketentuan, Privacy Policy, footer disclaimer text, and social links.
- Legal content uses the existing Quill rich text editor.
- Integration screen includes a manual "Test Notifikasi Stok Rendah" action.

Database:
Run `supabase/05_STEP24_FINAL_ESSENTIALS_SINGLE_STORE.sql` once after Step 23.

Edge Functions that must be deployed/redeployed after this patch:
- integration-test
- broadcast-dispatch
- order-notify
- shipping-rates
- staff-invite
- stock-alert (NEW)

Important:
- Homepage structure/design is not redesigned by this release.
- StoreHeader only changes the WhatsApp link to include the configured prefill text.
- Footer gains the required legal/social content.
