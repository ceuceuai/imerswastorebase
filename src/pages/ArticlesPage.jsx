import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import StoreHeader from '../components/StoreHeader'
import Footer from '../components/Footer'
import ArticleCard from '../components/ArticleCard'
import { useCatalog } from '../hooks/useCatalog'
import { useArticles } from '../hooks/useArticles'

export default function ArticlesPage(){
  const { settings } = useCatalog()
  const { articles, loading } = useArticles()
  const [q,setQ]=useState('')
  const filtered=useMemo(()=>articles.filter(a=>!q || `${a.title} ${a.excerpt}`.toLowerCase().includes(q.toLowerCase())),[articles,q])
  return <div className="store-page" style={{'--blue':settings.primary_color||'#0f67ff','--purple':settings.accent_color||'#7c3aed'}}>
    <StoreHeader settings={settings}/>
    <main className="container-wide article-page">
      <div className="article-page-head"><div><span className="eyebrow">BLOG & ARTIKEL</span><h1>Inspirasi, Tips & Informasi Terbaru</h1><p>Konten dari toko untuk membantu pelanggan mengenal produk, promo, dan tips transaksi.</p></div><div className="article-search"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari artikel..."/></div></div>
      {loading?<div className="article-loading">Memuat artikel...</div>:<div className="article-grid article-grid-page">{filtered.map(a=><ArticleCard key={a.id} article={a}/>)}</div>}
      {!loading&&!filtered.length&&<div className="article-empty">Artikel tidak ditemukan.</div>}
    </main>
    <Footer settings={settings}/>
  </div>
}
