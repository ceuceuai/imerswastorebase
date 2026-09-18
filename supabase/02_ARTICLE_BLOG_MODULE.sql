-- ============================================================
-- iMersWAStore Base - Step 19 Article & Blog Module
-- Safe additive migration for existing Step 1-18 backend.
-- Creates article/blog storage, indexes, RLS, grants, and starter data.
-- ============================================================

begin;

create table if not exists public.articles (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  slug text not null,
  excerpt text,
  content text,
  cover_image_url text,
  author_name text default 'Admin',
  featured boolean not null default false,
  status boolean not null default true,
  published_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_store_slug_unique unique (store_id, slug)
);

-- Compatibility if the table already existed in an earlier experiment.
alter table public.articles add column if not exists store_id uuid references public.stores(id) on delete cascade;
alter table public.articles add column if not exists title text;
alter table public.articles add column if not exists slug text;
alter table public.articles add column if not exists excerpt text;
alter table public.articles add column if not exists content text;
alter table public.articles add column if not exists cover_image_url text;
alter table public.articles add column if not exists author_name text default 'Admin';
alter table public.articles add column if not exists featured boolean not null default false;
alter table public.articles add column if not exists status boolean not null default true;
alter table public.articles add column if not exists published_at timestamptz default now();
alter table public.articles add column if not exists created_at timestamptz not null default now();
alter table public.articles add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_articles_store_status_published
  on public.articles (store_id, status, published_at desc);
create index if not exists idx_articles_store_featured
  on public.articles (store_id, featured, published_at desc);
create index if not exists idx_articles_slug
  on public.articles (store_id, slug);

alter table public.articles enable row level security;

drop policy if exists "public view published articles" on public.articles;
create policy "public view published articles"
on public.articles
for select
to anon, authenticated
using (
  status = true
  and (published_at is null or published_at <= now())
);

drop policy if exists "owner manage own store articles" on public.articles;
create policy "owner manage own store articles"
on public.articles
for all
to authenticated
using (
  store_id in (
    select p.store_id
    from public.profiles p
    where p.id = auth.uid()
  )
)
with check (
  store_id in (
    select p.store_id
    from public.profiles p
    where p.id = auth.uid()
  )
);

-- PostgREST table privileges. RLS remains the final access boundary.
grant select on public.articles to anon;
grant select, insert, update, delete on public.articles to authenticated;

-- Starter content for the current iMersWAStore Base store.
-- The INSERTs are idempotent through the store_id + slug check.
insert into public.articles
  (store_id, title, slug, excerpt, content, cover_image_url, author_name, featured, status, published_at)
select
  s.id,
  '7 Tips Belanja Online Lebih Aman dan Nyaman',
  'tips-belanja-online-aman',
  'Panduan sederhana sebelum checkout agar transaksi lebih nyaman, aman, dan sesuai kebutuhan.',
  E'Belanja online akan terasa lebih nyaman kalau Anda melakukan beberapa pengecekan sederhana sebelum checkout.\n\n1. Periksa detail produk dan variasinya.\n2. Pastikan nomor WhatsApp atau email yang digunakan aktif.\n3. Simpan bukti pembayaran.\n4. Baca informasi pengiriman atau proses produk digital.\n\nButuh bantuan? Hubungi toko melalui tombol WhatsApp yang tersedia di halaman toko.',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80',
  'iMersWAStore',
  true,
  true,
  now()
from public.stores s
where s.id = '29b564aa-90e6-4c2e-8f1f-a307d5d2ad41'::uuid
  and not exists (
    select 1 from public.articles a
    where a.store_id = s.id and a.slug = 'tips-belanja-online-aman'
  );

insert into public.articles
  (store_id, title, slug, excerpt, content, cover_image_url, author_name, featured, status, published_at)
select
  s.id,
  'Produk Digital: Praktis, Cepat, dan Bisa Diproses Instan',
  'produk-digital-transaksi-instan',
  'Kenali cara kerja pulsa, paket data, token PLN, voucher, dan produk digital sebelum membeli.',
  E'Produk digital tidak membutuhkan pengiriman fisik. Data transaksi seperti nomor HP, ID pelanggan, atau tujuan top up harus diisi dengan benar agar proses berjalan lancar.\n\nSelalu periksa kembali data tujuan sebelum menyelesaikan pesanan.',
  'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80',
  'iMersWAStore',
  true,
  true,
  now() - interval '1 day'
from public.stores s
where s.id = '29b564aa-90e6-4c2e-8f1f-a307d5d2ad41'::uuid
  and not exists (
    select 1 from public.articles a
    where a.store_id = s.id and a.slug = 'produk-digital-transaksi-instan'
  );

insert into public.articles
  (store_id, title, slug, excerpt, content, cover_image_url, author_name, featured, status, published_at)
select
  s.id,
  'Cara Memilih Produk yang Sesuai Kebutuhan',
  'cara-memilih-produk-sesuai-kebutuhan',
  'Jangan hanya melihat harga. Bandingkan fungsi, kebutuhan, dan detail produk sebelum membeli.',
  E'Sebelum membeli, tentukan kebutuhan utama Anda lalu bandingkan fitur, harga, dan informasi produk. Gunakan kolom pencarian dan kategori untuk menemukan produk yang paling relevan.',
  'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1200&q=80',
  'iMersWAStore',
  false,
  true,
  now() - interval '2 days'
from public.stores s
where s.id = '29b564aa-90e6-4c2e-8f1f-a307d5d2ad41'::uuid
  and not exists (
    select 1 from public.articles a
    where a.store_id = s.id and a.slug = 'cara-memilih-produk-sesuai-kebutuhan'
  );

commit;
