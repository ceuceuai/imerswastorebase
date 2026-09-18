import DashboardShell from '../components/DashboardShell'
import { useEffect, useState } from 'react'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'
import { demoProducts } from '../data/demo'
import { compactNumber, rupiah } from '../lib/format'
import { Banknote, Boxes, PackageCheck, ShoppingCart } from 'lucide-react'

export default function OwnerDashboard(){
  const [stats,setStats]=useState({products:demoProducts.length,stock:demoProducts.reduce((n,p)=>n+(p.stock||0),0),orders:12,revenue:5840000})

  useEffect(()=>{
    if(!supabaseEnabled)return
    ;(async()=>{
      const ctx=await getOwnerContext()
      if(!ctx.storeId)throw new Error('Store owner tidak ditemukan.')
      const [p,o]=await Promise.all([
        supabase.from('products').select('id,stock,type,status',{count:'exact'}).eq('store_id',ctx.storeId),
        supabase.from('orders').select('id,total_amount,payment_status,status').eq('store_id',ctx.storeId),
      ])
      if(p.error)throw p.error
      if(o.error)throw o.error
      setStats({
        products:(p.data||[]).filter(x=>x.status).length,
        stock:(p.data||[]).filter(x=>x.type==='physical').reduce((n,x)=>n+Number(x.stock||0),0),
        orders:(o.data||[]).length,
        revenue:(o.data||[]).filter(x=>x.payment_status==='paid').reduce((n,x)=>n+Number(x.total_amount||0),0),
      })
    })().catch(e=>alert(e.message))
  },[])

  return <DashboardShell title="Dashboard Owner" subtitle="Ringkasan operasional toko hari ini.">
    <div className="metric-grid"><div className="metric blue"><PackageCheck/><span>Produk Aktif</span><strong>{stats.products}</strong><small>Siap dijual</small></div><div className="metric purple"><Boxes/><span>Total Stok Fisik</span><strong>{compactNumber(stats.stock)}</strong><small>Produk fisik</small></div><div className="metric orange"><ShoppingCart/><span>Total Order</span><strong>{stats.orders}</strong><small>Seluruh periode</small></div><div className="metric green"><Banknote/><span>Revenue Paid</span><strong>{rupiah(stats.revenue)}</strong><small>Payment paid</small></div></div>
    <div className="dash-panel"><div className="panel-head"><div><h2>Backend Existing Tersambung</h2><p>Frontend mengikuti struktur Supabase Step 1–16 yang sudah ada.</p></div></div><div className="feature-checks"><span>✓ Product Management</span><span>✓ Multi Image URL via product_media</span><span>✓ Video URL</span><span>✓ Hyperlink Description</span><span>✓ Inventory + Moving Average HPP</span><span>✓ Profit Report</span><span>✓ White Label Settings</span><span>✓ Digital Transaction Fields</span></div></div>
  </DashboardShell>
}
