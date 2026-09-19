# Supabase migration order

Database project ini sudah mempunyai Step 1–21.

Untuk release v5 Single Store, **jalankan hanya migration baru berikut setelah Step 21**:

`04_STEP22_SINGLE_STORE_FULL_COMMERCE_SUITE.sql`

Jangan menjalankan `00_base_full.sql` dari prototype lama pada database existing.

Setelah SQL sukses, deploy Edge Functions di folder `supabase/functions/`.
