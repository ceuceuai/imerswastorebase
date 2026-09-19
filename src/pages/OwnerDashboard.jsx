import DashboardShell from '../components/DashboardShell'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'
import { compactNumber, rupiah } from '../lib/format'
import {
  Banknote, Boxes, PackageCheck, ShoppingCart, ArrowRight, PlusCircle,
  MonitorSmartphone, ClipboardList, Tags, TicketPercent, Truck, FileText,
  Palette, Sparkles, TrendingUp, PackageSearch
} from 'lucide-react'
import { useAdminTheme } from '../context/AdminThemeContext'

function dayKey(date){return new Date(date).toISOString().slice(0,10)}

export default function OwnerDashboard(){
  const { store, brand, profile, theme } = useAdminTheme()
  const [products,setProducts]=useState([])
  const [orders,setOrders]=useState([])

  useEffect(()=>{
    if(!supabaseEnabled)return
    ;(async()=>{
      const ctx=await getOwnerContext()
      if(!ctx.storeId)throw new Error('Store owner tidak ditemukan.')
      const [p,o]=await Promise.all([
        supabase.from('products').select('id,name,stock,type,status,cover_image,price').eq('store_id',ctx.storeId),
        supabase.from('orders').select('id,order_number,total_amount,payment_status,status,created_at,source,order_items(product_name,qty,subtotal)').eq('store_id',ctx.storeId).order('created_at',{ascending:false}).limit(300),
      ])
      if(p.error)throw p.error
      if(o.error)throw o.error
      setProducts(p.data||[])
      setOrders(o.data||[])
    })().catch(e=>alert(e.message))
  },[])

  const stats=useMemo(()=>({
    products:products.filter(x=>x.status).length,
    stock:products.filter(x=>x.type==='physical').reduce((n,x)=>n+Number(x.stock||0),0),
    orders:orders.length,
    pending:orders.filter(x=>x.status==='pending').length,
    revenue:orders.filter(x=>x.payment_status==='paid').reduce((n,x)=>n+Number(x.total_amount||0),0),
  }),[products,orders])

  const chart=useMemo(()=>{
    const days=[]
    for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push(d)}
    const rows=days.map(d=>({
      label:new Intl.DateTimeFormat('id-ID',{weekday:'short'}).format(d),
      value:orders.filter(o=>o.payment_status==='paid'&&dayKey(o.created_at)===dayKey(d)).reduce((n,o)=>n+Number(o.total_amount||0),0)
    }))
    const max=Math.max(...rows.map(x=>x.value),1)
    return rows.map(x=>({...x,pct:Math.max(4,Math.round((x.value/max)*100))}))
  },[orders])

  const topProducts=useMemo(()=>{
    const map=new Map()
    orders.forEach(o=>(o.order_items||[]).forEach(i=>{
      const key=i.product_name||'Produk'
      const cur=map.get(key)||{name:key,qty:0,sales:0}
      cur.qty+=Number(i.qty||0);cur.sales+=Number(i.subtotal||0);map.set(key,cur)
    }))
    return [...map.values()].sort((a,b)=>b.qty-a.qty).slice(0,5)
  },[orders])

  const hasRevenue = chart.some(x=>x.value>0)
  const storeName=brand?.app_name||store?.name||'iMersWAStore'
  const ownerName=profile?.full_name||'Owner'
  const welcomeGradient=theme?.card_1||'linear-gradient(135deg,#0f766e 0%,#10b981 100%)'

  const quickActions=[
    {to:'/owner/orders',icon:ClipboardList,title:'Pesanan Masuk',desc:'Cek order baru & proses pembayaran',tone:'one'},
    {to:'/owner/pos',icon:MonitorSmartphone,title:'Kasir POS',desc:'Transaksi cepat untuk penjualan offline',tone:'two'},
    {to:'/owner/inventory',icon:Boxes,title:'Inventory & HPP',desc:'Kelola stok masuk, keluar dan HPP',tone:'three'},
    {to:'/owner/categories',icon:Tags,title:'Kategori Produk',desc:'Rapikan katalog dengan kategori',tone:'four'},
    {to:'/owner/coupons',icon:TicketPercent,title:'Kupon & Promo',desc:'Buat promo dan kode diskon toko',tone:'two'},
    {to:'/owner/shipping',icon:Truck,title:'Pengaturan Ongkir',desc:'Atur kurir dan biaya pengiriman',tone:'one'},
    {to:'/owner/articles',icon:FileText,title:'Artikel & Blog',desc:'Kelola konten untuk storefront',tone:'three'},
    {to:'/owner/settings',icon:Palette,title:'Tema White Label',desc:'Ganti warna dan identitas dashboard',tone:'four'},
  ]

  return <DashboardShell title="Dashboard" subtitle="Ringkasan operasional toko, penjualan dan stok dalam satu layar.">
    <section className="dashboard-welcome dashboard-welcome-v2" style={{'--welcome-gradient':welcomeGradient}}>
      <div className="welcome-glow welcome-glow-a"/><div className="welcome-glow welcome-glow-b"/>
      <div className="dashboard-welcome-copy">
        <span className="eyebrow"><Sparkles size={13}/> WHITE LABEL COMMERCE</span>
        <h2>Selamat datang kembali, {ownerName}! 👋</h2>
        <p><b>{storeName}</b> sudah siap dikelola. Pantau penjualan, stok, POS, artikel, promo dan tema toko dari satu dashboard.</p>
        <div className="welcome-mini-stats">
          <span><TrendingUp size={14}/><b>{rupiah(stats.revenue)}</b><small>Pendapatan</small></span>
          <span><ShoppingCart size={14}/><b>{stats.orders}</b><small>Total Order</small></span>
          <span><PackageSearch size={14}/><b>{stats.products}</b><small>Produk Aktif</small></span>
        </div>
      </div>
      <div className="welcome-actions">
        <Link to="/owner/products"><PlusCircle size={15}/> Tambah Produk</Link>
        <Link className="secondary" to="/owner/pos"><MonitorSmartphone size={15}/> Buka POS</Link>
      </div>
    </section>

    <div className="metric-grid dashboard-metrics-v2">
      <div className="metric"><Banknote/><span>Pendapatan Paid</span><strong>{rupiah(stats.revenue)}</strong><small>Akumulasi order lunas</small></div>
      <div className="metric"><ShoppingCart/><span>Total Order</span><strong>{stats.orders}</strong><small>{stats.pending} masih pending</small></div>
      <div className="metric"><PackageCheck/><span>Katalog Aktif</span><strong>{stats.products}</strong><small>Produk siap dijual</small></div>
      <div className="metric"><Boxes/><span>Stok Fisik</span><strong>{compactNumber(stats.stock)}</strong><small>Total unit tersedia</small></div>
    </div>

    <div className="dash-grid-2 dashboard-insight-grid">
      <div className="dash-panel insight-panel revenue-panel">
        <div className="panel-head"><div><span className="panel-kicker">PERFORMA</span><h2>Grafik Pendapatan 7 Hari</h2><p>Order dengan payment status paid.</p></div><Link className="btn-outline" to="/owner/reports">Lihat Report <ArrowRight size={14}/></Link></div>
        {hasRevenue?<div className="dashboard-chart">{chart.map(x=><div className="chart-col" key={x.label}><div className="chart-bar-wrap"><div className="chart-value">{x.value?rupiah(x.value):''}</div><div className="chart-bar" style={{height:`${x.pct}%`}}/></div><small>{x.label}</small></div>)}</div>:
        <div className="chart-zero-state"><div className="zero-visual"><TrendingUp/><i/><i/><i/><i/><i/></div><b>Belum ada pendapatan 7 hari terakhir</b><span>Grafik otomatis terisi setelah ada order berstatus paid.</span><Link to="/owner/pos">Buat transaksi POS <ArrowRight size={13}/></Link></div>}
      </div>
      <div className="dash-panel insight-panel best-product-panel">
        <div className="panel-head"><div><span className="panel-kicker">TOP SELLER</span><h2>Produk Terlaris</h2><p>Berdasarkan kuantitas order yang tercatat.</p></div></div>
        <div className="quick-list">{topProducts.length?topProducts.map((p,i)=><div className="quick-list-item" key={p.name}><div className="quick-icon">{i+1}</div><div><b>{p.name}</b><small>{p.qty} unit terjual</small></div><strong>{rupiah(p.sales)}</strong></div>):<div className="product-zero-state"><div className="product-zero-icon"><PackageCheck/></div><b>Belum ada produk terlaris</b><span>Ranking otomatis muncul setelah transaksi pertama.</span><Link to="/owner/products">Kelola produk <ArrowRight size={13}/></Link></div>}</div>
      </div>
    </div>

    <section className="quick-access-section">
      <div className="quick-access-head">
        <div><span className="panel-kicker">AKSES CEPAT</span><h2>Operasional Harian</h2><p>Buka modul yang paling sering digunakan tanpa cari-cari menu di sidebar.</p></div>
        <Link to="/owner/settings" className="quick-theme-link"><Palette size={15}/> Atur Tema Dashboard</Link>
      </div>
      <div className="quick-access-grid">
        {quickActions.map(({to,icon:Icon,title,desc,tone})=><Link className={`quick-access-card tone-${tone}`} to={to} key={to}>
          <div className="quick-access-icon"><Icon/></div>
          <div className="quick-access-copy"><b>{title}</b><span>{desc}</span></div>
          <div className="quick-access-arrow"><ArrowRight/></div>
        </Link>)}
      </div>
    </section>
  </DashboardShell>
}
