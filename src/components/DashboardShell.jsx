import {
  BarChart3, Boxes, FileText, LayoutDashboard, LogOut, Package,
  Settings, Store, Menu, X, UserRound, ExternalLink
} from 'lucide-react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { getOwnerContext, supabase, supabaseEnabled } from '../lib/supabase'

const links = [
  ['/owner', LayoutDashboard, 'Dashboard'],
  ['/owner/products', Package, 'Katalog Produk'],
  ['/owner/articles', FileText, 'Artikel & Blog'],
  ['/owner/inventory', Boxes, 'Inventory & HPP'],
  ['/owner/reports', BarChart3, 'Profit Report'],
  ['/owner/settings', Settings, 'Pengaturan Toko'],
]

export default function DashboardShell({ children, title, subtitle }) {
  const [open, setOpen] = useState(false)
  const [owner, setOwner] = useState({ name: 'Owner', role: 'owner', storeName: 'iMersWAStore', logo: '' })
  const nav = useNavigate()

  useEffect(() => {
    if (!supabaseEnabled) return
    ;(async () => {
      const ctx = await getOwnerContext()
      let store = null
      if (ctx.storeId) {
        const { data } = await supabase.from('stores').select('name,logo_url').eq('id', ctx.storeId).maybeSingle()
        store = data || null
      }
      setOwner({
        name: ctx.profile?.full_name || ctx.user?.email?.split('@')[0] || 'Owner',
        role: ctx.profile?.role || 'owner',
        storeName: store?.name || 'iMersWAStore',
        logo: store?.logo_url || ctx.profile?.avatar_url || '',
      })
    })().catch(() => {})
  }, [])

  const initials = useMemo(() => {
    return (owner.storeName || 'IM').split(/\s+/).map(v => v[0]).join('').slice(0,2).toUpperCase()
  }, [owner.storeName])

  const logout = async () => {
    if (supabaseEnabled) await supabase.auth.signOut()
    nav('/login')
  }

  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }).format(new Date())

  return (
    <div className="gas-dash-layout">
      {open && <button aria-label="Tutup sidebar" className="gas-sidebar-overlay" onClick={() => setOpen(false)} />}
      <aside className={`gas-sidebar ${open ? 'open' : ''}`}>
        <div className="gas-side-brand">
          <Link to="/" className="gas-side-brand-link">
            {owner.logo ? <img src={owner.logo} alt="Logo" /> : <span>{initials}</span>}
            <b>{owner.storeName}</b>
          </Link>
          <button className="gas-side-close" onClick={() => setOpen(false)}><X size={20}/></button>
        </div>

        <div className="gas-owner-card">
          <div className="gas-owner-avatar"><UserRound size={19}/></div>
          <div>
            <strong>{owner.name}</strong>
            <div><span>{owner.role}</span><small>@owner</small></div>
          </div>
        </div>

        <nav className="gas-side-nav">
          {links.map(([to, Icon, label]) => (
            <NavLink key={to} to={to} end={to === '/owner'} onClick={() => setOpen(false)}>
              <Icon size={19}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="gas-side-bottom">
          <Link to="/"><ExternalLink size={18}/> Lihat Toko</Link>
          <button onClick={logout}><LogOut size={18}/> Keluar</button>
        </div>
      </aside>

      <main className="gas-dash-main">
        <header className="gas-dash-top">
          <div className="gas-title-wrap">
            <button className="gas-menu-btn" onClick={() => setOpen(true)}><Menu size={20}/></button>
            <div>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <div className="gas-top-right">
            <span className="gas-connected">{supabaseEnabled ? 'Supabase Connected' : 'Demo Mode'}</span>
            <span className="gas-date">{dateLabel}</span>
          </div>
        </header>
        <section className="gas-dash-content">{children}</section>
      </main>
    </div>
  )
}
