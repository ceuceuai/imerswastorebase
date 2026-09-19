import { useEffect } from 'react'

function setMeta(name, content, attr='name') {
  if (!content) return
  let el = document.head.querySelector(`meta[${attr}="${name}"]`)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr,name); document.head.appendChild(el) }
  el.setAttribute('content', content)
}
function setLink(rel, href) {
  if (!href) return
  let el=document.head.querySelector(`link[rel="${rel}"]`)
  if(!el){el=document.createElement('link');el.rel=rel;document.head.appendChild(el)}
  el.href=href
}
function injectScript(id, src, inline) {
  if (document.getElementById(id)) return
  const s=document.createElement('script');s.id=id
  if(src){s.async=true;s.src=src}else{s.text=inline||''}
  document.head.appendChild(s)
}
export default function SeoManager({ settings, title, description, image, canonical }) {
  useEffect(()=>{
    const seo=settings?.seo_config||{}
    const tracking=settings?.tracking_config||{}
    const pageTitle=title||seo.meta_title||settings?.store_name||'iMersWAStore'
    const pageDesc=description||seo.meta_description||settings?.tagline||''
    const og=image||seo.og_image||settings?.hero_image_url||settings?.logo_url||''
    document.title=pageTitle
    setMeta('description',pageDesc)
    setMeta('keywords',seo.keywords||'')
    setMeta('robots',seo.robots||'index,follow')
    setMeta('og:title',pageTitle,'property');setMeta('og:description',pageDesc,'property');setMeta('og:type','website','property');setMeta('og:image',og,'property')
    setMeta('twitter:card','summary_large_image');setMeta('twitter:title',pageTitle);setMeta('twitter:description',pageDesc);setMeta('twitter:image',og)
    setLink('canonical',canonical||seo.canonical_url||window.location.href.split('?')[0])
    if(settings?.favicon_url)setLink('icon',settings.favicon_url)

    const ga=(tracking.google_analytics_id||'').trim()
    if(ga){injectScript('imers-ga-src',`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`);injectScript('imers-ga-init',null,`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${ga.replace(/'/g,'')}');`)}
    const meta=(tracking.meta_pixel_id||'').trim()
    if(meta) injectScript('imers-meta-pixel',null,`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta.replace(/'/g,'')}');fbq('track','PageView');`)
    const tt=(tracking.tiktok_pixel_id||'').trim()
    if(tt) injectScript('imers-tiktok-pixel',null,`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var i='https://analytics.tiktok.com/i18n/pixel/events.js';var a=d.createElement('script');a.type='text/javascript';a.async=!0;a.src=i+'?sdkid='+e+'&lib='+t;var s=d.getElementsByTagName('script')[0];s.parentNode.insertBefore(a,s)};ttq.load('${tt.replace(/'/g,'')}');ttq.page()}(window,document,'ttq');`)
  },[settings,title,description,image,canonical])
  return null
}
