import { BarChart3, Boxes, LayoutDashboard, LogOut, Package, Settings, Store, Menu, X } from 'lucide-react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase, supabaseEnabled } from '../lib/supabase'

const links = [
  ['/owner', LayoutDashboard, 'Dashboard'], ['/owner/products', Package, 'Produk'], ['/owner/inventory', Boxes, 'Inventory & HPP'], ['/owner/reports', BarChart3, 'Profit Report'], ['/owner/settings', Settings, 'White Label'],
]
export default function DashboardShell({ children, title, subtitle }) {
  const [open,setOpen] = useState(false); const nav=useNavigate()
  const logout = async()=>{ if(supabaseEnabled) await supabase.auth.signOut(); nav('/login') }
  return <div className="dash-layout"><aside className={`dash-sidebar ${open?'open':''}`}><div className="dash-logo"><span>iM</span><b>iMersWAStore</b><button onClick={()=>setOpen(false)}><X/></button></div><nav>{links.map(([to,Icon,label])=><NavLink key={to} to={to} end={to==='/owner'} onClick={()=>setOpen(false)}><Icon size={19}/>{label}</NavLink>)}</nav><div className="dash-side-bottom"><Link to="/"><Store size={18}/> Lihat Toko</Link><button onClick={logout}><LogOut size={18}/> Keluar</button></div></aside><main className="dash-main"><header className="dash-top"><button className="dash-menu" onClick={()=>setOpen(true)}><Menu/></button><div><h1>{title}</h1><p>{subtitle}</p></div><span className="demo-chip">{supabaseEnabled?'Supabase Connected':'Demo Mode'}</span></header><section className="dash-content">{children}</section></main></div>
}
