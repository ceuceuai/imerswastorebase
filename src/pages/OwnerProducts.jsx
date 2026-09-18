import DashboardShell from '../components/DashboardShell'
import { demoProducts } from '../data/demo'
import { asArray, rupiah, slugify } from '../lib/format'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'
import { normalizeCategory, normalizeProduct } from '../lib/schemaAdapter'
import { useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, Search, Trash2, X } from 'lucide-react'

const empty = {
  name:'', slug:'', sku:'', product_type:'physical', category_id:'', price:0,
  compare_at_price:'', stock:0, avg_cost:0, image_url:'', gallery_images:[],
  video_urls:[], description:'', detail_button_label:'', detail_button_url:'',
  featured:false, promo:false, active:true, badge:'', input_schema:[]
}

const types = [
  ['physical','Produk Fisik'], ['digital','Produk Digital'], ['pulsa_data','Pulsa / Paket Data'],
  ['pln_token','Token PLN'], ['game_topup','Top Up Game'], ['ewallet','E-Wallet'],
  ['voucher','Voucher'], ['service','Jasa'], ['other','Lainnya']
]

function InputSchemaEditor({ value, onChange }) {
  const rows = Array.isArray(value) ? value : []
  const add = () => onChange([...rows, { name:'', label:'', type:'text', required:true, options:[] }])
  const update = (i, patch) => onChange(rows.map((r,idx)=>idx===i?{...r,...patch}:r))
  const remove = i => onChange(rows.filter((_,idx)=>idx!==i))

  return <div className="span2 form-section" style={{marginTop:0}}>
    <div className="panel-head"><div><h3>Data Transaksi Digital</h3><p>Opsional. Contoh: nomor HP, nomor meter, User ID, Server ID.</p></div><button type="button" className="btn-outline" onClick={add}><Plus size={16}/> Tambah Field</button></div>
    {rows.length === 0 ? <div className="empty-box" style={{padding:18}}>Belum ada field transaksi.</div> : rows.map((r,i)=><div key={i} className="form-grid" style={{borderTop:'1px solid #e8eef7',paddingTop:14,marginTop:12}}>
      <label>Label<input value={r.label||''} onChange={e=>update(i,{label:e.target.value})} placeholder="Nomor HP Tujuan"/></label>
      <label>Key<input value={r.name||''} onChange={e=>update(i,{name:slugify(e.target.value).replaceAll('-','_')})} placeholder="phone"/></label>
      <label>Tipe<select value={r.type||'text'} onChange={e=>update(i,{type:e.target.value})}><option value="text">Text</option><option value="phone">Phone</option><option value="select">Pilihan</option><option value="textarea">Textarea</option></select></label>
      <label>Wajib?<select value={r.required?'yes':'no'} onChange={e=>update(i,{required:e.target.value==='yes'})}><option value="yes">Ya</option><option value="no">Tidak</option></select></label>
      {r.type==='select' && <label className="span2">Pilihan <small>pisahkan dengan koma</small><input value={(r.options||[]).join(', ')} onChange={e=>update(i,{options:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label>}
      <div className="span2"><button type="button" className="btn-outline" onClick={()=>remove(i)}><Trash2 size={15}/> Hapus Field</button></div>
    </div>)}
  </div>
}

export default function OwnerProducts() {
  const [data,setData] = useState(demoProducts)
  const [categories,setCategories] = useState([])
  const [storeId,setStoreId] = useState('')
  const [modal,setModal] = useState(false)
  const [form,setForm] = useState(empty)
  const [search,setSearch] = useState('')
  const [type,setType] = useState('all')
  const [page,setPage] = useState(1)
  const [size,setSize] = useState(10)
  const [busy,setBusy] = useState(false)

  const load = async () => {
    if (!supabaseEnabled) return
    const ctx = await getOwnerContext()
    if (!ctx.storeId) throw new Error('Store owner tidak ditemukan di profiles.')
    setStoreId(ctx.storeId)
    const [pRes,cRes] = await Promise.all([
      supabase.from('products')
        .select('*,category:categories(id,name,image_url,type,sort_order,status),product_media(id,media_type,media_url,sort_order)')
        .eq('store_id',ctx.storeId).order('created_at',{ascending:false}),
      supabase.from('categories').select('*').eq('store_id',ctx.storeId).order('sort_order').order('name')
    ])
    if (pRes.error) throw pRes.error
    if (cRes.error) throw cRes.error
    setData((pRes.data||[]).map(normalizeProduct))
    setCategories((cRes.data||[]).map(normalizeCategory))
  }

  useEffect(()=>{ load().catch(e=>alert(e.message)) },[])

  const filtered = useMemo(()=>data.filter(p=>(type==='all'||p.product_type===type)&&(!search||`${p.name} ${p.sku||''}`.toLowerCase().includes(search.toLowerCase()))),[data,search,type])
  const pages = Math.max(1,Math.ceil(filtered.length/size))
  const rows = filtered.slice((page-1)*size,page*size)

  const open = (p=null) => {
    setForm(p ? {
      ...empty, ...p,
      gallery_images:asArray(p.gallery_images),
      video_urls:asArray(p.video_urls),
      input_schema:Array.isArray(p.input_schema)?p.input_schema:[]
    } : empty)
    setModal(true)
  }

  const save = async e => {
    e.preventDefault()
    setBusy(true)
    try {
      if (!supabaseEnabled) {
        const payload={...form,slug:form.slug||slugify(form.name)}
        setData(prev=>form.id?prev.map(p=>p.id===form.id?payload:p):[{...payload,id:`demo-${Date.now()}`},...prev])
        setModal(false)
        return
      }

      const sid = storeId || (await getOwnerContext()).storeId
      if (!sid) throw new Error('Store ID owner tidak ditemukan.')
      const productPayload = {
        store_id:sid,
        category_id:form.category_id||null,
        name:form.name.trim(),
        slug:form.slug?.trim() || slugify(form.name),
        sku:form.sku?.trim() || null,
        description:form.description||null,
        type:form.product_type,
        price:Number(form.price||0),
        hpp:Number(form.avg_cost||0),
        stock:Number(form.stock||0),
        cover_image:form.image_url||null,
        featured:!!form.featured,
        promo:!!form.promo,
        preview_url:form.detail_button_url||null,
        button_text:form.detail_button_label||null,
        status:!!form.active,
        compare_at_price:form.compare_at_price?Number(form.compare_at_price):null,
        badge:form.badge||null,
        input_schema:(form.input_schema||[]).filter(x=>x.name&&x.label),
      }

      let productId = form.id
      if (form.id) {
        const {error} = await supabase.from('products').update(productPayload).eq('id',form.id).eq('store_id',sid)
        if (error) throw error
      } else {
        const {data:created,error} = await supabase.from('products').insert(productPayload).select('id').single()
        if (error) throw error
        productId = created.id
      }

      const {error:deleteMediaError} = await supabase.from('product_media').delete().eq('product_id',productId)
      if (deleteMediaError) throw deleteMediaError

      const images = asArray(form.gallery_images).filter(Boolean)
      const videos = asArray(form.video_urls).filter(Boolean)
      const mediaRows = [
        ...images.map((url,i)=>({product_id:productId,media_type:'image',media_url:url,sort_order:i+1})),
        ...videos.map((url,i)=>({product_id:productId,media_type:'video',media_url:url,sort_order:100+i})),
      ]
      if (mediaRows.length) {
        const {error:mediaError} = await supabase.from('product_media').insert(mediaRows)
        if (mediaError) throw mediaError
      }

      await load()
      setModal(false)
    } catch(err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const del = async p => {
    if(!confirm(`Hapus ${p.name}?`)) return
    if(!supabaseEnabled){ setData(v=>v.filter(x=>x.id!==p.id)); return }
    const {error}=await supabase.from('products').delete().eq('id',p.id).eq('store_id',storeId)
    if(error) alert(error.message); else load().catch(e=>alert(e.message))
  }

  return <DashboardShell title="Product Management" subtitle="CRUD produk fisik, digital, pulsa/token/topup dan media URL.">
    <div className="toolbar">
      <div className="search-small"><Search/><input placeholder="Cari nama / SKU..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></div>
      <select value={type} onChange={e=>{setType(e.target.value);setPage(1)}}><option value="all">Semua tipe</option>{types.map(t=><option key={t[0]} value={t[0]}>{t[1]}</option>)}</select>
      <div className="toolbar-spacer"/><button className="btn-primary" onClick={()=>open()}><Plus/> Tambah Produk</button>
    </div>

    <div className="dash-panel table-panel"><div className="responsive-table"><table><thead><tr><th>Produk</th><th>Tipe</th><th>Harga</th><th>Stok</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><div className="table-product"><img src={p.image_url||'https://placehold.co/80x80?text=P'}/><div><b>{p.name}</b><small>{p.sku||p.slug||'-'}</small></div></div></td><td><span className="soft-pill">{p.product_type}</span></td><td>{rupiah(p.price)}</td><td>{p.stock}</td><td><span className={`status ${p.active?'ok':'off'}`}>{p.active?'Aktif':'Nonaktif'}</span></td><td className="table-actions"><button onClick={()=>open(p)}><Edit3/></button><button onClick={()=>del(p)}><Trash2/></button></td></tr>)}</tbody></table></div>
      <div className="pagination"><span>{filtered.length} data</span><select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1)}}><option>10</option><option>25</option><option>50</option></select><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>←</button><b>{page}/{pages}</b><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>→</button></div>
    </div>

    {modal&&<div className="modal-backdrop"><form className="admin-modal" onSubmit={save}><div className="admin-modal-head"><div><h2>{form.id?'Edit':'Tambah'} Produk</h2><p>Media menggunakan URL. Bisa banyak image dan video.</p></div><button type="button" onClick={()=>setModal(false)}><X/></button></div>
      <div className="form-grid">
        <label className="span2">Nama Produk<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label>Slug<input value={form.slug||''} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="otomatis-jika-kosong"/></label>
        <label>SKU<input value={form.sku||''} onChange={e=>setForm({...form,sku:e.target.value})}/></label>
        <label>Tipe Produk<select value={form.product_type} onChange={e=>setForm({...form,product_type:e.target.value})}>{types.map(t=><option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></label>
        <label>Kategori<select value={form.category_id||''} onChange={e=>setForm({...form,category_id:e.target.value||null})}><option value="">Tanpa kategori</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Harga<input type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
        <label>Harga Coret<input type="number" min="0" value={form.compare_at_price||''} onChange={e=>setForm({...form,compare_at_price:e.target.value})}/></label>
        <label>Stok<input type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label>
        <label>HPP<input type="number" min="0" value={form.avg_cost} onChange={e=>setForm({...form,avg_cost:e.target.value})}/></label>
        <label className="span2">Image Utama URL<input value={form.image_url||''} onChange={e=>setForm({...form,image_url:e.target.value})}/></label>
        <label className="span2">Multi Image URL <small>1 URL per baris</small><textarea rows="4" value={asArray(form.gallery_images).join('\n')} onChange={e=>setForm({...form,gallery_images:e.target.value})}/></label>
        <label className="span2">Video URL <small>YouTube / Vimeo / MP4, 1 URL per baris</small><textarea rows="3" value={asArray(form.video_urls).join('\n')} onChange={e=>setForm({...form,video_urls:e.target.value})}/></label>
        <label className="span2">Deskripsi <small>Hyperlink: [Teks Link](https://url.com)</small><textarea rows="5" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label>Label Button Detail<input value={form.detail_button_label||''} onChange={e=>setForm({...form,detail_button_label:e.target.value})} placeholder="Contoh: Lihat Demo"/></label>
        <label>URL Button Detail<input value={form.detail_button_url||''} onChange={e=>setForm({...form,detail_button_url:e.target.value})}/></label>
        <label>Badge<input value={form.badge||''} onChange={e=>setForm({...form,badge:e.target.value})} placeholder="Promo / Baru / Terlaris"/></label>
        <div className="check-row"><label><input type="checkbox" checked={!!form.featured} onChange={e=>setForm({...form,featured:e.target.checked})}/> Featured</label><label><input type="checkbox" checked={!!form.promo} onChange={e=>setForm({...form,promo:e.target.checked})}/> Promo</label><label><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Aktif</label></div>
        {form.product_type !== 'physical' && <InputSchemaEditor value={form.input_schema} onChange={input_schema=>setForm({...form,input_schema})}/>} 
      </div>
      <div className="modal-foot"><button type="button" className="btn-outline" onClick={()=>setModal(false)}>Batal</button><button className="btn-primary" disabled={busy}>{busy?'Menyimpan...':'Simpan Produk'}</button></div>
    </form></div>}
  </DashboardShell>
}
