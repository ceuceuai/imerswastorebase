import DashboardShell from '../components/DashboardShell'
import { useEffect, useMemo, useState } from 'react'
import { demoSettings } from '../data/demo'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'
import { normalizeSettings } from '../lib/schemaAdapter'
import { THEME_PRESETS, normalizeDashboardTheme, themeToVars, useAdminTheme } from '../context/AdminThemeContext'
import { Palette, Store, Image, Save } from 'lucide-react'

const ColorField=({label,value,onChange})=><label>{label}<div className="color-field"><input type="color" value={value||'#000000'} onChange={e=>onChange(e.target.value)}/><input type="text" value={value||''} onChange={e=>onChange(e.target.value)} /></div></label>

export default function OwnerSettings(){
  const { theme:loadedTheme, refreshTheme } = useAdminTheme()
  const[tab,setTab]=useState('identity')
  const[form,setForm]=useState(demoSettings)
  const[theme,setTheme]=useState(normalizeDashboardTheme(loadedTheme))
  const[storeId,setStoreId]=useState('')
  const[brandId,setBrandId]=useState(null)
  const[settingsId,setSettingsId]=useState(null)
  const[busy,setBusy]=useState(false)

  useEffect(()=>setTheme(normalizeDashboardTheme(loadedTheme)),[loadedTheme])

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
      if(s.error)throw s.error;if(b.error)throw b.error;if(st.error)throw st.error
      if(b.data?.id)setBrandId(b.data.id);if(st.data?.id)setSettingsId(st.data.id)
      setForm(normalizeSettings({store:s.data,brand:b.data,settings:st.data,banner:null,fallback:demoSettings}))
      setTheme(normalizeDashboardTheme(b.data?.dashboard_theme||{preset:'emerald',primary:b.data?.primary_color,accent:b.data?.secondary_color}))
    })().catch(e=>alert(e.message))
  },[])

  const previewVars=useMemo(()=>themeToVars(theme),[theme])
  const applyPreset=key=>setTheme({...THEME_PRESETS[key],preset:key})

  const save=async e=>{
    e?.preventDefault?.();setBusy(true)
    try{
      if(!supabaseEnabled){alert('Demo mode: data belum disimpan ke Supabase.');return}
      if(!storeId)throw new Error('Store ID tidak ditemukan.')
      const {error:storeError}=await supabase.from('stores').update({name:form.store_name,logo_url:form.logo_url||null,whatsapp:form.whatsapp||null,email:form.email||null,address:form.address||null,theme_color:theme.primary}).eq('id',storeId)
      if(storeError)throw storeError
      const brandPayload={store_id:storeId,app_name:form.store_name,logo_url:form.logo_url||null,primary_color:theme.primary,secondary_color:theme.accent,footer_text:form.footer_text||null,dashboard_theme:theme,dashboard_theme_updated_at:new Date().toISOString()}
      if(brandId){const {error}=await supabase.from('brand_settings').update(brandPayload).eq('id',brandId);if(error)throw error}
      else{const {data,error}=await supabase.from('brand_settings').insert(brandPayload).select('id').single();if(error)throw error;setBrandId(data.id)}
      const settingsPayload={store_id:storeId,tagline:form.tagline||null,announcement_text:form.announcement_text||null,hero_title:form.hero_title||null,hero_description:form.hero_subtitle||null,hero_image:form.hero_image_url||null,hero_button_text:form.hero_button_text||'Belanja Sekarang',hero_button_url:form.hero_button_url||'#promo',footer_text:form.footer_text||null}
      if(settingsId){const {error}=await supabase.from('store_settings').update(settingsPayload).eq('id',settingsId);if(error)throw error}
      else{const {data,error}=await supabase.from('store_settings').insert(settingsPayload).select('id').single();if(error)throw error;setSettingsId(data.id)}
      await refreshTheme();alert('Pengaturan toko & tema dashboard berhasil disimpan.')
    }catch(err){alert(err.message)}finally{setBusy(false)}
  }

  return <DashboardShell title="Pengaturan Toko & White Label" subtitle="Branding storefront dan tema dashboard berbeda untuk setiap toko.">
    <div className="settings-tabs">
      <button className={tab==='identity'?'active':''} onClick={()=>setTab('identity')}><Store size={14}/> Identitas</button>
      <button className={tab==='theme'?'active':''} onClick={()=>setTab('theme')}><Palette size={14}/> Tema Dashboard</button>
      <button className={tab==='homepage'?'active':''} onClick={()=>setTab('homepage')}><Image size={14}/> Homepage</button>
    </div>

    {tab==='identity'&&<div className="dash-panel settings-form"><div className="panel-head"><div><h2>Identitas Toko</h2><p>Nama, logo dan kontak tenant ini saja.</p></div></div><div className="form-grid">
      <label>Nama Toko<input value={form.store_name||''} onChange={e=>setForm({...form,store_name:e.target.value})}/></label>
      <label>Tagline<input value={form.tagline||''} onChange={e=>setForm({...form,tagline:e.target.value})}/></label>
      <label className="span2">Logo URL<input value={form.logo_url||''} onChange={e=>setForm({...form,logo_url:e.target.value})}/></label>
      <label>WhatsApp<input value={form.whatsapp||''} onChange={e=>setForm({...form,whatsapp:e.target.value})}/></label>
      <label>Email<input value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/></label>
      <label className="span2">Alamat<textarea value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}/></label>
      <label className="span2">Footer Text<input value={form.footer_text||''} onChange={e=>setForm({...form,footer_text:e.target.value})}/></label>
    </div></div>}

    {tab==='theme'&&<div className="dash-panel settings-form" style={previewVars}>
      <div className="panel-head"><div><h2>Theme Engine Dashboard</h2><p>Pilih preset atau atur sendiri warna card, sidebar, surface, radius dan font.</p></div></div>
      <div className="theme-presets">{Object.entries(THEME_PRESETS).map(([key,p])=><button type="button" className={`theme-preset ${theme.preset===key?'active':''}`} key={key} onClick={()=>applyPreset(key)}><div className="theme-preset-swatches"><i style={{background:p.card_1}}/><i style={{background:p.card_2}}/><i style={{background:p.card_3}}/><i style={{background:p.card_4}}/></div><b>{p.label}</b></button>)}</div>
      <div className="theme-preview" style={{marginTop:14}}><div className="theme-preview-bar">Preview Dashboard — {form.store_name||'Toko Anda'}</div><div className="theme-preview-cards"><i/><i/><i/><i/></div></div>
      <div className="form-section" style={{marginTop:14}}><h2>Warna Utama</h2><div className="form-grid">
        <ColorField label="Primary" value={theme.primary} onChange={primary=>setTheme({...theme,primary,preset:'custom'})}/>
        <ColorField label="Accent" value={theme.accent} onChange={accent=>setTheme({...theme,accent,preset:'custom'})}/>
        <ColorField label="Sidebar Start" value={theme.sidebar_from} onChange={sidebar_from=>setTheme({...theme,sidebar_from,preset:'custom'})}/>
        <ColorField label="Sidebar End" value={theme.sidebar_to} onChange={sidebar_to=>setTheme({...theme,sidebar_to,preset:'custom'})}/>
        <ColorField label="Background Dashboard" value={theme.page_bg} onChange={page_bg=>setTheme({...theme,page_bg,preset:'custom'})}/>
        <ColorField label="Surface / Panel" value={theme.surface} onChange={surface=>setTheme({...theme,surface,preset:'custom'})}/>
      </div></div>
      <div className="form-section" style={{marginTop:14}}><h2>Warna Card Statistik</h2><div className="form-grid">
        <label>Card 1 Gradient<input value={theme.card_1||''} onChange={e=>setTheme({...theme,card_1:e.target.value,preset:'custom'})}/></label>
        <label>Card 2 Gradient<input value={theme.card_2||''} onChange={e=>setTheme({...theme,card_2:e.target.value,preset:'custom'})}/></label>
        <label>Card 3 Gradient<input value={theme.card_3||''} onChange={e=>setTheme({...theme,card_3:e.target.value,preset:'custom'})}/></label>
        <label>Card 4 Gradient<input value={theme.card_4||''} onChange={e=>setTheme({...theme,card_4:e.target.value,preset:'custom'})}/></label>
        <label>Radius Card<input type="number" min="8" max="30" value={theme.radius||18} onChange={e=>setTheme({...theme,radius:Number(e.target.value),preset:'custom'})}/></label>
        <label>Font<select value={theme.font||'Plus Jakarta Sans'} onChange={e=>setTheme({...theme,font:e.target.value,preset:'custom'})}><option>Plus Jakarta Sans</option><option>Poppins</option><option>Inter</option></select></label>
        <label>Shadow<select value={theme.shadow||'soft'} onChange={e=>setTheme({...theme,shadow:e.target.value,preset:'custom'})}><option value="soft">Soft Premium</option><option value="deep">Deep</option><option value="none">Flat / None</option></select></label>
        <label>Density<select value={theme.density||'comfortable'} onChange={e=>setTheme({...theme,density:e.target.value,preset:'custom'})}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
      </div></div>
    </div>}

    {tab==='homepage'&&<div className="dash-panel settings-form"><div className="panel-head"><div><h2>Homepage Storefront</h2><p>Hero dan announcement tetap berbeda per toko.</p></div></div><div className="form-grid">
      <label className="span2">Announcement<input value={form.announcement_text||''} onChange={e=>setForm({...form,announcement_text:e.target.value})}/></label>
      <label className="span2">Hero Title<input value={form.hero_title||''} onChange={e=>setForm({...form,hero_title:e.target.value})}/></label>
      <label className="span2">Hero Subtitle<textarea value={form.hero_subtitle||''} onChange={e=>setForm({...form,hero_subtitle:e.target.value})}/></label>
      <label className="span2">Hero Image URL<input value={form.hero_image_url||''} onChange={e=>setForm({...form,hero_image_url:e.target.value})}/></label>
      <label>Button Text<input value={form.hero_button_text||''} onChange={e=>setForm({...form,hero_button_text:e.target.value})}/></label>
      <label>Button URL<input value={form.hero_button_url||''} onChange={e=>setForm({...form,hero_button_url:e.target.value})}/></label>
    </div></div>}

    <div className="settings-savebar"><button className="btn-primary" disabled={busy} onClick={save}><Save size={15}/>{busy?'Menyimpan...':'Simpan Semua Pengaturan'}</button></div>
  </DashboardShell>
}
