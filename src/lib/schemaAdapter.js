import { slugify } from './format'

export function normalizeCategory(c = {}) {
  return {
    ...c,
    slug: c.slug || slugify(c.name || ''),
    group_type: c.type || c.group_type || 'physical',
    active: c.status ?? c.active ?? true,
    icon: c.icon || '',
  }
}

export function normalizeProduct(p = {}) {
  const media = Array.isArray(p.product_media) ? [...p.product_media].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)) : []
  const gallery = media.filter(m => m.media_type === 'image').map(m => m.media_url).filter(Boolean)
  const videos = media.filter(m => m.media_type === 'video').map(m => m.media_url).filter(Boolean)
  const cover = p.cover_image || p.image_url || gallery[0] || ''
  const type = p.type || p.product_type || 'physical'
  const variants=(Array.isArray(p.product_variants)?p.product_variants:[]).filter(v=>v.active!==false).map(v=>({...v,price:Number(v.price||0),hpp:Number(v.hpp||0),stock:Number(v.stock||0),weight_grams:Number(v.weight_grams||0)}))
  return {
    ...p,
    product_type: type,
    avg_cost: Number(p.hpp ?? p.avg_cost ?? 0),
    image_url: cover,
    gallery_images: gallery.filter(url => url !== cover),
    video_urls: videos,
    active: p.status ?? p.active ?? true,
    detail_button_label: p.button_text || p.detail_button_label || '',
    detail_button_url: p.preview_url || p.detail_button_url || '',
    input_schema: Array.isArray(p.input_schema) ? p.input_schema : [],
    compare_at_price: p.compare_at_price == null ? null : Number(p.compare_at_price),
    badge: p.badge || (p.promo ? 'PROMO' : p.featured ? 'FEATURED' : ''),
    category: p.category ? normalizeCategory(p.category) : null,
    variants,
    unit:p.unit||'pcs',
    weight_grams:Number(p.weight_grams||0),
  }
}

export function normalizeSettings({ store, brand, settings, banner, fallback }) {
  return {
    ...fallback,
    store_name: brand?.app_name || store?.name || fallback.store_name,
    tagline: settings?.tagline || fallback.tagline,
    logo_url: brand?.logo_url || store?.logo_url || fallback.logo_url,
    favicon_url: brand?.favicon_url || store?.favicon_url || '',
    primary_color: brand?.primary_color || store?.theme_color || fallback.primary_color,
    accent_color: brand?.secondary_color || fallback.accent_color,
    whatsapp: store?.whatsapp || fallback.whatsapp,
    email: store?.email || '',
    address: store?.address || '',
    announcement_text: settings?.announcement_text || fallback.announcement_text,
    announcement_link: settings?.announcement_link || '',
    hero_title: banner?.title || settings?.hero_title || fallback.hero_title,
    hero_subtitle: banner?.subtitle || settings?.hero_description || fallback.hero_subtitle,
    hero_image_url: banner?.image_url || settings?.hero_image || fallback.hero_image_url,
    hero_button_text: banner?.button_text || settings?.hero_button_text || 'Belanja Sekarang',
    hero_button_url: banner?.button_url || settings?.hero_button_url || '#promo',
    footer_text: brand?.footer_text || settings?.footer_text || fallback.footer_text,
    social_media: Array.isArray(settings?.social_media) ? settings.social_media : (settings?.social_media && typeof settings.social_media === 'object' ? Object.entries(settings.social_media).filter(([,url])=>url).map(([platform,url])=>({platform,label:platform,url,active:true})) : []),
    homepage_config: settings?.homepage_config || {},
    seo_config: settings?.seo_config || {},
    tracking_config: settings?.tracking_config || {},
    legal_config: settings?.legal_config || {},
    checkout_config: settings?.checkout_config || {},
  }
}
