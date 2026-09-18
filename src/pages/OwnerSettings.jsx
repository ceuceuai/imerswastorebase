import DashboardShell from '../components/DashboardShell'
import { useEffect, useState } from 'react'
import { demoSettings } from '../data/demo'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'
import { normalizeSettings } from '../lib/schemaAdapter'

export default function OwnerSettings(){
  const[form,setForm]=useState(demoSettings)
  const[storeId,setStoreId]=useState('')
  const[brandId,setBrandId]=useState(null)
  const[settingsId,setSettingsId]=useState(null)
  const[busy,setBusy]=useState(false)

  useEffect(()=>{
    if(!supabaseEnabled)return
    ;(async()=>{
      const ctx=await getOwnerContext()
      if(!ctx.storeId)throw new Error('Store owner tidak ditemukan.')
      setStoreId(ctx.storeId)
      const [s,b,st]=await Promise.all([
        supabase.from('stores').select('*').eq('id',ctx.storeId).single(),
        supabase.from('brand_settings').select('*').eq('store_id',ctx.storeId).maybeSingle(),
        supabase.from('store_settings').select('*').eq('store_id',ctx.storeId).maybeSingle(),
      ])
      if(s.error)throw s.error
      if(b.error)throw b.error
      if(st.error)throw st.error
      if(b.data?.id)setBrandId(b.data.id)
      if(st.data?.id)setSettingsId(st.data.id)
      setForm(normalizeSettings({store:s.data,brand:b.data,settings:st.data,banner:null,fallback:demoSettings}))
    })().catch(e=>alert(e.message))
  },[])

  const save=async e=>{
    e.preventDefault();setBusy(true)
    try{
      if(!supabaseEnabled){alert('Demo mode: data belum disimpan ke Supabase.');return}
      if(!storeId)throw new Error('Store ID tidak ditemukan.')

      const {error:storeError}=await supabase.from('stores').update({
        name:form.store_name,
        logo_url:form.logo_url||null,
        whatsapp:form.whatsapp||null,
        email:form.email||null,
        address:form.address||null,
        theme_color:form.primary_color||'#0f67ff',
      }).eq('id',storeId)
      if(storeError)throw storeError

      const brandPayload={
        store_id:storeId,
        app_name:form.store_name,
        logo_url:form.logo_url||null,
        primary_color:form.primary_color||'#0f67ff',
        secondary_color:form.accent_color||'#7c3aed',
        footer_text:form.footer_text||null,
      }
      if(brandId){
        const {error}=await supabase.from('brand_settings').update(brandPayload).eq('id',brandId)
        if(error)throw error
      }else{
        const {data,error}=await supabase.from('brand_settings').insert(brandPayload).select('id').single()
        if(error)throw error
        setBrandId(data.id)
      }

      const settingsPayload={
        store_id:storeId,
        tagline:form.tagline||null,
        announcement_text:form.announcement_text||null,
        hero_title:form.hero_title||null,
        hero_description:form.hero_subtitle||null,
        hero_image:form.hero_image_url||null,
        footer_text:form.footer_text||null,
      }
      if(settingsId){
        const {error}=await supabase.from('store_settings').update(settingsPayload).eq('id',settingsId)
        if(error)throw error
      }else{
        const {data,error}=await supabase.from('store_settings').insert(settingsPayload).select('id').single()
        if(error)throw error
        setSettingsId(data.id)
      }
      alert('Branding tersimpan.')
    }catch(err){alert(err.message)}finally{setBusy(false)}
  }

  return <DashboardShell title="White Label Branding" subtitle="Nama toko, warna, hero dan identitas dapat diganti tanpa edit source."><form className="dash-panel settings-form" onSubmit={save}>
    <div className="form-section"><h2>Identitas Toko</h2><div className="form-grid">
      <label>Nama Toko<input value={form.store_name||''} onChange={e=>setForm({...form,store_name:e.target.value})}/></label>
      <label>Tagline<input value={form.tagline||''} onChange={e=>setForm({...form,tagline:e.target.value})}/></label>
      <label>Logo URL<input value={form.logo_url||''} onChange={e=>setForm({...form,logo_url:e.target.value})}/></label>
      <label>WhatsApp<input value={form.whatsapp||''} onChange={e=>setForm({...form,whatsapp:e.target.value})}/></label>
      <label>Email<input value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label>Alamat<input value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}/></label>
      <label>Primary Color<input type="color" value={form.primary_color||'#0f67ff'} onChange={e=>setForm({...form,primary_color:e.target.value})}/></label>
      <label>Accent Color<input type="color" value={form.accent_color||'#7c3aed'} onChange={e=>setForm({...form,accent_color:e.target.value})}/></label>
    </div></div>
    <div className="form-section"><h2>Homepage</h2><div className="form-grid">
      <label className="span2">Announcement<input value={form.announcement_text||''} onChange={e=>setForm({...form,announcement_text:e.target.value})}/></label>
      <label className="span2">Hero Title<input value={form.hero_title||''} onChange={e=>setForm({...form,hero_title:e.target.value})}/></label>
      <label className="span2">Hero Subtitle<textarea value={form.hero_subtitle||''} onChange={e=>setForm({...form,hero_subtitle:e.target.value})}/></label>
      <label className="span2">Hero Image URL<input value={form.hero_image_url||''} onChange={e=>setForm({...form,hero_image_url:e.target.value})}/></label>
      <label className="span2">Footer Text<input value={form.footer_text||''} onChange={e=>setForm({...form,footer_text:e.target.value})}/></label>
    </div></div>
    <button className="btn-primary" disabled={busy}>{busy?'Menyimpan...':'Simpan Branding'}</button>
  </form></DashboardShell>
}
