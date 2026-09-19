import { ExternalLink, Play, ShoppingCart, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../context/CartContext'
import { asArray, rupiah } from '../lib/format'
import RichText from '../lib/richText'

function embedUrl(url='') {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) return `https://www.youtube.com/embed/${u.searchParams.get('v') || ''}`
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    if (u.hostname.includes('vimeo.com')) return `https://player.vimeo.com/video/${u.pathname.split('/').filter(Boolean).pop()}`
  } catch {}
  return ''
}

export default function ProductQuickView({ product, onClose }) {
  const { addItem } = useCart()
  const media = useMemo(() => {
    if (!product) return []
    const images = [product.image_url, ...asArray(product.gallery_images || [])].filter(Boolean)
    const uniqueImages = [...new Set(images)]
    return [...uniqueImages, ...asArray(product.video_urls || []).map(url => ({ video:url }))]
  }, [product])
  const [active, setActive] = useState(0)
  const [inputs, setInputs] = useState({})
  const [variantId,setVariantId]=useState('')
  useEffect(()=>{ setActive(0); setInputs({});setVariantId('') },[product?.id])
  if (!product) return null
  const current = media[active] || product.image_url
  const currentVideo = typeof current === 'object' ? current.video : ''
  const schema = Array.isArray(product.input_schema) ? product.input_schema : []
  const variants=Array.isArray(product.variants)?product.variants:[]
  const variant=variants.find(v=>v.id===variantId)||null
  const price=variant?Number(variant.price||product.price):Number(product.price||0)
  const submit = () => {
    for (const field of schema) if (field.required && !String(inputs[field.name] || '').trim()) return alert(`${field.label} wajib diisi.`)
    if(variants.length&&!variant)return alert('Pilih varian produk terlebih dahulu.')
    if(product.product_type==='physical' && variant && Number(variant.stock||0)<=0)return alert('Varian sedang habis.')
    addItem(product, 1, inputs, variant); onClose()
  }
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget && onClose()}><div className="quick-modal">
    <button className="modal-x" onClick={onClose}><X/></button>
    <div className="quick-media"><div className="main-media">{currentVideo ? (embedUrl(currentVideo) ? <iframe title="Video produk" src={embedUrl(currentVideo)} allowFullScreen/> : <video src={currentVideo} controls/>) : <img src={typeof current === 'string' ? current : product.image_url} alt={product.name}/>}</div><div className="media-strip">{media.map((m,i)=><button key={i} className={active===i?'active':''} onClick={()=>setActive(i)}>{typeof m==='object'?<Play/>:<img src={m} alt={i===0?'utama':'galeri'}/>}</button>)}</div></div>
    <div className="quick-info"><span className="soft-pill">{product.category?.name || product.product_type}</span><h2>{product.name}</h2><div className="quick-price">{rupiah(price)} {!variant&&product.compare_at_price > product.price && <del>{rupiah(product.compare_at_price)}</del>}</div><RichText text={product.description}/>
      {variants.length>0&&<div className="variant-picker"><h4>Pilih Varian</h4><div>{variants.map(v=><button key={v.id} type="button" className={variantId===v.id?'active':''} disabled={product.product_type==='physical'&&Number(v.stock||0)<=0} onClick={()=>setVariantId(v.id)}><b>{v.name}</b><span>{rupiah(v.price||product.price)} • stok {v.stock}</span></button>)}</div></div>}
      {schema.length > 0 && <div className="dynamic-fields"><h4>Data Transaksi</h4>{schema.map(f=><label key={f.name}><span>{f.label}{f.required?' *':''}</span>{f.type==='select'?<select value={inputs[f.name]||''} onChange={e=>setInputs({...inputs,[f.name]:e.target.value})}><option value="">Pilih...</option>{(f.options||[]).map(o=><option key={o}>{o}</option>)}</select>:f.type==='textarea'?<textarea value={inputs[f.name]||''} onChange={e=>setInputs({...inputs,[f.name]:e.target.value})}/>:<input type={f.type==='phone'?'tel':f.type||'text'} value={inputs[f.name]||''} onChange={e=>setInputs({...inputs,[f.name]:e.target.value})}/>}</label>)}</div>}
      <div className="quick-actions">{product.detail_button_url && <a className="btn-secondary full" target="_blank" rel="noreferrer" href={product.detail_button_url}><ExternalLink size={17}/>{product.detail_button_label || 'Detail Produk'}</a>}<button className="btn-primary full large" onClick={submit}><ShoppingCart/> Tambah ke Keranjang</button></div>
    </div>
  </div></div>
}
