export const demoSettings = {
  store_name: 'iMersWAStore',
  tagline: 'Belanja Mudah, Untung Setiap Hari',
  logo_url: '',
  primary_color: '#0f67ff',
  accent_color: '#7c3aed',
  whatsapp: '6281234567890',
  announcement_text: '🔥 Promo Spesial Bulan Ini! Dapatkan diskon hingga 50% untuk produk pilihan!',
  hero_title: 'Solusi Lengkap Kebutuhan Digital & Harian',
  hero_subtitle: 'Produk fisik, digital, pulsa, paket data, token PLN dan layanan lain dalam satu toko.',
  hero_image_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80',
  footer_text: '© iMersWAStore. Powered by iMersnesia.',
}

export const demoCategories = [
  { id: 'c1', name: 'Fashion', slug: 'fashion', group_type: 'physical', icon: '👕' },
  { id: 'c2', name: 'Beauty', slug: 'beauty', group_type: 'physical', icon: '💄' },
  { id: 'c3', name: 'Elektronik', slug: 'elektronik', group_type: 'physical', icon: '💻' },
  { id: 'c4', name: 'Rumah Tangga', slug: 'rumah-tangga', group_type: 'physical', icon: '🛋️' },
  { id: 'c5', name: 'Pulsa', slug: 'pulsa', group_type: 'digital', icon: '📱' },
  { id: 'c6', name: 'Paket Data', slug: 'paket-data', group_type: 'digital', icon: '📶' },
  { id: 'c7', name: 'Token PLN', slug: 'token-pln', group_type: 'digital', icon: '⚡' },
  { id: 'c8', name: 'Voucher Game', slug: 'voucher-game', group_type: 'digital', icon: '🎮' },
]

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`
export const demoProducts = [
  {
    id: 'p1', name: 'Glow Serum Brightening', slug: 'glow-serum-brightening', sku: 'SERUM-001',
    product_type: 'physical', category_id: 'c2', category: { name: 'Beauty', slug: 'beauty' },
    price: 89000, compare_at_price: 129000, stock: 24, avg_cost: 42000, featured: true, active: true,
    image_url: img('photo-1620916566398-39f1143ab7be'),
    gallery_images: [img('photo-1620916566398-39f1143ab7be'), img('photo-1608248597279-f99d160bfcbc')],
    video_urls: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    description: 'Serum harian dengan tekstur ringan.\nBaca [panduan pemakaian](https://example.com/panduan) sebelum penggunaan.',
    detail_button_label: 'Lihat Panduan Produk', detail_button_url: 'https://example.com/panduan', badge: 'Best Seller', input_schema: []
  },
  {
    id: 'p2', name: 'TWS Pro X7', slug: 'tws-pro-x7', sku: 'TWS-X7', product_type: 'physical', category_id: 'c3', category: { name: 'Elektronik', slug: 'elektronik' },
    price: 159000, compare_at_price: 249000, stock: 17, avg_cost: 93000, featured: true, active: true,
    image_url: img('photo-1606220945770-b5b6c2c55bf1'), gallery_images: [img('photo-1606220945770-b5b6c2c55bf1')], video_urls: [],
    description: 'Bluetooth 5.3, charging case ringkas, cocok untuk aktivitas harian.', badge: 'Promo', input_schema: []
  },
  {
    id: 'p3', name: 'Air Fryer Digital 5L', slug: 'air-fryer-digital-5l', sku: 'AF-5L', product_type: 'physical', category_id: 'c4', category: { name: 'Rumah Tangga', slug: 'rumah-tangga' },
    price: 349000, compare_at_price: 499000, stock: 8, avg_cost: 260000, featured: true, active: true,
    image_url: img('photo-1648091856657-430bd2bd1f5c'), gallery_images: [img('photo-1648091856657-430bd2bd1f5c')], video_urls: [], description: 'Kapasitas 5L dengan panel digital.', badge: 'Diskon 30%', input_schema: []
  },
  {
    id: 'p4', name: 'Ebook Rahasia Bisnis Online', slug: 'ebook-rahasia-bisnis-online', sku: 'EBOOK-001', product_type: 'digital', category_id: 'c8', category: { name: 'Digital', slug: 'digital' },
    price: 49000, compare_at_price: 99000, stock: 9999, avg_cost: 0, featured: true, active: true,
    image_url: img('photo-1544716278-ca5e3f4abd8c'), gallery_images: [img('photo-1544716278-ca5e3f4abd8c')], video_urls: [], description: 'Produk digital. Pengiriman mengikuti instruksi toko.', badge: 'Baru', input_schema: []
  },
  {
    id: 'p5', name: 'Top Up Mobile Legends', slug: 'top-up-mobile-legends', sku: 'ML-001', product_type: 'game_topup', category_id: 'c8', category: { name: 'Voucher Game', slug: 'voucher-game' },
    price: 1000, compare_at_price: null, stock: 9999, avg_cost: 850, featured: true, active: true,
    image_url: img('photo-1542751371-adc38448a05e'), gallery_images: [img('photo-1542751371-adc38448a05e')], video_urls: [], description: 'Mulai Rp1.000. Pilih nominal dan masukkan User ID.', badge: 'Terlaris',
    input_schema: [{ name:'user_id', label:'User ID', type:'text', required:true }, { name:'server_id', label:'Server ID', type:'text', required:true }]
  },
  {
    id: 'p6', name: 'Token PLN 20.000', slug: 'token-pln-20000', sku: 'PLN20', product_type: 'pln_token', category_id: 'c7', category: { name: 'Token PLN', slug: 'token-pln' },
    price: 22000, compare_at_price: null, stock: 9999, avg_cost: 20500, featured: true, active: true,
    image_url: img('photo-1473341304170-971dccb5ac1e'), gallery_images: [img('photo-1473341304170-971dccb5ac1e')], video_urls: [], description: 'Masukkan nomor meter / ID pelanggan dengan benar.', badge: 'Populer',
    input_schema: [{ name:'meter_no', label:'Nomor Meter / ID Pelanggan', type:'text', required:true }]
  },
  {
    id: 'p7', name: 'Paket Data 10GB', slug: 'paket-data-10gb', sku: 'DATA10', product_type: 'pulsa_data', category_id: 'c6', category: { name: 'Paket Data', slug: 'paket-data' },
    price: 35000, compare_at_price: null, stock: 9999, avg_cost: 31500, featured: false, active: true,
    image_url: img('photo-1516321318423-f06f85e504b3'), gallery_images: [img('photo-1516321318423-f06f85e504b3')], video_urls: [], description: 'Paket data diproses manual oleh toko setelah pembayaran.',
    input_schema: [{ name:'phone', label:'Nomor HP Tujuan', type:'phone', required:true }, { name:'operator', label:'Operator', type:'select', required:true, options:['Telkomsel','Indosat','XL/Axis','Tri','Smartfren'] }]
  },
  {
    id: 'p8', name: 'Kaos Oversize Premium', slug: 'kaos-oversize-premium', sku: 'TSHIRT-OS', product_type: 'physical', category_id: 'c1', category: { name: 'Fashion', slug: 'fashion' },
    price: 89000, compare_at_price: null, stock: 31, avg_cost: 47000, featured: false, active: true,
    image_url: img('photo-1521572163474-6864f9cf17ab'), gallery_images: [img('photo-1521572163474-6864f9cf17ab')], video_urls: [], description: 'Cotton combed premium, cutting oversize.', input_schema: []
  },
]
