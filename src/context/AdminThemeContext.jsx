import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'

export const THEME_PRESETS = {
  emerald: {
    label: 'Emerald Pro',
    primary: '#10b981', accent: '#0ea5e9', success: '#22c55e', warning: '#f59e0b', danger: '#ef4444',
    sidebar_from: '#062d2b', sidebar_to: '#0f766e', page_bg: '#f4fbf8', surface: '#ffffff', text: '#10213e', muted: '#718096', border: '#dfeee8',
    card_1: 'linear-gradient(135deg,#0f766e 0%,#10b981 100%)',
    card_2: 'linear-gradient(135deg,#0ea5e9 0%,#2563eb 100%)',
    card_3: 'linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)',
    card_4: 'linear-gradient(135deg,#f97316 0%,#f59e0b 100%)',
    radius: 18, shadow: 'soft', font: 'Plus Jakarta Sans', density: 'comfortable'
  },
  ocean: {
    label: 'Ocean Blue',
    primary: '#0f67ff', accent: '#06b6d4', success: '#16a34a', warning: '#f59e0b', danger: '#ef4444',
    sidebar_from: '#0b1f4f', sidebar_to: '#114f9f', page_bg: '#f5f8ff', surface: '#ffffff', text: '#10213e', muted: '#72809a', border: '#e0e8f5',
    card_1: 'linear-gradient(135deg,#0f67ff 0%,#38bdf8 100%)',
    card_2: 'linear-gradient(135deg,#4f46e5 0%,#8b5cf6 100%)',
    card_3: 'linear-gradient(135deg,#f97316 0%,#fb923c 100%)',
    card_4: 'linear-gradient(135deg,#059669 0%,#10b981 100%)',
    radius: 18, shadow: 'soft', font: 'Plus Jakarta Sans', density: 'comfortable'
  },
  royal: {
    label: 'Royal Purple',
    primary: '#7c3aed', accent: '#ec4899', success: '#10b981', warning: '#f59e0b', danger: '#ef4444',
    sidebar_from: '#24104f', sidebar_to: '#5b21b6', page_bg: '#faf7ff', surface: '#ffffff', text: '#21183b', muted: '#7c7390', border: '#ebe4f5',
    card_1: 'linear-gradient(135deg,#6d28d9 0%,#a855f7 100%)',
    card_2: 'linear-gradient(135deg,#db2777 0%,#fb7185 100%)',
    card_3: 'linear-gradient(135deg,#2563eb 0%,#38bdf8 100%)',
    card_4: 'linear-gradient(135deg,#ea580c 0%,#f59e0b 100%)',
    radius: 20, shadow: 'soft', font: 'Poppins', density: 'comfortable'
  },
  sunset: {
    label: 'Sunset Commerce',
    primary: '#f97316', accent: '#ef4444', success: '#16a34a', warning: '#f59e0b', danger: '#dc2626',
    sidebar_from: '#431407', sidebar_to: '#9a3412', page_bg: '#fff9f4', surface: '#ffffff', text: '#2e1f1a', muted: '#88746d', border: '#f2e3da',
    card_1: 'linear-gradient(135deg,#ea580c 0%,#fb923c 100%)',
    card_2: 'linear-gradient(135deg,#dc2626 0%,#fb7185 100%)',
    card_3: 'linear-gradient(135deg,#7c3aed 0%,#c084fc 100%)',
    card_4: 'linear-gradient(135deg,#0891b2 0%,#22d3ee 100%)',
    radius: 18, shadow: 'soft', font: 'Poppins', density: 'comfortable'
  },
  midnight: {
    label: 'Midnight Premium',
    primary: '#38bdf8', accent: '#8b5cf6', success: '#34d399', warning: '#fbbf24', danger: '#fb7185',
    sidebar_from: '#020617', sidebar_to: '#172554', page_bg: '#eef2ff', surface: '#ffffff', text: '#0f172a', muted: '#64748b', border: '#dbe2ef',
    card_1: 'linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%)',
    card_2: 'linear-gradient(135deg,#312e81 0%,#7c3aed 100%)',
    card_3: 'linear-gradient(135deg,#0f766e 0%,#14b8a6 100%)',
    card_4: 'linear-gradient(135deg,#9f1239 0%,#fb7185 100%)',
    radius: 16, shadow: 'deep', font: 'Inter', density: 'comfortable'
  },
  rose: {
    label: 'Rose Boutique',
    primary: '#e11d48', accent: '#8b5cf6', success: '#16a34a', warning: '#f59e0b', danger: '#dc2626',
    sidebar_from: '#4c0519', sidebar_to: '#9f1239', page_bg: '#fff7fa', surface: '#ffffff', text: '#2a1720', muted: '#8f7580', border: '#f1dce4',
    card_1: 'linear-gradient(135deg,#be123c 0%,#fb7185 100%)',
    card_2: 'linear-gradient(135deg,#7c3aed 0%,#c084fc 100%)',
    card_3: 'linear-gradient(135deg,#0f766e 0%,#34d399 100%)',
    card_4: 'linear-gradient(135deg,#c2410c 0%,#fb923c 100%)',
    radius: 22, shadow: 'soft', font: 'Plus Jakarta Sans', density: 'comfortable'
  }
}

const DEFAULT_THEME = { ...THEME_PRESETS.emerald, preset: 'emerald' }

function mergeTheme(raw = {}) {
  const presetKey = raw?.preset && THEME_PRESETS[raw.preset] ? raw.preset : 'emerald'
  const presetName = raw?.preset === 'custom' ? 'custom' : presetKey
  return { ...DEFAULT_THEME, ...THEME_PRESETS[presetKey], ...raw, preset: presetName }
}

export function themeToVars(theme) {
  const t = mergeTheme(theme)
  const shadow = t.shadow === 'deep'
    ? '0 18px 50px rgba(16,33,62,.16)'
    : t.shadow === 'none' ? 'none' : '0 12px 34px rgba(25,58,99,.10)'
  return {
    '--admin-primary': t.primary,
    '--admin-accent': t.accent,
    '--admin-success': t.success,
    '--admin-warning': t.warning,
    '--admin-danger': t.danger,
    '--admin-sidebar-from': t.sidebar_from,
    '--admin-sidebar-to': t.sidebar_to,
    '--admin-page-bg': t.page_bg,
    '--admin-surface': t.surface,
    '--admin-text': t.text,
    '--admin-muted': t.muted,
    '--admin-border': t.border,
    '--admin-card-1': t.card_1,
    '--admin-card-2': t.card_2,
    '--admin-card-3': t.card_3,
    '--admin-card-4': t.card_4,
    '--admin-radius': `${Number(t.radius || 18)}px`,
    '--admin-shadow': shadow,
    '--admin-font': `'${t.font || 'Plus Jakarta Sans'}', Inter, system-ui, sans-serif`,
    '--admin-control-h': t.density === 'compact' ? '38px' : '44px',
  }
}

const AdminThemeContext = createContext({
  loading: true,
  theme: DEFAULT_THEME,
  store: null,
  brand: null,
  profile: null,
  refreshTheme: async () => {},
})

export function AdminThemeProvider({ children }) {
  const [state, setState] = useState({ loading: true, theme: DEFAULT_THEME, store: null, brand: null, profile: null })

  const load = async () => {
    if (!supabaseEnabled) {
      setState({ loading: false, theme: DEFAULT_THEME, store: { name: 'iMersWAStore Demo' }, brand: null, profile: { full_name: 'Owner Demo', role: 'owner' } })
      return
    }
    const ctx = await getOwnerContext()
    if (!ctx.storeId) throw new Error('Store owner tidak ditemukan.')
    const [storeRes, brandRes] = await Promise.all([
      supabase.from('stores').select('*').eq('id', ctx.storeId).single(),
      supabase.from('brand_settings').select('*').eq('store_id', ctx.storeId).maybeSingle(),
    ])
    if (storeRes.error) throw storeRes.error
    if (brandRes.error) throw brandRes.error
    const base = brandRes.data?.dashboard_theme || {}
    const theme = mergeTheme({
      ...base,
      primary: base.primary || brandRes.data?.primary_color || storeRes.data?.theme_color,
      accent: base.accent || brandRes.data?.secondary_color,
    })
    setState({ loading: false, theme, store: storeRes.data, brand: brandRes.data, profile: ctx.profile })
  }

  useEffect(() => { load().catch(err => { console.error(err); setState(s => ({ ...s, loading: false })) }) }, [])

  const value = useMemo(() => ({ ...state, refreshTheme: load }), [state])
  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>
}

export function useAdminTheme() { return useContext(AdminThemeContext) }
export function normalizeDashboardTheme(raw) { return mergeTheme(raw) }
