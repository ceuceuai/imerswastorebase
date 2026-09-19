import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { configuredStoreId, supabase, supabaseEnabled } from '../lib/supabase'
import { resolveAccount } from '../lib/account'
import '../auth-login.css'

export default function LoginPage(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState({type:'',text:''})
  const [brand,setBrand]=useState({name:'iMersWAStore',logo:'',primary:'#0f67ff',tagline:'Kelola toko lebih cepat, rapi, dan aman.'})
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
      }catch(e){console.warn('Brand login gagal dimuat:',e)}
    }
    loadBrand()
    return()=>{alive=false}
  },[])

  const pageStyle=useMemo(()=>({'--login-primary':brand.primary||'#0f67ff'}),[brand.primary])

  const submit=async e=>{
    e.preventDefault()
    setMessage({type:'',text:''})
    if(!supabaseEnabled){nav('/owner');return}
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
      throw new Error('Akun berhasil login, tetapi belum terhubung ke akses toko. Jalankan SQL Step 23 Owner Auth Repair.')
    }catch(err){
      setMessage({type:'error',text:err?.message||'Login gagal. Silakan coba lagi.'})
    }finally{
      setBusy(false)
    }
  }

  return <main className="login-premium" style={pageStyle}>
    <div className="login-premium-shell">
      <section className="login-premium-showcase">
        <div className="login-premium-orb login-premium-orb-one"/>
        <div className="login-premium-orb login-premium-orb-two"/>
        <Link className="login-premium-back" to="/"><ArrowLeft/> Kembali ke Toko</Link>
        <div className="login-premium-showcase-content">
          <div className="login-premium-badge"><ShieldCheck/> SINGLE STORE COMMERCE</div>
          <h1>Kelola toko dari satu dashboard yang lebih pintar.</h1>
          <p>Produk, pesanan, POS, stok, artikel, pelanggan, broadcast dan laporan tetap dalam satu alur kerja.</p>
          <div className="login-premium-points">
            <span><i>01</i><b>Dashboard Premium</b><small>Tema dan branding mengikuti toko Anda.</small></span>
            <span><i>02</i><b>Operasional Terpadu</b><small>Owner dan staff bekerja dari sistem yang sama.</small></span>
            <span><i>03</i><b>Supabase Connected</b><small>Auth, data dan keamanan terhubung langsung.</small></span>
          </div>
        </div>
      </section>

      <section className="login-premium-panel">
        <div className="login-premium-card">
          <div className="login-premium-brand">
            <div className="login-premium-logo">{brand.logo?<img src={brand.logo} alt={brand.name}/>:<ShoppingBag/>}</div>
            <div><strong>{brand.name}</strong><small>{brand.tagline}</small></div>
          </div>

          <div className="login-premium-heading">
            <span>AKUN & DASHBOARD</span>
            <h2>Selamat Datang Kembali</h2>
            <p>Masuk menggunakan akun owner, staff, kasir, atau pelanggan terdaftar.</p>
          </div>

          {message.text&&<div className={`login-premium-alert ${message.type}`}>{message.text}</div>}

          <form className="login-premium-form" onSubmit={submit}>
            <label>
              <span><Mail/> Email</span>
              <div className="login-premium-input"><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com"/></div>
            </label>
            <label>
              <div className="login-premium-label-row"><span><LockKeyhole/> Password</span><Link to="/forgot-password">Lupa password?</Link></div>
              <div className="login-premium-input password"><input type={showPassword?'text':'password'} autoComplete="current-password" required={supabaseEnabled} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan password"/><button type="button" aria-label={showPassword?'Sembunyikan password':'Tampilkan password'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff/>:<Eye/>}</button></div>
            </label>
            <button className="login-premium-submit" disabled={busy}>{busy?'Memverifikasi...':'Masuk ke Dashboard'}</button>
          </form>

          <div className="login-premium-register">
            <UserRound/>
            <div><b>Belum punya akun?</b><small>Daftar sebagai pelanggan toko.</small></div>
            <Link to="/register">Daftar</Link>
          </div>

          {!supabaseEnabled&&<div className="login-premium-demo">Mode demo aktif karena konfigurasi Supabase belum tersedia.</div>}
          <p className="login-premium-footnote">Akses dashboard dilindungi Supabase Auth.</p>
        </div>
      </section>
    </div>
  </main>
}
