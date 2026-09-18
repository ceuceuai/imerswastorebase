import { Heart, Headphones, Menu, Search, ShoppingCart, UserRound } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../context/CartContext'

export default function StoreHeader({ settings }) {
  const { count } = useCart()
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const submit = e => { e.preventDefault(); navigate(`/?q=${encodeURIComponent(q)}`) }
  const wa = String(settings.whatsapp || '').replace(/\D/g, '')

  return <>
    <div className="announcement"><span>{settings.announcement_text}</span><div className="announcement-links"><a href="#footer">Tentang Kami</a><a href="#footer">Bantuan</a><a href="#">Cek Pesanan</a></div></div>
    <header className="store-header">
      <div className="top-header container-wide">
        <Link className="brand" to="/">
          {settings.logo_url ? <img className="brand-logo-img" src={settings.logo_url} alt={settings.store_name}/> : <div className="brand-mark">iM</div>}
          <div><strong>{settings.store_name}</strong><span>{settings.tagline}</span></div>
        </Link>
        <form className="search-box" onSubmit={submit}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari produk, kategori, atau brand..."/><button><Search size={20}/></button></form>
        <div className="header-actions">
          <Link to="/login"><UserRound/><span><b>Akun</b><small>Masuk / Daftar</small></span></Link>
          <button className="icon-action" title="Favorit"><Heart/><i>0</i></button>
          <Link className="icon-action" to="/checkout" title="Keranjang"><ShoppingCart/><i>{count}</i></Link>
        </div>
      </div>
      <div className="nav-wrap"><nav className="container-wide nav-bar">
        <button className="category-button"><Menu size={18}/> Semua Kategori</button>
        <NavLink to="/">Beranda</NavLink><a href="#physical">Produk Fisik</a><a href="#digital">Produk Digital</a><a href="#promo">Promo</a><Link to="/articles">Artikel</Link><Link to="/checkout">Konfirmasi Pembayaran</Link>
        <div className="nav-spacer"/><button className="support-icon"><Headphones size={19}/></button>{wa && <a className="whatsapp-btn" target="_blank" rel="noreferrer" href={`https://wa.me/${wa}`}>Chat Kami</a>}
      </nav></div>
    </header>
  </>
}
