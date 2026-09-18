import { ArrowLeft, CalendarDays, UserRound } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import StoreHeader from '../components/StoreHeader'
import Footer from '../components/Footer'
import RichText from '../lib/richText'
import { useCatalog } from '../hooks/useCatalog'
import { useArticle } from '../hooks/useArticles'

const fmt=value=>{try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(value))}catch{return ''}}
export default function ArticleDetailPage(){
  const {slug}=useParams(); const {settings}=useCatalog(); const {article,loading}=useArticle(slug)
  return <div className="store-page" style={{'--blue':settings.primary_color||'#0f67ff','--purple':settings.accent_color||'#7c3aed'}}><StoreHeader settings={settings}/><main className="container-wide article-detail-wrap">
    <Link className="article-back" to="/articles"><ArrowLeft size={17}/> Kembali ke Artikel</Link>
    {loading?<div className="article-loading">Memuat artikel...</div>:article?<article className="article-detail">
      <div className="article-detail-head"><span className="eyebrow">ARTIKEL</span><h1>{article.title}</h1><div className="article-detail-meta"><span><CalendarDays size={15}/>{fmt(article.published_at)}</span><span><UserRound size={15}/>{article.author_name||'Admin'}</span></div></div>
      {article.cover_image_url&&<img className="article-detail-cover" src={article.cover_image_url} alt={article.title}/>}<div className="article-detail-content"><RichText text={article.content||article.excerpt}/></div>
    </article>:<div className="article-empty">Artikel tidak ditemukan.</div>}
  </main><Footer settings={settings}/></div>
}
