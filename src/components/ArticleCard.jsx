import { ArrowRight, CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'

const dateLabel = value => {
  if (!value) return ''
  try { return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) }
  catch { return '' }
}

export default function ArticleCard({ article }) {
  return <article className="article-card">
    <Link className="article-cover" to={`/article/${article.slug}`}>
      {article.cover_image_url ? <img src={article.cover_image_url} alt={article.title}/> : <div className="article-cover-placeholder">Artikel</div>}
      {article.featured && <span className="article-featured">Pilihan</span>}
    </Link>
    <div className="article-card-body">
      <div className="article-meta"><CalendarDays size={14}/><span>{dateLabel(article.published_at)}</span><span>•</span><span>{article.author_name || 'Admin'}</span></div>
      <h3><Link to={`/article/${article.slug}`}>{article.title}</Link></h3>
      <p>{article.excerpt}</p>
      <Link className="article-read" to={`/article/${article.slug}`}>Baca Artikel <ArrowRight size={15}/></Link>
    </div>
  </article>
}
