import { corsHeaders, json } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'
import { sendEmail, sendWhatsApp } from '../_shared/providers.ts'
import { processLowStockAlert } from '../_shared/stock.ts'

function rupiah(n: unknown){return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0))}
function tpl(value: string | null | undefined, vars: Record<string,string>){let out=String(value||'');for(const[k,v]of Object.entries(vars))out=out.replaceAll(`{${k}}`,v);return out}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  try{
    const body=await req.json();const event=String(body.event||'order_created');const orderId=String(body.order_id||'');const token=String(body.notification_token||'')
    if(!orderId||!token)return json({ok:false,message:'Order/token notifikasi wajib diisi'},400)
    const svc=serviceClient()
    const {data:order,error:oErr}=await svc.from('orders').select('*,customers(name,phone,email)').eq('id',orderId).eq('notification_token',token).maybeSingle()
    if(oErr)throw oErr;if(!order)throw new Error('Token notifikasi tidak valid')
    const [{data:auto,error:aErr},{data:waSet},{data:waSecret},{data:emailSet},{data:emailSecret},{data:store}] = await Promise.all([
      svc.from('automation_settings').select('*').eq('store_id',order.store_id).maybeSingle(),
      svc.from('integration_settings').select('*').eq('store_id',order.store_id).eq('channel','whatsapp').maybeSingle(),
      svc.from('integration_secrets').select('secrets').eq('store_id',order.store_id).eq('channel','whatsapp').maybeSingle(),
      svc.from('integration_settings').select('*').eq('store_id',order.store_id).eq('channel','email').maybeSingle(),
      svc.from('integration_secrets').select('secrets').eq('store_id',order.store_id).eq('channel','email').maybeSingle(),
      svc.from('stores').select('name,email,whatsapp').eq('id',order.store_id).maybeSingle(),
    ])
    if(aErr)throw aErr
    if(!auto)return json({ok:true,message:'Otomasi notifikasi belum dikonfigurasi.'})
    const customer=order.customers||{}
    if(event==='order_created'&&order.notified_at)return json({ok:true,already_processed:true,message:'Notifikasi order sudah pernah diproses.'})
    let confirmation:any=null
    if(event==='payment_confirmation'){
      const confirmationId=String(body.confirmation_id||'')
      if(!confirmationId)throw new Error('confirmation_id wajib diisi')
      const {data:conf,error:confErr}=await svc.from('payment_confirmations').select('*').eq('id',confirmationId).eq('order_id',order.id).maybeSingle()
      if(confErr)throw confErr;if(!conf)throw new Error('Konfirmasi pembayaran tidak ditemukan')
      if(conf.notified_at)return json({ok:true,already_processed:true,message:'Notifikasi pembayaran sudah pernah diproses.'})
      confirmation=conf
    }
    const vars={order_number:order.order_number||'',name:customer.name||'Pelanggan',total:rupiah(order.total_amount),amount:rupiah(confirmation?.amount||body.amount||order.total_amount),store:store?.name||'Toko'}
    const waIntegration=waSet?{...waSet,secrets:waSecret?.secrets||{}}:null
    const emailIntegration=emailSet?{...emailSet,secrets:emailSecret?.secrets||{}}:null
    const results:any[]=[]

    if(event==='order_created'){
      if(auto.whatsapp_enabled&&auto.order_notification&&waIntegration?.enabled&&auto.whatsapp_recipient){try{await sendWhatsApp(waIntegration,auto.whatsapp_recipient,tpl(auto.order_notification_template,vars));results.push({channel:'wa-admin',ok:true})}catch(e){results.push({channel:'wa-admin',ok:false,error:e instanceof Error?e.message:'gagal'})}}
      if(auto.whatsapp_enabled&&waIntegration?.enabled&&customer.phone&&auto.customer_order_template){try{await sendWhatsApp(waIntegration,customer.phone,tpl(auto.customer_order_template,vars));results.push({channel:'wa-customer',ok:true})}catch(e){results.push({channel:'wa-customer',ok:false,error:e instanceof Error?e.message:'gagal'})}}
      if(auto.email_enabled&&auto.order_notification&&emailIntegration?.enabled){const target=auto.email_recipient||store?.email;if(target){try{await sendEmail(emailIntegration,target,tpl(auto.email_order_subject,vars),tpl(auto.email_order_template,vars));results.push({channel:'email-admin',ok:true})}catch(e){results.push({channel:'email-admin',ok:false,error:e instanceof Error?e.message:'gagal'})}}}
      await svc.from('orders').update({notified_at:new Date().toISOString()}).eq('id',order.id)
      try{const stockResult=await processLowStockAlert(svc,order.store_id);results.push({channel:'stock-alert',ok:true,detail:stockResult})}catch(e){results.push({channel:'stock-alert',ok:false,error:e instanceof Error?e.message:'gagal'})}
    }

    if(event==='payment_confirmation'&&auto.whatsapp_enabled&&auto.payment_notification&&waIntegration?.enabled&&auto.whatsapp_recipient){try{await sendWhatsApp(waIntegration,auto.whatsapp_recipient,tpl(auto.payment_notification_template,vars));results.push({channel:'wa-payment',ok:true})}catch(e){results.push({channel:'wa-payment',ok:false,error:e instanceof Error?e.message:'gagal'})}}
    if(event==='payment_confirmation'&&confirmation)await svc.from('payment_confirmations').update({notified_at:new Date().toISOString()}).eq('id',confirmation.id)
    return json({ok:true,results,message:'Notifikasi diproses.'})
  }catch(error){return json({ok:false,message:error instanceof Error?error.message:'Notifikasi gagal'},400)}
})
