import {
  BarChart3, Boxes, ClipboardList, FileText, LayoutDashboard, LogOut, Package, Settings,
  Store, Menu, X, Tags, Truck, TicketPercent, MonitorSmartphone, Users, PlaySquare,
  ShoppingBag, CircleDollarSign
} from 'lucide-react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase, supabaseEnabled } from '../lib/supabase'
import { themeToVars, useAdminTheme } from '../context/AdminThemeContext'
import '../admin-premium.css'

const menuGroups = [
  { label:'Utama', items:[
    ['/owner', LayoutDashboard, 'Dashboard'],
  ]},
  { label:'Penjualan', items:[
    ['/owner/orders', ClipboardList, 'Pesanan Masuk'],
    ['/owner/pos', MonitorSmartphone, 'Kasir POS'],
  ]},
  { label:'Katalog & Konten', items:[
    ['/owner/products', Package, 'Katalog Produk'],
    ['/owner/categories', Tags, 'Kategori Produk'],
    ['/owner/coupons', TicketPercent, 'Kupon & Promo'],
    ['/owner/articles', FileText, 'Artikel & Blog'],
  ]},
  { label:'Operasional', items:[
    ['/owner/inventory', Boxes, 'Inventory & HPP'],
    ['/owner/shipping', Truck, 'Ongkir'],
    ['/owner/staff', Users, 'Manajemen Kasir'],
    ['/owner/reports', BarChart3, 'Profit Report'],
  ]},
  { label:'Sistem', items:[
    ['/owner/settings', Settings, 'Pengaturan Toko'],
    ['/owner/guides', PlaySquare, 'Video Panduan'],
  ]},
]

function initials(name='iMersWAStore'){
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('') || 'iM'
}

export default function DashboardShell({ children, title, subtitle }) {
  const [open,setOpen] = useState(false)
  const nav=useNavigate()
  const { theme, store, brand, profile } = useAdminTheme()
  const storeName = brand?.app_name || store?.name || 'iMersWAStore'
  const logo = brand?.logo_url || store?.logo_url || ''
  const ownerName = profile?.full_name || 'Owner iMersWAStore'
  const role = profile?.role || 'owner'
  const vars = themeToVars(theme)
  const logout = async()=>{ if(supabaseEnabled) await supabase.auth.signOut(); nav('/login') }
  const today = new Intl.DateTimeFormat('id-ID',{weekday:'short',day:'2-digit',month:'long',year:'numeric'}).format(new Date())

  return <div className="admin-theme-root" style={vars}>
    <div className="dash-layout">
      <aside className={`dash-sidebar ${open?'open':''}`}>
        <div className="dash-brand">
          <div className="dash-brand-logo">{logo?<img src={logo} alt={storeName}/>:initials(storeName)}</div>
          <div className="dash-brand-copy"><b>{storeName}</b><small>Commerce Dashboard</small></div>
          <button className="dash-close" onClick={()=>setOpen(false)}><X size={18}/></button>
        </div>
        <div className="dash-profile">
          <div className="dash-avatar">{profile?.avatar_url?<img src={profile.avatar_url} alt={ownerName}/>:initials(ownerName)}</div>
          <div><b>{ownerName}</b><small>{role}</small></div>
        </div>
        <nav className="dash-nav">
          {menuGroups.map(group=><div className="dash-nav-group" key={group.label}>
            <span className="dash-nav-title">{group.label}</span>
            {group.items.map(([to,Icon,label])=><NavLink key={to} to={to} end={to==='/owner'} onClick={()=>setOpen(false)}>
              <Icon/>{label}
            </NavLink>)}
          </div>)}
        </nav>
        <div className="dash-side-bottom">
          <Link to="/"><Store size={17}/> Lihat Toko</Link>
          <button onClick={logout}><LogOut size={17}/> Keluar</button>
        </div>
      </aside>

      <main className="dash-main">
        <header className="dash-top">
          <button className="dash-menu" onClick={()=>setOpen(true)}><Menu size={19}/></button>
          <div className="dash-top-copy"><h1>{title}</h1><p>{subtitle}</p></div>
          <div className="dash-top-actions">
            <span className="supabase-chip"><i/>{supabaseEnabled?'Supabase Connected':'Demo Mode'}</span>
            <span className="dash-date">{today}</span>
          </div>
        </header>
        <section className="dash-content">{children}</section>
      </main>
    </div>
  </div>
}
