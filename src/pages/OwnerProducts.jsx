import DashboardShell from '../components/DashboardShell'
import { demoProducts } from '../data/demo'
import { asArray, rupiah, slugify } from '../lib/format'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'
import { normalizeCategory, normalizeProduct } from '../lib/schemaAdapter'
import { useEffect, useMemo, useState } from 'react'
import { Edit3, Plus, Search, Trash2, X } from 'lucide-react'

const emptyVariant={name:'',sku:'',price:'',hpp:'',stock:0,image_url:'',weight_grams:'',unit:'',active:true}
const empty = {
  name:'', slug:'', sku:'', product_type:'physical', category_id:'', price:0,
  compare_at_price:'', stock:0, avg_cost:0, unit:'pcs', weight_grams:0, image_url:'', gallery_images:[],
  video_urls:[], description:'', detail_button_label:'', detail_button_url:'',
  featured:false, promo:false, active:true, badge:'', input_schema:[], variants:[]
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
  return <div className="span2 form-section form-section-tinted">
    <div className="panel-head"><div><h3>Data Transaksi Digital</h3><p>Contoh: nomor HP, nomor meter, User ID, Server ID atau pilihan nominal.</p></div><button type="button" className="btn-outline" onClick={add}><Plus size={16}/> Tambah Field</button></div>
    {rows.length === 0 ? <div className="empty-box compact">Belum ada field transaksi.</div> : rows.map((r,i)=><div key={i} className="form-grid form-grid-row">
      <label>Label<input value={r.label||''} onChange={e=>update(i,{label:e.target.value})} placeholder="Nomor HP Tujuan"/></label>
      <label>Key<input value={r.name||''} onChange={e=>update(i,{name:slugify(e.target.value).replaceAll('-','_')})} placeholder="phone"/></label>
      <label>Tipe<select value={r.type||'text'} onChange={e=>update(i,{type:e.target.value})}><option value="text">Text</option><option value="phone">Phone</option><option value="number">Number</option><option value="select">Pilihan</option><option value="textarea">Textarea</option></select></label>
      <label>Wajib?<select value={r.required?'yes':'no'} onChange={e=>update(i,{required:e.target.value==='yes'})}><option value="yes">Ya</option><option value="no">Tidak</option></select></label>
      {r.type==='select' && <label className="span2">Pilihan <small>pisahkan dengan koma</small><input value={(r.options||[]).join(', ')} onChange={e=>update(i,{options:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label>}
      <div className="span2"><button type="button" className="btn-outline danger-outline" onClick={()=>remove(i)}><Trash2 size={15}/> Hapus Field</button></div>
    </div>)}
  </div>
}

function VariantEditor({value,onChange,defaultUnit='pcs'}){
  const rows=Array.isArray(value)?value:[]
  const add=()=>onChange([...rows,{...emptyVariant,unit:defaultUnit}])
  const update=(i,patch)=>onChange(rows.map((r,idx)=>idx===i?{...r,...patch}:r))
  const remove=i=>onChange(rows.map((r,idx)=>idx===i?(r.id?{...r,active:false}:null):r).filter(Boolean))
  const visible=rows.filter(r=>r.active!==false)
  return <div className="span2 form-section variant-section"><div className="panel-head"><div><h3>Varian Produk</h3><p>Opsional untuk warna, ukuran, rasa, paket atau SKU berbeda. Varian lama dinonaktifkan, bukan dihapus paksa.</p></div><button type="button" className="btn-outline" onClick={add}><Plus/>Tambah Varian</button></div>{!visible.length?<div className="empty-box compact">Produk tanpa varian.</div>:visible.map((v,visibleIndex)=>{const i=rows.indexOf(v);return <div className="variant-row" key={v.id||`new-${visibleIndex}`}><div className="variant-row-head"><b>Varian {visibleIndex+1}</b><button type="button" onClick={()=>remove(i)}><Trash2/></button></div><div className="form-grid"><label>Nama<input required value={v.name||''} onChange={e=>update(i,{name:e.target.value})} placeholder="Merah / XL / Pedas"/></label><label>SKU<input value={v.sku||''} onChange={e=>update(i,{sku:e.target.value})}/></label><label>Harga<input type="number" min="0" value={v.price??''} onChange={e=>update(i,{price:e.target.value})}/></label><label>HPP<input type="number" min="0" value={v.hpp??''} onChange={e=>update(i,{hpp:e.target.value})}/></label><label>Stok<input type="number" min="0" value={v.stock??0} onChange={e=>update(i,{stock:e.target.value})}/></label><label>Satuan<input value={v.unit||defaultUnit} onChange={e=>update(i,{unit:e.target.value})}/></label><label>Berat (gram)<input type="number" min="0" value={v.weight_grams??''} onChange={e=>update(i,{weight_grams:e.target.value})}/></label><label>Image URL<input value={v.image_url||''} onChange={e=>update(i,{image_url:e.target.value})}/></label></div></div>})}</div>
}

export default function OwnerProducts() {
  const [data,setData] = useState(supabaseEnabled?[]:demoProducts)
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
        .select('*,category:categories(id,name,image_url,type,sort_order,status),product_media(id,media_type,media_url,sort_order),product_variants(id,name,sku,price,hpp,stock,image_url,weight_grams,unit,active)')
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
      input_schema:Array.isArray(p.input_schema)?p.input_schema:[],
      variants:Array.isArray(p.variants)?p.variants:[]
    } : empty)
    setModal(true)
  }

  const syncVariants=async(productId,sid)=>{
    const existing=(form.variants||[]).filter(v=>v.id)
    for(const v of existing){
      const payload={name:v.name,sku:v.sku||null,price:Number(v.price||form.price||0),hpp:Number(v.hpp||form.avg_cost||0),stock:Number(v.stock||0),image_url:v.image_url||null,weight_grams:v.weight_grams===''?null:Number(v.weight_grams||0),unit:v.unit||form.unit||'pcs',active:v.active!==false}
      const{error}=await supabase.from('product_variants').update(payload).eq('id',v.id).eq('product_id',productId);if(error)throw error
    }
    const fresh=(form.variants||[]).filter(v=>!v.id&&v.active!==false&&v.name?.trim())
    if(fresh.length){const{error}=await supabase.from('product_variants').insert(fresh.map(v=>({product_id:productId,name:v.name.trim(),sku:v.sku||null,price:Number(v.price||form.price||0),hpp:Number(v.hpp||form.avg_cost||0),stock:Number(v.stock||0),image_url:v.image_url||null,weight_grams:v.weight_grams===''?null:Number(v.weight_grams||0),unit:v.unit||form.unit||'pcs',active:true})));if(error)throw error}
  }

  const save = async e => {
    e.preventDefault();setBusy(true)
    try {
      if (!supabaseEnabled) { const payload={...form,slug:form.slug||slugify(form.name)};setData(prev=>form.id?prev.map(p=>p.id===form.id?payload:p):[{...payload,id:`demo-${Date.now()}`},...prev]);setModal(false);return }
      const sid = storeId || (await getOwnerContext()).storeId
      if (!sid) throw new Error('Store ID owner tidak ditemukan.')
      const productPayload = {store_id:sid,category_id:form.category_id||null,name:form.name.trim(),slug:form.slug?.trim() || slugify(form.name),sku:form.sku?.trim() || null,description:form.description||null,type:form.product_type,price:Number(form.price||0),hpp:Number(form.avg_cost||0),stock:Number(form.stock||0),unit:form.unit||'pcs',weight_grams:Number(form.weight_grams||0),cover_image:form.image_url||null,featured:!!form.featured,promo:!!form.promo,preview_url:form.detail_button_url||null,button_text:form.detail_button_label||null,status:!!form.active,compare_at_price:form.compare_at_price?Number(form.compare_at_price):null,badge:form.badge||null,input_schema:(form.input_schema||[]).filter(x=>x.name&&x.label)}
      let productId = form.id
      if (form.id) { const {error} = await supabase.from('products').update(productPayload).eq('id',form.id).eq('store_id',sid); if (error) throw error }
      else { const {data:created,error} = await supabase.from('products').insert(productPayload).select('id').single(); if (error) throw error; productId = created.id }
      const {error:deleteMediaError} = await supabase.from('product_media').delete().eq('product_id',productId); if (deleteMediaError) throw deleteMediaError
      const images = asArray(form.gallery_images).filter(Boolean), videos = asArray(form.video_urls).filter(Boolean)
      const mediaRows = [...images.map((url,i)=>({product_id:productId,media_type:'image',media_url:url,sort_order:i+1})),...videos.map((url,i)=>({product_id:productId,media_type:'video',media_url:url,sort_order:100+i}))]
      if (mediaRows.length) { const {error:mediaError} = await supabase.from('product_media').insert(mediaRows); if (mediaError) throw mediaError }
      await syncVariants(productId,sid)
      await load();supabase.functions.invoke('stock-alert',{body:{force:false}}).catch(()=>{});setModal(false)
    } catch(err) { alert(err.message) } finally { setBusy(false) }
  }

  const del = async p => { if(!confirm(`Hapus ${p.name}?`)) return; if(!supabaseEnabled){ setData(v=>v.filter(x=>x.id!==p.id)); return }; const {error}=await supabase.from('products').delete().eq('id',p.id).eq('store_id',storeId); if(error) alert(error.message); else load().catch(e=>alert(e.message)) }

  return <DashboardShell title="Katalog Produk" subtitle="Produk fisik, digital, varian, media URL, HPP, stok, berat dan field transaksi.">
    <div className="module-hero tone-catalog"><div><span>PRODUCT ENGINE</span><h2>Katalog lengkap untuk satu toko</h2><p>Kelola fisik, digital, pulsa/token, varian, satuan, stok dan media tanpa pindah aplikasi.</p></div><div className="module-hero-icon"><Plus/></div></div>
    <div className="toolbar"><div className="search-small"><Search/><input placeholder="Cari nama / SKU..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></div><select value={type} onChange={e=>{setType(e.target.value);setPage(1)}}><option value="all">Semua tipe</option>{types.map(t=><option key={t[0]} value={t[0]}>{t[1]}</option>)}</select><div className="toolbar-spacer"/><button className="btn-primary" onClick={()=>open()}><Plus/> Tambah Produk</button></div>
    <div className="dash-panel table-panel"><div className="responsive-table"><table><thead><tr><th>Produk</th><th>Tipe</th><th>Harga</th><th>Stok</th><th>Varian</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><div className="table-product"><img src={p.image_url||'https://placehold.co/80x80?text=P'}/><div><b>{p.name}</b><small>{p.sku||p.slug||'-'} • {p.weight_grams||0}g</small></div></div></td><td><span className="soft-pill">{p.product_type}</span></td><td>{rupiah(p.price)}</td><td>{p.stock} {p.unit||'pcs'}</td><td>{p.variants?.length||0}</td><td><span className={`status ${p.active?'ok':'off'}`}>{p.active?'Aktif':'Nonaktif'}</span></td><td className="table-actions"><button onClick={()=>open(p)}><Edit3/></button><button onClick={()=>del(p)}><Trash2/></button></td></tr>)}</tbody></table></div><div className="pagination"><span>{filtered.length} data</span><select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1)}}><option>10</option><option>25</option><option>50</option></select><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>←</button><b>{page}/{pages}</b><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>→</button></div></div>
    {modal&&<div className="modal-backdrop"><form className="admin-modal admin-modal-xl" onSubmit={save}><div className="admin-modal-head"><div><h2>{form.id?'Edit':'Tambah'} Produk</h2><p>Media menggunakan URL. Bisa banyak image dan video.</p></div><button type="button" onClick={()=>setModal(false)}><X/></button></div><div className="form-grid"><label className="span2">Nama Produk<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Slug<input value={form.slug||''} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="otomatis-jika-kosong"/></label><label>SKU<input value={form.sku||''} onChange={e=>setForm({...form,sku:e.target.value})}/></label><label>Tipe Produk<select value={form.product_type} onChange={e=>setForm({...form,product_type:e.target.value})}>{types.map(t=><option key={t[0]} value={t[0]}>{t[1]}</option>)}</select></label><label>Kategori<select value={form.category_id||''} onChange={e=>setForm({...form,category_id:e.target.value||null})}><option value="">Tanpa kategori</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Harga<input type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>Harga Coret<input type="number" min="0" value={form.compare_at_price||''} onChange={e=>setForm({...form,compare_at_price:e.target.value})}/></label><label>Stok<input type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label><label>HPP<input type="number" min="0" value={form.avg_cost} onChange={e=>setForm({...form,avg_cost:e.target.value})}/></label><label>Satuan<input value={form.unit||'pcs'} onChange={e=>setForm({...form,unit:e.target.value})} list="units"/><datalist id="units"><option value="pcs"/><option value="box"/><option value="pack"/><option value="kg"/><option value="gram"/><option value="liter"/></datalist></label><label>Berat (gram)<input type="number" min="0" value={form.weight_grams||0} onChange={e=>setForm({...form,weight_grams:e.target.value})}/></label><label className="span2">Image Utama URL<input value={form.image_url||''} onChange={e=>setForm({...form,image_url:e.target.value})}/></label><label className="span2">Multi Image URL <small>1 URL per baris</small><textarea rows="4" value={asArray(form.gallery_images).join('\n')} onChange={e=>setForm({...form,gallery_images:e.target.value})}/></label><label className="span2">Video URL <small>YouTube / Vimeo / MP4, 1 URL per baris</small><textarea rows="3" value={asArray(form.video_urls).join('\n')} onChange={e=>setForm({...form,video_urls:e.target.value})}/></label><label className="span2">Deskripsi <small>Hyperlink: [Teks Link](https://url.com)</small><textarea rows="5" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Label Button Detail<input value={form.detail_button_label||''} onChange={e=>setForm({...form,detail_button_label:e.target.value})} placeholder="Contoh: Lihat Demo"/></label><label>URL Button Detail<input value={form.detail_button_url||''} onChange={e=>setForm({...form,detail_button_url:e.target.value})}/></label><label>Badge<input value={form.badge||''} onChange={e=>setForm({...form,badge:e.target.value})} placeholder="Promo / Baru / Terlaris"/></label><div className="check-row"><label><input type="checkbox" checked={!!form.featured} onChange={e=>setForm({...form,featured:e.target.checked})}/> Featured</label><label><input type="checkbox" checked={!!form.promo} onChange={e=>setForm({...form,promo:e.target.checked})}/> Promo</label><label><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Aktif</label></div>{form.product_type==='physical'&&<VariantEditor value={form.variants} onChange={variants=>setForm({...form,variants})} defaultUnit={form.unit}/>} {form.product_type !== 'physical' && <InputSchemaEditor value={form.input_schema} onChange={input_schema=>setForm({...form,input_schema})}/>}</div><div className="modal-foot"><button type="button" className="btn-outline" onClick={()=>setModal(false)}>Batal</button><button className="btn-primary" disabled={busy}>{busy?'Menyimpan...':'Simpan Produk'}</button></div></form></div>}
  </DashboardShell>
}
