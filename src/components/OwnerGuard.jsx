import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase, supabaseEnabled } from '../lib/supabase'
import { resolveAccount } from '../lib/account'
import { canAccessRoute } from '../lib/permissions'

export default function OwnerGuard({children}){
  const [state,setState]=useState(supabaseEnabled?'loading':'ok')
  const [account,setAccount]=useState(supabaseEnabled?null:{authenticated:true,account_type:'admin',role:'owner',active:true,permissions:{all:true}})
  const location=useLocation()
  useEffect(()=>{
    if(!supabaseEnabled)return
    let mounted=true
    const check=async()=>{
      try{
        const {data}=await supabase.auth.getSession()
        if(!mounted)return
        if(!data?.session){setState('login');return}
        const a=await resolveAccount()
        if(!mounted)return
        setAccount(a)
        setState(a.account_type==='admin'?'ok':a.account_type==='customer'?'customer':a.account_type==='disabled'?'disabled':'login')
      }catch{if(mounted)setState('login')}
    }
    check()
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{if(!mounted)return;if(!session)setState('login')})
    return()=>{mounted=false;listener?.subscription?.unsubscribe()}
  },[])
  if(state==='loading')return <div className="auth-page"><div className="auth-card"><h2>Memeriksa akses dashboard...</h2></div></div>
  if(state==='login')return <Navigate to="/login" replace/>
  if(state==='customer')return <Navigate to="/account" replace/>
  if(state==='disabled')return <div className="auth-page"><div className="auth-card"><h2>Akses staff dinonaktifkan</h2><p>Hubungi owner toko untuk mengaktifkan kembali akun ini.</p><button className="btn-primary" onClick={async()=>{await supabase.auth.signOut();location.href='/login'}}>Keluar</button></div></div>
  if(!canAccessRoute(account,location.pathname))return <Navigate to="/owner" replace/>
  return children
}
