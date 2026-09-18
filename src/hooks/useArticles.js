import { useEffect, useMemo, useState } from 'react'
import { demoArticles } from '../data/articles'
import { configuredStoreId, supabase, supabaseEnabled } from '../lib/supabase'

function normalizeArticle(row = {}) {
  return {
    id: row.id,
    store_id: row.store_id,
    title: row.title || '',
    slug: row.slug || '',
    excerpt: row.excerpt || '',
    content: row.content || '',
    cover_image_url: row.cover_image_url || '',
    author_name: row.author_name || 'Admin',
    featured: Boolean(row.featured),
    status: row.status !== false,
    published_at: row.published_at || row.created_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  }
}

export function useArticles({ limit = 0, featuredOnly = false } = {}) {
  const [state, setState] = useState({ loading: true, articles: [], error: '' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!supabaseEnabled || !configuredStoreId) {
        const fallback = featuredOnly ? demoArticles.filter(a => a.featured) : demoArticles
        setState({ loading: false, articles: limit ? fallback.slice(0, limit) : fallback, error: '' })
        return
      }
      try {
        let query = supabase
          .from('articles')
          .select('*')
          .eq('store_id', configuredStoreId)
          .eq('status', true)
          .order('published_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
        if (featuredOnly) query = query.eq('featured', true)
        if (limit) query = query.limit(limit)
        const { data, error } = await query
        if (error) throw error
        const rows = (data || []).map(normalizeArticle)
        if (!cancelled) setState({ loading: false, articles: rows.length ? rows : demoArticles.slice(0, limit || demoArticles.length), error: '' })
      } catch (err) {
        console.error('articles:', err)
        const fallback = featuredOnly ? demoArticles.filter(a => a.featured) : demoArticles
        if (!cancelled) setState({ loading: false, articles: limit ? fallback.slice(0, limit) : fallback, error: err.message || 'Gagal memuat artikel.' })
      }
    }
    load()
    return () => { cancelled = true }
  }, [limit, featuredOnly])

  return state
}

export function useArticle(slug) {
  const { articles, loading, error } = useArticles()
  const article = useMemo(() => articles.find(a => a.slug === slug) || null, [articles, slug])
  return { article, loading, error }
}
