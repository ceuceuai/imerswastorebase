import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { rupiah } from '../lib/format'
import { configuredStoreId, supabase, supabaseEnabled } from '../lib/supabase'

export default function CheckoutPage(){
  const {cart,subtotal,updateQty,removeItem,clearCart}=useCart()
  const [form,setForm]=useState({name:'',phone:'',email:'',address:'',notes:''})
  const [busy,setBusy]=useState(false)
  const nav=useNavigate()

  const checkout=async e=>{
    e.preventDefault(); if(!cart.length)return
    setBusy(true)
    try{
      if(!supabaseEnabled || !configuredStoreId){
        alert('Demo mode: isi VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY dan VITE_STORE_ID untuk menyimpan order.')
        return
      }
      const items=cart.map(i=>({product_id:i.product.id,qty:i.qty,customer_inputs:i.customer_inputs||{}}))
      const {data,error}=await supabase.rpc('create_store_order',{
        p_store_id:configuredStoreId,
        p_customer:form,
        p_items:items,
      })
      if(error)throw error
      clearCart()
      alert(`Order berhasil dibuat: ${data?.order_number||data?.id||'OK'}`)
      nav('/')
    }catch(err){alert(err.message||'Checkout gagal')}finally{setBusy(false)}
  }

  return <div className="checkout-page"><div className="checkout-top container-wide"><Link to="/" className="brand simple"><span>iM</span><b>iMersWAStore</b></Link><Link to="/">← Kembali ke toko</Link></div><main className="checkout-grid container-wide"><section><h1><ShoppingBag/> Keranjang & Checkout</h1>{!cart.length?<div className="empty-box"><h3>Keranjang masih kosong</h3><Link className="btn-primary" to="/">Mulai Belanja</Link></div>:cart.map(item=><div className="cart-row" key={item.key}><img src={item.product.image_url}/><div className="cart-info"><h3>{item.product.name}</h3><b>{rupiah(item.product.price)}</b>{Object.keys(item.customer_inputs||{}).length>0&&<small>{Object.entries(item.customer_inputs).map(([k,v])=>`${k}: ${v}`).join(' • ')}</small>}</div><div className="qty"><button onClick={()=>updateQty(item.key,item.qty-1)}><Minus/></button><span>{item.qty}</span><button onClick={()=>updateQty(item.key,item.qty+1)}><Plus/></button></div><button className="trash" onClick={()=>removeItem(item.key)}><Trash2/></button></div>)}</section><aside className="checkout-card"><h2>Data Pembeli</h2><form onSubmit={checkout}><label>Nama<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>WhatsApp<input required type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Alamat / Catatan Pengiriman<textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>Catatan<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="checkout-total"><span>Subtotal</span><strong>{rupiah(subtotal)}</strong></div><button disabled={busy||!cart.length} className="btn-primary full large">{busy?'Memproses...':'Buat Pesanan'}</button></form></aside></main></div>
}
