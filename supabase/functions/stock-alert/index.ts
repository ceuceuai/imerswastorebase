import { corsHeaders, json } from '../_shared/cors.ts'
import { serviceClient, userClient } from '../_shared/supabase.ts'
import { processLowStockAlert } from '../_shared/stock.ts'

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  try{
    const auth=req.headers.get('Authorization')
    if(!auth)throw new Error('Unauthorized')
    const client=userClient(auth)
    const {data:userData,error:userError}=await client.auth.getUser()
    if(userError||!userData?.user)throw new Error('Unauthorized')
    const {data:roleData,error:roleError}=await client.rpc('resolve_account_role')
    if(roleError)throw roleError
    if(roleData?.account_type!=='admin'||roleData?.active===false||!roleData?.store_id)throw new Error('Akses staff/owner toko diperlukan')
    const body=await req.json().catch(()=>({}))
    const result=await processLowStockAlert(serviceClient(),String(roleData.store_id),{force:!!body.force})
    return json(result)
  }catch(error){return json({ok:false,message:error instanceof Error?error.message:'Pengecekan stok gagal'},400)}
})
