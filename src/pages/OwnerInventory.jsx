import DashboardShell from '../components/DashboardShell'
import { useEffect, useMemo, useState } from 'react'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'
import { demoProducts } from '../data/demo'
import { normalizeProduct } from '../lib/schemaAdapter'
import { rupiah } from '../lib/format'
import { Boxes, PackagePlus, Plus, Search, TrendingUp } from 'lucide-react'

export default function OwnerInventory(){
  const [products,setProducts]=useState(supabaseEnabled?[]:demoProducts.filter(p=>p.product_type==='physical'))
  const [moves,setMoves]=useState([])
  const [search,setSearch]=useState('')
  const [type,setType]=useState('all')
  const [page,setPage]=useState(1)
  const [size,setSize]=useState(10)
  const [busy,setBusy]=useState(false)
  const [form,setForm]=useState({product_id:'',movement_type:'in',qty:1,unit_cost:0,note:''})

  const load=async()=>{
    if(!supabaseEnabled)return
    const ctx=await getOwnerContext()
    if(!ctx.storeId)throw new Error('Store owner tidak ditemukan.')
    const [p,m]=await Promise.all([
      supabase.from('products').select('*').eq('store_id',ctx.storeId).eq('status',true).eq('type','physical').order('name'),
      supabase.from('inventory_transactions').select('*,product:products(name,sku)').eq('store_id',ctx.storeId).order('created_at',{ascending:false}).limit(500)
    ])
    if(p.error)throw p.error
    if(m.error)throw m.error
    setProducts((p.data||[]).map(normalizeProduct))
    setMoves(m.data||[])
  }

  useEffect(()=>{load().catch(e=>alert(e.message))},[])

  const filtered=useMemo(()=>moves.filter(m=>(type==='all'||m.type===type)&&(!search||`${m.product?.name||''} ${m.notes||''}`.toLowerCase().includes(search.toLowerCase()))),[moves,search,type])
  const pages=Math.max(1,Math.ceil(filtered.length/size))
  const rows=filtered.slice((page-1)*size,page*size)

  const submit=async e=>{
    e.preventDefault()
    if(!form.product_id)return alert('Pilih produk.')
    if(!supabaseEnabled){alert('Demo mode: movement tidak disimpan permanen.');return}
    setBusy(true)
    try{
      const {error}=await supabase.rpc('record_inventory_transaction',{
        p_product_id:form.product_id,
        p_type:form.movement_type,
        p_qty:Number(form.qty),
        p_hpp:Number(form.unit_cost||0),
        p_notes:form.note||null,
      })
      if(error)throw error
      setForm({...form,qty:1,unit_cost:0,note:''})
      await load()
      supabase.functions.invoke('stock-alert',{body:{force:false}}).catch(()=>{})
    }catch(err){alert(err.message)}finally{setBusy(false)}
  }

  return <DashboardShell title="Inventory & HPP" subtitle="Stok masuk/keluar dan moving-average HPP untuk satu toko.">
    <div className="module-hero tone-inventory"><div><span>STOCK CONTROL</span><h2>Stok dan HPP bergerak dalam satu dashboard</h2><p>Setiap stok masuk memperbarui moving-average HPP. Penjualan online dan POS tercatat sebagai pergerakan stok keluar.</p></div><div className="module-hero-icon"><Boxes/></div></div>
    <div className="inventory-mini-stats"><div><PackagePlus/><span><b>{products.reduce((n,p)=>n+Number(p.stock||0),0)}</b><small>Total unit tersedia</small></span></div><div><TrendingUp/><span><b>{rupiah(products.reduce((n,p)=>n+(Number(p.stock||0)*Number(p.avg_cost||0)),0))}</b><small>Nilai stok berdasar HPP</small></span></div><div><Boxes/><span><b>{products.length}</b><small>Produk fisik aktif</small></span></div></div>
    <form className="dash-panel inventory-entry" onSubmit={submit}>
      <div className="panel-head"><div><h2>Catat Pergerakan Stok</h2><p>Stok masuk dengan HPP baru otomatis menghitung rata-rata HPP.</p></div></div>
      <div className="form-grid">
        <label>Produk<select required value={form.product_id} onChange={e=>setForm({...form,product_id:e.target.value})}><option value="">Pilih produk...</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} — stok {p.stock}</option>)}</select></label>
        <label>Tipe<select value={form.movement_type} onChange={e=>setForm({...form,movement_type:e.target.value})}><option value="in">Stok Masuk</option><option value="out">Stok Keluar</option><option value="adjustment_in">Penyesuaian +</option><option value="adjustment_out">Penyesuaian -</option></select></label>
        <label>Qty<input type="number" min="0.001" step="0.001" required value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/></label>
        <label>HPP / Unit Cost<input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e=>setForm({...form,unit_cost:e.target.value})}/></label>
        <label className="span2">Catatan<input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Pembelian supplier / koreksi stok..."/></label>
      </div>
      <button className="btn-primary" disabled={busy}><Plus/>{busy?'Menyimpan...':'Simpan Transaksi'}</button>
    </form>

    <div className="toolbar"><div className="search-small"><Search/><input placeholder="Cari produk / catatan..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></div><select value={type} onChange={e=>{setType(e.target.value);setPage(1)}}><option value="all">Semua tipe</option><option value="in">Masuk</option><option value="out">Keluar</option></select></div>

    <div className="dash-panel table-panel"><div className="responsive-table"><table><thead><tr><th>Tanggal</th><th>Produk</th><th>Tipe</th><th>Qty</th><th>HPP</th><th>Catatan</th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td>{new Date(m.created_at).toLocaleString('id-ID')}</td><td><b>{m.product?.name||'-'}</b><small>{m.product?.sku||''}</small></td><td><span className={`status ${m.type==='in'?'ok':'off'}`}>{m.type==='in'?'MASUK':'KELUAR'}</span></td><td>{m.qty}</td><td>{rupiah(m.hpp)}</td><td>{m.notes||'-'}</td></tr>)}</tbody></table></div><div className="pagination"><span>{filtered.length} data</span><select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1)}}><option>10</option><option>25</option><option>50</option></select><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>←</button><b>{page}/{pages}</b><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>→</button></div></div>
  </DashboardShell>
}
