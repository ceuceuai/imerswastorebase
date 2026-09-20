import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { configuredStoreId, supabase, supabaseEnabled } from '../lib/supabase'
import { resolveAccount } from '../lib/account'
import '../auth-login.css'

const REMEMBER_EMAIL_KEY = 'imerswastore_remembered_email'

export default function LoginPage(){
  const [email,setEmail]=useState(()=>localStorage.getItem(REMEMBER_EMAIL_KEY)||'')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [remember,setRemember]=useState(()=>Boolean(localStorage.getItem(REMEMBER_EMAIL_KEY)))
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState({type:'',text:''})
  const [brand,setBrand]=useState({
    name:'iMersWAStore',
    logo:'',
    primary:'#0f67ff',
    tagline:'Belanja Mudah, Untung Setiap Hari',
  })
  const nav=useNavigate()

  useEffect(()=>{
    let alive=true
    async function loadBrand(){
      if(!supabaseEnabled||!configuredStoreId)return
      try{
        const [storeRes,brandRes,settingsRes]=await Promise.all([
          supabase.from('stores').select('name,logo_url,theme_color').eq('id',configuredStoreId).maybeSingle(),
          supabase.from('brand_settings').select('app_name,logo_url,primary_color').eq('store_id',configuredStoreId).maybeSingle(),
          supabase.from('store_settings').select('tagline').eq('store_id',configuredStoreId).maybeSingle(),
        ])
        if(!alive)return
        setBrand(prev=>({
          name:brandRes.data?.app_name||storeRes.data?.name||prev.name,
          logo:brandRes.data?.logo_url||storeRes.data?.logo_url||'',
          primary:brandRes.data?.primary_color||storeRes.data?.theme_color||prev.primary,
          tagline:settingsRes.data?.tagline||prev.tagline,
        }))
      }catch(e){
        console.warn('Brand login gagal dimuat:',e)
      }
    }
    loadBrand()
    return()=>{alive=false}
  },[])

  const pageStyle=useMemo(()=>({'--login-primary':brand.primary||'#0f67ff'}),[brand.primary])

  const submit=async e=>{
    e.preventDefault()
    setMessage({type:'',text:''})
    if(remember)localStorage.setItem(REMEMBER_EMAIL_KEY,email.trim())
    else localStorage.removeItem(REMEMBER_EMAIL_KEY)

    if(!supabaseEnabled){
      nav('/owner')
      return
    }

    setBusy(true)
    try{
      const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password})
      if(error)throw error
      const acc=await resolveAccount()
      if(acc.account_type==='admin'){
        nav('/owner',{replace:true})
        return
      }
      if(acc.account_type==='customer'){
        nav('/account',{replace:true})
        return
      }
      if(acc.account_type==='disabled')throw new Error('Akses akun ini sedang dinonaktifkan. Hubungi owner toko.')
      await supabase.auth.signOut()
      throw new Error('Akun berhasil login, tetapi belum terhubung ke akses toko.')
    }catch(err){
      setMessage({type:'error',text:err?.message||'Login gagal. Silakan coba lagi.'})
    }finally{
      setBusy(false)
    }
  }

  return <main className="login-v3" style={pageStyle}>
    <div className="login-v3-orb login-v3-orb-a"/>
    <div className="login-v3-orb login-v3-orb-b"/>

    <section className="login-v3-card">
      <div className="login-v3-brand">
        <div className="login-v3-logo">
          {brand.logo?<img src={brand.logo} alt={brand.name}/>:<ShoppingBag/>}
        </div>
        <div className="login-v3-brand-copy">
          <strong>{brand.name}</strong>
          <span>{brand.tagline}</span>
        </div>
      </div>

      <div className="login-v3-heading">
        <h1>Masuk ke Akun</h1>
        <p>Masukkan email dan password untuk melanjutkan.</p>
      </div>

      {message.text&&<div className={`login-v3-alert ${message.type}`}><span>!</span><div>{message.text}</div></div>}

      <form className="login-v3-form" onSubmit={submit}>
        <label>
          <span className="login-v3-label"><Mail/> Email</span>
          <div className="login-v3-input-wrap">
            <Mail className="login-v3-field-icon"/>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="nama@email.com"
            />
          </div>
        </label>

        <label>
          <span className="login-v3-label"><LockKeyhole/> Password</span>
          <div className="login-v3-input-wrap">
            <LockKeyhole className="login-v3-field-icon"/>
            <input
              type={showPassword?'text':'password'}
              autoComplete="current-password"
              required={supabaseEnabled}
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="Masukkan password"
            />
            <button
              className="login-v3-eye"
              type="button"
              aria-label={showPassword?'Sembunyikan password':'Tampilkan password'}
              onClick={()=>setShowPassword(v=>!v)}
            >
              {showPassword?<EyeOff/>:<Eye/>}
            </button>
          </div>
        </label>

        <div className="login-v3-options">
          <label className="login-v3-remember">
            <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>
            <span><i/> Ingat email saya</span>
          </label>
          <Link to="/forgot-password">Lupa password?</Link>
        </div>

        <button className="login-v3-submit" disabled={busy}>
          {busy?'Memverifikasi akun...':'Masuk'}
        </button>
      </form>

      <div className="login-v3-divider"><span>Belum punya akun?</span></div>

      <Link className="login-v3-register" to="/register">
        <span><UserRound/></span>
        <div>
          <b>Daftar akun pelanggan</b>
          <small>Buat akun untuk menyimpan profil dan riwayat transaksi.</small>
        </div>
      </Link>

      <Link className="login-v3-back" to="/"><ArrowLeft/> Kembali ke toko</Link>

      {!supabaseEnabled&&<div className="login-v3-demo">Mode demo aktif karena konfigurasi Supabase belum tersedia.</div>}
    </section>
  </main>
}
