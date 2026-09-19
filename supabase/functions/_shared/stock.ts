import { sendEmail, sendWhatsApp } from './providers.ts'

function tpl(value:string|null|undefined, vars:Record<string,string>){let out=String(value||'');for(const[k,v]of Object.entries(vars))out=out.replaceAll(`{${k}}`,v);return out}

async function sha256(value:string){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
}

export async function processLowStockAlert(svc:any, storeId:string, opts:{force?:boolean}={}){
  const {data:auto,error:aErr}=await svc.from('automation_settings').select('*').eq('store_id',storeId).order('created_at').limit(1).maybeSingle()
  if(aErr)throw aErr
  if(!auto?.stock_alert_notification)return {ok:true,skipped:true,message:'Notifikasi stok rendah nonaktif.'}
  const threshold=Number(auto.low_stock_threshold??5)

  const {data:products,error:pErr}=await svc.from('products').select('id,name,sku,stock,type,status').eq('store_id',storeId).eq('status',true).eq('type','physical').lte('stock',threshold).order('stock',{ascending:true}).limit(100)
  if(pErr)throw pErr
  const {data:allPhysical,error:apErr}=await svc.from('products').select('id,name,sku,type,status').eq('store_id',storeId).eq('status',true).eq('type','physical').limit(1000)
  if(apErr)throw apErr
  const productMap=new Map((allPhysical||[]).map((p:any)=>[p.id,p]))
  const physicalIds=Array.from(productMap.keys())
  let variants:any[]=[]
  if(physicalIds.length){
    const {data:v,error:vErr}=await svc.from('product_variants').select('id,product_id,name,sku,stock,active').in('product_id',physicalIds).eq('active',true).lte('stock',threshold).order('stock',{ascending:true}).limit(100)
    if(vErr)throw vErr
    variants=v||[]
  }

  const lines:string[]=[]
  for(const p of products||[]) lines.push(`• ${p.name}${p.sku?` [${p.sku}]`:''}: stok ${Number(p.stock||0)}`)
  for(const v of variants){const p:any=productMap.get(v.product_id);lines.push(`• ${p?.name||'Produk'} - ${v.name}${v.sku?` [${v.sku}]`:''}: stok ${Number(v.stock||0)}`)}
  if(!lines.length)return {ok:true,skipped:true,message:'Tidak ada stok rendah.',count:0}

  const signature=await sha256(lines.join('|'))
  const lastAt=auto.last_stock_alert_at?new Date(auto.last_stock_alert_at).getTime():0
  const withinSixHours=lastAt&&Date.now()-lastAt<6*60*60*1000
  if(!opts.force&&auto.last_stock_alert_signature===signature&&withinSixHours){return {ok:true,skipped:true,message:'Alert stok yang sama sudah dikirim dalam 6 jam terakhir.',count:lines.length}}

  const [{data:waSet},{data:waSecret},{data:emailSet},{data:emailSecret},{data:store}] = await Promise.all([
    svc.from('integration_settings').select('*').eq('store_id',storeId).eq('channel','whatsapp').maybeSingle(),
    svc.from('integration_secrets').select('secrets').eq('store_id',storeId).eq('channel','whatsapp').maybeSingle(),
    svc.from('integration_settings').select('*').eq('store_id',storeId).eq('channel','email').maybeSingle(),
    svc.from('integration_secrets').select('secrets').eq('store_id',storeId).eq('channel','email').maybeSingle(),
    svc.from('stores').select('name,email,whatsapp').eq('id',storeId).maybeSingle(),
  ])
  const vars={store:store?.name||'Toko',threshold:String(threshold),items:lines.slice(0,30).join('\n'),count:String(lines.length)}
  const message=tpl(auto.low_stock_notification_template||'Stok rendah di {store}. Batas: {threshold}.\n{items}',vars)
  const results:any[]=[]

  if(auto.whatsapp_enabled&&waSet?.enabled&&auto.whatsapp_recipient){try{await sendWhatsApp({...waSet,secrets:waSecret?.secrets||{}},auto.whatsapp_recipient,message);results.push({channel:'wa-stock',ok:true})}catch(e){results.push({channel:'wa-stock',ok:false,error:e instanceof Error?e.message:'gagal'})}}
  const emailTarget=auto.email_recipient||store?.email
  if(auto.email_enabled&&emailSet?.enabled&&emailTarget){try{await sendEmail({...emailSet,secrets:emailSecret?.secrets||{}},emailTarget,`Stok Rendah - ${store?.name||'Toko'}`,`<p><b>Stok rendah terdeteksi.</b></p><p>Batas stok: ${threshold}</p><pre>${lines.join('\n')}</pre>`);results.push({channel:'email-stock',ok:true})}catch(e){results.push({channel:'email-stock',ok:false,error:e instanceof Error?e.message:'gagal'})}}

  await svc.from('automation_settings').update({last_stock_alert_at:new Date().toISOString(),last_stock_alert_signature:signature,updated_at:new Date().toISOString()}).eq('id',auto.id)
  return {ok:true,count:lines.length,items:lines,results,message:'Pengecekan stok rendah selesai.'}
}
