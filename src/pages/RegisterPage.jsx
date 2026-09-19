import { ArrowLeft, LockKeyhole, Mail, Phone, Store, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { configuredStoreId, supabase, supabaseEnabled } from '../lib/supabase'

export default function RegisterPage(){
  const [form,setForm]=useState({name:'',phone:'',email:'',password:'',confirm:''});const[busy,setBusy]=useState(false);const nav=useNavigate()
  const submit=async e=>{e.preventDefault();if(form.password.length<6)return alert('Password minimal 6 karakter.');if(form.password!==form.confirm)return alert('Konfirmasi password tidak sama.');if(!supabaseEnabled)return alert('Supabase belum dikonfigurasi.');setBusy(true);try{
    const redirectTo=`${window.location.origin}/account`
    const {data,error}=await supabase.auth.signUp({email:form.email,password:form.password,options:{emailRedirectTo:redirectTo,data:{account_type:'customer',full_name:form.name,phone:form.phone,store_id:configuredStoreId}}});if(error)throw error
    if(data.session){nav('/account')}else{alert('Pendaftaran berhasil. Silakan cek email untuk verifikasi akun.');nav('/login')}
  }catch(e){alert(e.message)}finally{setBusy(false)}}
  return <div className="auth-page auth-page-v2"><div className="auth-card auth-card-wide"><Link to="/" className="auth-brand"><span>iM</span><div><b>iMersWAStore</b><small>Single Store Commerce</small></div></Link><span className="auth-kicker">AKUN PELANGGAN</span><h1>Daftar Akun Baru</h1><p>Simpan data belanja dan pantau pesanan lebih mudah. Pendaftaran ini tidak membuat toko baru.</p><form onSubmit={submit} className="auth-form-grid"><label><span><UserRound/> Nama Lengkap</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label><span><Phone/> WhatsApp</span><input required type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label className="span2"><span><Mail/> Email</span><input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label><span><LockKeyhole/> Password</span><input required type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><label><span><LockKeyhole/> Ulangi Password</span><input required type="password" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})}/></label><button className="btn-primary full large span2" disabled={busy}>{busy?'Mendaftarkan...':'Daftar Sekarang'}</button></form><div className="auth-links"><span>Sudah punya akun? <Link to="/login">Masuk</Link></span><Link to="/"><ArrowLeft size={14}/> Kembali ke toko</Link></div></div></div>
}
