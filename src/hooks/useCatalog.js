import { useEffect, useState } from 'react'
import { demoCategories, demoProducts, demoSettings } from '../data/demo'
import { configuredStoreId, supabase, supabaseEnabled } from '../lib/supabase'
import { normalizeCategory, normalizeProduct, normalizeSettings } from '../lib/schemaAdapter'

export function useCatalog() {
  const [state, setState] = useState({ loading: true, products: [], categories: [], settings: demoSettings, error: '' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!supabaseEnabled || !configuredStoreId) {
        setState({
          loading: false,
          products: demoProducts,
          categories: demoCategories,
          settings: demoSettings,
          error: supabaseEnabled && !configuredStoreId ? 'VITE_STORE_ID belum diisi. Menampilkan data demo.' : '',
        })
        return
      }

      try {
        const [prodRes, catRes, storeRes, brandRes, settingRes, bannerRes, waPrefillRes] = await Promise.all([
          supabase
            .from('products')
            .select('*,category:categories(id,name,image_url,type,sort_order,status),product_media(id,media_type,media_url,sort_order),product_variants(id,name,sku,price,hpp,stock,image_url,weight_grams,unit,active)')
            .eq('store_id', configuredStoreId)
            .eq('status', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('categories')
            .select('*')
            .eq('store_id', configuredStoreId)
            .eq('status', true)
            .order('sort_order')
            .order('name'),
          supabase.from('stores').select('*').eq('id', configuredStoreId).maybeSingle(),
          supabase.from('brand_settings').select('*').eq('store_id', configuredStoreId).maybeSingle(),
          supabase.from('store_settings').select('*').eq('store_id', configuredStoreId).maybeSingle(),
          supabase
            .from('homepage_banners')
            .select('*')
            .eq('store_id', configuredStoreId)
            .eq('status', true)
            .order('sort_order')
            .limit(1)
            .maybeSingle(),
          supabase.rpc('get_public_whatsapp_prefill'),
        ])

        for (const res of [prodRes, catRes, storeRes, brandRes, settingRes, bannerRes, waPrefillRes]) {
          if (res.error) throw res.error
        }

        if (!cancelled) {
          setState({
            loading: false,
            products: (prodRes.data || []).map(normalizeProduct),
            categories: (catRes.data || []).map(normalizeCategory),
            settings: {
              ...normalizeSettings({
                store: storeRes.data,
                brand: brandRes.data,
                settings: settingRes.data,
                banner: bannerRes.data,
                fallback: demoSettings,
              }),
              wa_prefill_enabled: !!waPrefillRes.data?.enabled,
              wa_prefill_message: waPrefillRes.data?.message || '',
            },
            error: '',
          })
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setState({
            loading: false,
            products: [],
            categories: [],
            settings: demoSettings,
            error: `Supabase query gagal: ${err.message}. Data demo tidak dipakai pada koneksi production.`,
          })
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return state
}
