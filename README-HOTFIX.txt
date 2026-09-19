iMersWAStore Base - HOTFIX Dashboard GAS Parity v1

Tujuan:
- Mengganti dashboard teknis/minimal menjadi dashboard operasional dengan tampilan dan struktur visual mengikuti versi GAS.
- Tidak mengubah database.
- Tidak perlu SQL baru.

File yang di-replace ke repo GitHub:
1. src/components/DashboardShell.jsx
2. src/pages/OwnerDashboard.jsx
3. Tambahkan blok CSS dari file dashboard-gas-parity.css ke bagian paling bawah src/styles.css

Setelah commit, Vercel akan redeploy otomatis.

Catatan:
Hotfix ini memperbaiki halaman dashboard utama + shell/sidebar.
Modul GAS yang belum ada sebagai route Supabase (Manajemen Kasir, Kategori Produk, Kupon, Ongkos Kirim, Pesanan, POS, Video Panduan) perlu dimigrasikan sebagai tahap berikutnya agar 1:1 secara fitur.
