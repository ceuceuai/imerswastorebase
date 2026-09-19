import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { configuredStoreId, supabase, supabaseEnabled } from '../lib/supabase'

export default function LegalPage(){
  const{type}=useParams();const[settings,setSettings]=useState(null)
  useEffect(()=>{if(!supabaseEnabled)return;supabase.from('store_settings').select('legal_config').eq('store_id',configuredStoreId).maybeSingle().then(({data})=>setSettings(data?.legal_config||{}))},[])
  const map={privacy:{title:'Privacy Policy',enabled:'privacy_enabled',content:'privacy_content'},terms:{title:'Syarat & Ketentuan',enabled:'terms_enabled',content:'terms_content'},disclaimer:{title:settings?.disclaimer_title||'Disclaimer',enabled:'disclaimer_enabled',content:'disclaimer_content'}}
  const current=map[type]||map.terms
  const enabled=settings?.[current.enabled]!==false
  const html=enabled?settings?.[current.content]:''
  return <div className="legal-page"><header className="checkout-top container-wide"><Link to="/" className="brand simple"><span>iM</span><b>iMersWAStore</b></Link><Link to="/">← Kembali</Link></header><main className="legal-wrap"><h1>{current.title}</h1><div className="rich-content" dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(enabled?(html||'<p>Konten belum diisi oleh pemilik toko.</p>'):'<p>Halaman ini sedang dinonaktifkan oleh pemilik toko.</p>')}}/></main></div>
}
