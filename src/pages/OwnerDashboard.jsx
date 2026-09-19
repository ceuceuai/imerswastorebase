import DashboardShell from '../components/DashboardShell'
import { useEffect, useMemo, useState } from 'react'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'
import { demoProducts } from '../data/demo'
import { rupiah } from '../lib/format'
import { Clock3, Package, ShoppingBag, TrendingUp, Wallet } from 'lucide-react'

const startOfDay = d => {
  const x = new Date(d)
  x.setHours(0,0,0,0)
  return x
}

const dayKey = d => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`
}

function MiniLineChart({ values }) {
  const width = 760, height = 230, pad = 28
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const points = values.map((v, i) => {
    const x = pad + (i * (width - pad*2) / Math.max(values.length - 1, 1))
    const y = height - pad - ((v - min) / range) * (height - pad*2)
    return [x,y]
  })
  const poly = points.map(p => p.join(',')).join(' ')
  const area = `${pad},${height-pad} ${poly} ${width-pad},${height-pad}`
  return <svg className="gas-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafik pendapatan 7 hari">
    {[0,1,2,3].map(i => <line key={i} x1={pad} x2={width-pad} y1={pad+i*(height-pad*2)/3} y2={pad+i*(height-pad*2)/3} />)}
    <polygon className="gas-area" points={area}/>
    <polyline className="gas-line" points={poly}/>
    {points.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4" />)}
  </svg>
}

function TopProducts({ items }) {
  const total = Math.max(items.reduce((n,x)=>n+x.qty,0),1)
  if (!items.length) return <div className="gas-empty-chart">Belum ada data penjualan produk.</div>
  return <div className="gas-top-products">
    {items.map((item,i)=><div key={item.name+i}>
      <div className="gas-product-rank"><span>{i+1}</span><b>{item.name}</b><strong>{item.qty}</strong></div>
      <div className="gas-progress"><i style={{width:`${Math.max((item.qty/total)*100,7)}%`}}/></div>
    </div>)}
  </div>
}

export default function OwnerDashboard(){
  const [ownerName,setOwnerName] = useState('Owner')
  const [stats,setStats]=useState({products:demoProducts.length,orders:0,pending:0,revenue:0})
  const [week,setWeek]=useState(Array(7).fill(0))
  const [labels,setLabels]=useState([])
  const [topProducts,setTopProducts]=useState([])

  useEffect(()=>{
    const days = Array.from({length:7},(_,i)=>{
      const d = startOfDay(new Date())
      d.setDate(d.getDate()-(6-i))
      return d
    })
    setLabels(days.map(d=>new Intl.DateTimeFormat('id-ID',{weekday:'short'}).format(d)))

    if(!supabaseEnabled)return
    ;(async()=>{
      const ctx=await getOwnerContext()
      if(!ctx.storeId)throw new Error('Store owner tidak ditemukan.')
      setOwnerName(ctx.profile?.full_name || ctx.user?.email?.split('@')[0] || 'Owner')

      const since = days[0].toISOString()
      const [p,o]=await Promise.all([
        supabase.from('products').select('id,status').eq('store_id',ctx.storeId),
        supabase.from('orders').select('id,total_amount,payment_status,status,created_at').eq('store_id',ctx.storeId).order('created_at',{ascending:false}),
      ])
      if(p.error)throw p.error
      if(o.error)throw o.error

      const orders=o.data||[]
      const paid=orders.filter(x=>x.payment_status==='paid')
      setStats({
        products:(p.data||[]).filter(x=>x.status).length,
        orders:orders.length,
        pending:orders.filter(x=>['pending','waiting','unpaid'].includes(String(x.status||'').toLowerCase()) || x.payment_status==='unpaid').length,
        revenue:paid.reduce((n,x)=>n+Number(x.total_amount||0),0),
      })

      const weekMap=Object.fromEntries(days.map(d=>[dayKey(d),0]))
      paid.filter(x=>new Date(x.created_at)>=days[0]).forEach(x=>{
        const k=dayKey(x.created_at)
        if(k in weekMap) weekMap[k]+=Number(x.total_amount||0)
      })
      setWeek(days.map(d=>weekMap[dayKey(d)]||0))

      const orderIds=orders.map(x=>x.id)
      if(orderIds.length){
        const {data:items,error:itemErr}=await supabase.from('order_items').select('order_id,product_name,qty').in('order_id',orderIds.slice(0,500))
        if(itemErr)throw itemErr
        const agg={}
        ;(items||[]).forEach(x=>{
          const name=x.product_name||'Produk'
          agg[name]=(agg[name]||0)+Number(x.qty||0)
        })
        setTopProducts(Object.entries(agg).map(([name,qty])=>({name,qty})).sort((a,b)=>b.qty-a.qty).slice(0,5))
      } else setTopProducts([])
    })().catch(e=>console.error(e))
  },[])

  const maxWeek = useMemo(()=>Math.max(...week,0),[week])

  return <DashboardShell title="Dashboard" subtitle="Ringkasan operasional toko hari ini.">
    <div className="gas-welcome-banner">
      <div>
        <h2>Selamat datang kembali, <span>{ownerName}</span>! 👋</h2>
        <p>Berikut adalah ringkasan aktivitas toko Anda hari ini.</p>
      </div>
      <TrendingUp className="gas-welcome-icon"/>
    </div>

    <div className="gas-stat-grid">
      <div className="gas-stat-card"><div><span>Pendapatan</span><strong>{rupiah(stats.revenue)}</strong></div><i className="green"><Wallet/></i></div>
      <div className="gas-stat-card"><div><span>Total Order</span><strong>{stats.orders}</strong></div><i className="blue"><ShoppingBag/></i></div>
      <div className="gas-stat-card"><div><span>Pending</span><strong>{stats.pending}</strong></div><i className="amber"><Clock3/></i></div>
      <div className="gas-stat-card"><div><span>Katalog</span><strong>{stats.products}</strong></div><i className="purple"><Package/></i></div>
    </div>

    <div className="gas-chart-grid">
      <section className="gas-dash-panel gas-chart-card">
        <div className="gas-panel-title"><TrendingUp size={18}/><div><h3>Grafik Pendapatan (7 Hari Terakhir)</h3><p>Pendapatan dibayar berdasarkan order Supabase.</p></div></div>
        <div className="gas-chart-wrap"><MiniLineChart values={week}/></div>
        <div className="gas-day-labels">{labels.map((x,i)=><span key={i}>{x}<small>{maxWeek ? rupiah(week[i]) : 'Rp 0'}</small></span>)}</div>
      </section>

      <section className="gas-dash-panel gas-chart-card">
        <div className="gas-panel-title"><ShoppingBag size={18}/><div><h3>Produk Terlaris</h3><p>Berdasarkan jumlah item terjual.</p></div></div>
        <TopProducts items={topProducts}/>
      </section>
    </div>
  </DashboardShell>
}
