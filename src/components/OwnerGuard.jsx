import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, supabaseEnabled } from '../lib/supabase'

export default function OwnerGuard({children}){
  const [state,setState]=useState(supabaseEnabled?'loading':'ok')
  useEffect(()=>{
    if(!supabaseEnabled)return
    let mounted=true
    supabase.auth.getSession().then(({data})=>{
      if(mounted)setState(data?.session?'ok':'login')
    })
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(mounted)setState(session?'ok':'login')
    })
    return()=>{mounted=false;listener?.subscription?.unsubscribe()}
  },[])
  if(state==='loading')return <div className="auth-page"><div className="auth-card"><h2>Memeriksa sesi...</h2></div></div>
  if(state==='login')return <Navigate to="/login" replace/>
  return children
}
