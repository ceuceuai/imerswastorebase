import { supabase, supabaseEnabled } from './supabase'
export async function resolveAccount(){
  if(!supabaseEnabled)return {authenticated:true,account_type:'admin',role:'owner'}
  const {data:{session}}=await supabase.auth.getSession()
  if(!session)return {authenticated:false}
  const {data,error}=await supabase.rpc('resolve_account_role')
  if(error)throw error
  return data||{authenticated:true,account_type:'unknown'}
}
export function normalizePhone(v=''){let x=String(v).replace(/\D/g,'');if(x.startsWith('0'))x='62'+x.slice(1);return x}
