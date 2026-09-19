import { CheckCircle2, CreditCard, MapPin, Minus, Plus, Search, ShoppingBag, Tag, Trash2, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useCart } from '../context/CartContext'
import { rupiah } from '../lib/format'
import { configuredStoreId, supabase, supabaseEnabled } from '../lib/supabase'

const baseForm={name:'',phone:'',email:'',address:'',notes:''}
export default function CheckoutPage(){
  const {cart,subtotal,weight,updateQty,removeItem,clearCart}=useCart()
  const [form,setForm]=useState(baseForm),[busy,setBusy]=useState(false),[paymentMethods,setPaymentMethods]=useState([]),[shippingMethods,setShippingMethods]=useState([]),[paymentId,setPaymentId]=useState(''),[shippingId,setShippingId]=useState(''),[config,setConfig]=useState({}),[couponCode,setCouponCode]=useState(''),[coupon,setCoupon]=useState(null),[success,setSuccess]=useState(null)
  const [destinationQuery,setDestinationQuery]=useState(''),[destinations,setDestinations]=useState([]),[destination,setDestination]=useState(null),[shippingQuotes,setShippingQuotes]=useState([]),[shippingQuote,setShippingQuote]=useState(null),[shippingBusy,setShippingBusy]=useState(false),[rajaEnabled,setRajaEnabled]=useState(null)

  useEffect(()=>{if(!supabaseEnabled||!configuredStoreId)return;(async()=>{
    const [p,s,st,userRes]=await Promise.all([
      supabase.from('payment_settings').select('*').eq('store_id',configuredStoreId).eq('enabled',true).order('sort_order').order('created_at'),
      supabase.from('shipping_settings').select('*').eq('store_id',configuredStoreId).eq('enabled',true).order('created_at'),
      supabase.from('store_settings').select('checkout_config').eq('store_id',configuredStoreId).maybeSingle(),
      supabase.auth.getUser(),
    ])
    if(p.error)throw p.error;if(s.error)throw s.error;if(st.error)throw st.error
    setPaymentMethods(p.data||[]);setShippingMethods(s.data||[]);setConfig(st.data?.checkout_config||{})
    if(p.data?.[0])setPaymentId(p.data[0].id)
    if(userRes.data?.user){const{data:c}=await supabase.from('customers').select('name,phone,email,address').eq('store_id',configuredStoreId).eq('auth_user_id',userRes.data.user.id).maybeSingle();if(c)setForm(f=>({...f,name:c.name||'',phone:c.phone||'',email:c.email||userRes.data.user.email||'',address:c.address||''}))}
  })().catch(e=>console.error(e))},[])

  const manualShipping=shippingMethods.find(x=>x.id===shippingId)
  const shippingCost=shippingQuote?Number(shippingQuote.cost||0):Number(manualShipping?.price||0)
  const discount=Number(coupon?.discount_amount||0)
  const taxable=Math.max(0,subtotal-discount)
  const tax=config.tax_enabled?taxable*(Number(config.tax_percent||0)/100):0
  const service=config.service_fee_enabled?(config.service_fee_type==='percent'?taxable*(Number(config.service_fee_value||0)/100):Number(config.service_fee_value||0)):0
  const total=Math.max(0,taxable+shippingCost+tax+service)
  const chosenPayment=paymentMethods.find(x=>x.id===paymentId)

  const applyCoupon=async()=>{if(!couponCode.trim()){setCoupon(null);return}try{const{data,error}=await supabase.rpc('validate_store_coupon',{p_store_id:configuredStoreId,p_code:couponCode,p_subtotal:subtotal});if(error)throw error;if(!data?.valid){setCoupon(null);return alert(data?.message||'Kupon tidak valid')}setCoupon(data)}catch(e){alert(e.message)}}
  const searchDestination=async()=>{if(!destinationQuery.trim())return;setShippingBusy(true);try{const{data,error}=await supabase.functions.invoke('shipping-rates',{body:{action:'search',search:destinationQuery}});if(error)throw error;if(data?.enabled===false){setRajaEnabled(false);return alert(data.message||'RajaOngkir belum diaktifkan.')}setRajaEnabled(true);setDestinations(data?.items||[])}catch(e){setRajaEnabled(false);alert(`RajaOngkir belum siap / gagal: ${e.message}`)}finally{setShippingBusy(false)}}
  const chooseDestination=async d=>{setDestination(d);setDestinations([]);setShippingBusy(true);try{const{data,error}=await supabase.functions.invoke('shipping-rates',{body:{action:'quote',destination_id:String(d.id),weight:Math.max(1,Math.ceil(weight||1000))}});if(error)throw error;setRajaEnabled(data?.enabled!==false);setShippingQuotes(data?.items||[])}catch(e){alert(`Gagal cek ongkir: ${e.message}`)}finally{setShippingBusy(false)}}

  const checkout=async e=>{e.preventDefault();if(!cart.length)return;if(!paymentId)return alert('Pilih metode pembayaran.');setBusy(true);try{
    if(!supabaseEnabled||!configuredStoreId)throw new Error('Supabase belum dikonfigurasi.')
    const items=cart.map(i=>({product_id:i.product.id,variant_id:i.variant_id||null,qty:i.qty,customer_inputs:i.customer_inputs||{}}))
    const checkoutData={payment_id:paymentId,coupon_code:coupon?.valid?couponCode:null,shipping_id:shippingQuote?null:(shippingId||null),shipping_quote_token:shippingQuote?.quote_token||null}
    const {data,error}=await supabase.rpc('create_store_order_v2',{p_store_id:configuredStoreId,p_customer:form,p_items:items,p_checkout:checkoutData});if(error)throw error
    if(data?.id&&data?.notification_token){supabase.functions.invoke('order-notify',{body:{event:'order_created',order_id:data.id,notification_token:data.notification_token}}).catch(()=>{})}
    setSuccess({...data,payment:chosenPayment});clearCart()
  }catch(err){alert(err.message||'Checkout gagal')}finally{setBusy(false)}}

  if(success)return <div className="checkout-page"><div className="checkout-top container-wide"><Link to="/" className="brand simple"><span>iM</span><b>iMersWAStore</b></Link><Link to="/track-order">Cek Pesanan →</Link></div><main className="checkout-success container-wide"><CheckCircle2/><span>PESANAN BERHASIL</span><h1>{success.order_number}</h1><p>Simpan nomor order ini untuk pengecekan status pesanan.</p><div className="success-summary"><div><span>Total</span><b>{rupiah(success.total_amount)}</b></div><div><span>Pembayaran</span><b>{success.payment?.provider_name||success.payment_method||'-'}</b></div></div>{success.payment&&<div className="payment-instruction"><h3>Instruksi Pembayaran</h3>{success.payment.qr_image&&<img src={success.payment.qr_image} alt="QRIS"/>}<p>{success.payment.account_number&&<><b>{success.payment.account_number}</b><br/></>}{success.payment.account_name&&<>a/n {success.payment.account_name}<br/></>}{success.payment.instructions}</p></div>}<div className="checkout-success-actions"><Link className="btn-primary" to="/payment-confirmation">Konfirmasi Pembayaran</Link><Link className="btn-secondary" to="/">Kembali Belanja</Link></div></main></div>

  return <div className="checkout-page"><div className="checkout-top container-wide"><Link to="/" className="brand simple"><span>iM</span><b>iMersWAStore</b></Link><Link to="/">← Kembali ke toko</Link></div><main className="checkout-grid container-wide"><section><h1><ShoppingBag/> Keranjang & Checkout</h1>{!cart.length?<div className="empty-box"><h3>Keranjang masih kosong</h3><Link className="btn-primary" to="/">Mulai Belanja</Link></div>:cart.map(item=><div className="cart-row" key={item.key}><img src={item.product.image_url}/><div className="cart-info"><h3>{item.product.name}</h3>{item.product.selected_variant&&<small>Varian: {item.product.selected_variant.name}</small>}<b>{rupiah(item.product.price)}</b>{Object.keys(item.customer_inputs||{}).length>0&&<small>{Object.entries(item.customer_inputs).map(([k,v])=>`${k}: ${v}`).join(' • ')}</small>}</div><div className="qty"><button onClick={()=>updateQty(item.key,item.qty-1)}><Minus/></button><span>{item.qty}</span><button onClick={()=>updateQty(item.key,item.qty+1)}><Plus/></button></div><button className="trash" onClick={()=>removeItem(item.key)}><Trash2/></button></div>)}</section><aside className="checkout-card"><h2>Data Pembeli</h2><form onSubmit={checkout}><label>Nama<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>WhatsApp<input required type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Alamat / Catatan Pengiriman<textarea value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
      <div className="checkout-block"><h3><Tag/> Kupon</h3><div className="inline-input"><input value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())} placeholder="KODE PROMO"/><button type="button" className="btn-outline" onClick={applyCoupon}>Pakai</button></div>{coupon?.valid&&<small className="coupon-ok">Kupon aktif: -{rupiah(discount)}</small>}</div>
      <div className="checkout-block"><h3><Truck/> Pengiriman</h3>{shippingMethods.length>0&&<select value={shippingId} onChange={e=>{setShippingId(e.target.value);setShippingQuote(null)}}><option value="">Pilih Ongkir Manual</option>{shippingMethods.map(s=><option key={s.id} value={s.id}>{s.name} {s.area?`- ${s.area}`:''} • {rupiah(s.price)}</option>)}</select>}<div className="raja-box"><b>RajaOngkir / Komerce</b><div className="inline-input"><input value={destinationQuery} onChange={e=>setDestinationQuery(e.target.value)} placeholder="Cari kecamatan / kota / kode pos"/><button type="button" className="btn-outline" disabled={shippingBusy} onClick={searchDestination}><Search/></button></div>{destinations.length>0&&<div className="destination-results">{destinations.map(d=><button type="button" key={d.id} onClick={()=>chooseDestination(d)}><MapPin/><span><b>{d.label||d.name}</b><small>{d.zip_code||''}</small></span></button>)}</div>}{destination&&<div className="selected-destination"><MapPin/> {destination.label||destination.name}</div>}{shippingQuotes.length>0&&<div className="quote-grid">{shippingQuotes.map((q,i)=><button type="button" key={`${q.courier}-${q.service}-${i}`} className={shippingQuote===q?'active':''} onClick={()=>{setShippingQuote(q);setShippingId('')}}><b>{q.courier} {q.service}</b><span>{rupiah(q.cost)}</span><small>{q.etd||''}</small></button>)}</div>}</div></div>
      <div className="checkout-block"><h3><CreditCard/> Pembayaran</h3><div className="payment-method-grid">{paymentMethods.map(p=><button key={p.id} type="button" className={paymentId===p.id?'active':''} onClick={()=>setPaymentId(p.id)}>{p.qr_image?<img src={p.qr_image} alt=""/>:<CreditCard/>}<span><b>{p.provider_name||p.payment_type}</b><small>{p.account_number||p.instructions||''}</small></span></button>)}</div></div>
      <label>Catatan<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      <div className="checkout-breakdown"><div><span>Subtotal</span><b>{rupiah(subtotal)}</b></div>{discount>0&&<div><span>Diskon</span><b>-{rupiah(discount)}</b></div>}{shippingCost>0&&<div><span>Ongkir</span><b>{rupiah(shippingCost)}</b></div>}{tax>0&&<div><span>PPN</span><b>{rupiah(tax)}</b></div>}{service>0&&<div><span>Biaya Layanan</span><b>{rupiah(service)}</b></div>}<div className="checkout-total"><span>Total</span><strong>{rupiah(total)}</strong></div></div><button disabled={busy||!cart.length} className="btn-primary full large">{busy?'Memproses...':'Buat Pesanan'}</button></form></aside></main></div>
}
