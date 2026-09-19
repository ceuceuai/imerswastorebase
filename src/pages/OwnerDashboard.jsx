import DashboardShell from '../components/DashboardShell'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'
import { compactNumber, rupiah } from '../lib/format'
import { Banknote, Boxes, PackageCheck, ShoppingCart, ArrowRight, PlusCircle, MonitorSmartphone, ClipboardList } from 'lucide-react'
import { useAdminTheme } from '../context/AdminThemeContext'

function dayKey(date){return new Date(date).toISOString().slice(0,10)}

export default function OwnerDashboard(){
  const { store, brand, profile } = useAdminTheme()
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
    return rows.map(x=>({...x,pct:Math.max(3,Math.round((x.value/max)*100))}))
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

  const storeName=brand?.app_name||store?.name||'iMersWAStore'
  const ownerName=profile?.full_name||'Owner'

  return <DashboardShell title="Dashboard" subtitle="Ringkasan operasional toko, penjualan dan stok dalam satu layar.">
    <section className="dashboard-welcome">
      <div className="dashboard-welcome-copy">
        <span className="eyebrow">⚡ WHITE LABEL COMMERCE</span>
        <h2>Selamat datang kembali, {ownerName}! 👋</h2>
        <p>{storeName} sudah tersambung ke Supabase. Kelola katalog, order, POS, inventory, artikel dan tampilan toko dari dashboard yang sama.</p>
      </div>
      <div className="welcome-actions">
        <Link to="/owner/products"><PlusCircle size={15}/> Tambah Produk</Link>
        <Link className="secondary" to="/owner/pos"><MonitorSmartphone size={15}/> Buka POS</Link>
      </div>
    </section>

    <div className="metric-grid">
      <div className="metric"><Banknote/><span>Pendapatan Paid</span><strong>{rupiah(stats.revenue)}</strong><small>Akumulasi order lunas</small></div>
      <div className="metric"><ShoppingCart/><span>Total Order</span><strong>{stats.orders}</strong><small>{stats.pending} masih pending</small></div>
      <div className="metric"><PackageCheck/><span>Katalog Aktif</span><strong>{stats.products}</strong><small>Produk siap dijual</small></div>
      <div className="metric"><Boxes/><span>Stok Fisik</span><strong>{compactNumber(stats.stock)}</strong><small>Total unit tersedia</small></div>
    </div>

    <div className="dash-grid-2">
      <div className="dash-panel">
        <div className="panel-head"><div><h2>Grafik Pendapatan 7 Hari</h2><p>Order dengan payment status paid.</p></div><Link className="btn-outline" to="/owner/reports">Lihat Report <ArrowRight size={14}/></Link></div>
        <div className="dashboard-chart">{chart.map(x=><div className="chart-col" key={x.label}><div className="chart-bar-wrap"><div className="chart-bar" style={{height:`${x.pct}%`}} title={rupiah(x.value)}/></div><small>{x.label}</small></div>)}</div>
      </div>
      <div className="dash-panel">
        <div className="panel-head"><div><h2>Produk Terlaris</h2><p>Berdasarkan kuantitas order yang tercatat.</p></div></div>
        <div className="quick-list">{topProducts.length?topProducts.map((p,i)=><div className="quick-list-item" key={p.name}><div className="quick-icon">{i+1}</div><div><b>{p.name}</b><small>{p.qty} unit terjual</small></div><strong>{rupiah(p.sales)}</strong></div>):<div className="empty-cell">Belum ada transaksi penjualan.</div>}</div>
      </div>
    </div>

    <div className="dash-panel" style={{marginTop:16}}>
      <div className="panel-head"><div><h2>Akses Cepat Operasional</h2><p>Menu inti yang paling sering dipakai.</p></div></div>
      <div className="feature-checks">
        <Link to="/owner/orders">✓ Pesanan Masuk</Link><Link to="/owner/pos">✓ Kasir POS</Link><Link to="/owner/inventory">✓ Inventory & HPP</Link><Link to="/owner/categories">✓ Kategori Produk</Link><Link to="/owner/coupons">✓ Kupon & Promo</Link><Link to="/owner/shipping">✓ Ongkir</Link><Link to="/owner/articles">✓ Artikel & Blog</Link><Link to="/owner/settings">✓ Tema White Label</Link>
      </div>
    </div>
  </DashboardShell>
}
