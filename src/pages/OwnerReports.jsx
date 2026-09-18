import DashboardShell from '../components/DashboardShell'
import { useEffect, useMemo, useState } from 'react'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'
import { rupiah } from '../lib/format'
import { Search } from 'lucide-react'

const demo=[]

export default function OwnerReports(){
  const[data,setData]=useState(demo)
  const[range,setRange]=useState('30')
  const[search,setSearch]=useState('')
  const[page,setPage]=useState(1)
  const[size,setSize]=useState(10)

  useEffect(()=>{
    if(!supabaseEnabled)return
    ;(async()=>{
      const ctx=await getOwnerContext()
      if(!ctx.storeId)throw new Error('Store owner tidak ditemukan.')
      const {data:orders,error}=await supabase
        .from('orders')
        .select('id,order_number,created_at,status,payment_status,total_amount,order_items(qty,hpp)')
        .eq('store_id',ctx.storeId)
        .order('created_at',{ascending:false})
        .limit(1000)
      if(error)throw error
      setData((orders||[]).map(o=>{
        const cogs=(o.order_items||[]).reduce((n,i)=>n+Number(i.hpp||0)*Number(i.qty||0),0)
        const revenue=Number(o.total_amount||0)
        return {...o,revenue,cogs,profit:revenue-cogs}
      }))
    })().catch(e=>alert(e.message))
  },[])

  const cutoff=Date.now()-Number(range)*86400000
  const filtered=useMemo(()=>data.filter(r=>new Date(r.created_at).getTime()>=cutoff&&(!search||String(r.order_number||'').toLowerCase().includes(search.toLowerCase()))),[data,range,search])
  const paid=filtered.filter(r=>r.payment_status==='paid')
  const totals=paid.reduce((a,r)=>({revenue:a.revenue+r.revenue,cogs:a.cogs+r.cogs,profit:a.profit+r.profit}),{revenue:0,cogs:0,profit:0})
  const pages=Math.max(1,Math.ceil(filtered.length/size))
  const rows=filtered.slice((page-1)*size,page*size)

  return <DashboardShell title="Profit Report" subtitle="Revenue, HPP/COGS dan laba kotor dari order Supabase existing.">
    <div className="metric-grid three"><div className="metric blue"><span>Revenue Paid</span><strong>{rupiah(totals.revenue)}</strong><small>{range} hari</small></div><div className="metric orange"><span>COGS / HPP</span><strong>{rupiah(totals.cogs)}</strong><small>Harga pokok terjual</small></div><div className="metric green"><span>Gross Profit</span><strong>{rupiah(totals.profit)}</strong><small>Revenue - COGS</small></div></div>
    <div className="toolbar"><div className="search-small"><Search/><input placeholder="Cari nomor order..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></div><select value={range} onChange={e=>setRange(e.target.value)}><option value="7">7 hari</option><option value="30">30 hari</option><option value="90">90 hari</option><option value="365">1 tahun</option></select></div>
    <div className="dash-panel table-panel"><div className="responsive-table"><table><thead><tr><th>Order</th><th>Tanggal</th><th>Status</th><th>Payment</th><th>Revenue</th><th>COGS</th><th>Profit</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.order_number}</b></td><td>{new Date(r.created_at).toLocaleDateString('id-ID')}</td><td><span className="status ok">{r.status}</span></td><td>{r.payment_status}</td><td>{rupiah(r.revenue)}</td><td>{rupiah(r.cogs)}</td><td><b>{rupiah(r.profit)}</b></td></tr>)}</tbody></table></div><div className="pagination"><span>{filtered.length} data</span><select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1)}}><option>10</option><option>25</option><option>50</option></select><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>←</button><b>{page}/{pages}</b><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>→</button></div></div>
  </DashboardShell>
}
