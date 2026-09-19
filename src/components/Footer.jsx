import { BadgeCheck, ExternalLink, Headphones, ShieldCheck, Truck } from 'lucide-react'

export default function Footer({ settings }) {
  const socials=(Array.isArray(settings.social_media)?settings.social_media:[]).filter(x=>x&&x.active!==false&&x.url&&x.label)
  const legal=settings.legal_config||{}
  return <footer id="footer">
    <div className="trust-strip container-wide"><div><ShieldCheck/><span><b>Transaksi Aman</b><small>100% Terpercaya</small></span></div><div><Truck/><span><b>Pengiriman Cepat</b><small>Ke Seluruh Indonesia</small></span></div><div><BadgeCheck/><span><b>Produk Original</b><small>Kualitas Terjamin</small></span></div><div><Headphones/><span><b>Layanan Pelanggan</b><small>Siap Membantu</small></span></div></div>
    <div className="footer-main">
      <div className="container-wide footer-grid footer-grid-v2">
        <div><h3>{settings.store_name}</h3><p>{settings.tagline}</p>{settings.address&&<small className="footer-address">{settings.address}</small>}</div>
        <div><h4>Belanja</h4><a href="#physical">Produk Fisik</a><a href="#digital">Produk Digital</a><a href="/articles">Artikel & Inspirasi</a></div>
        <div><h4>Bantuan</h4><a href="/checkout">Checkout</a><a href="/track-order">Cek Pesanan</a><a href="/payment-confirmation">Konfirmasi Pembayaran</a></div>
        <div><h4>Legal</h4>{legal.terms_enabled!==false&&<a href="/legal/terms">Syarat & Ketentuan</a>}{legal.privacy_enabled!==false&&<a href="/legal/privacy">Privacy Policy</a>}{legal.disclaimer_enabled!==false&&<a href="/legal/disclaimer">{legal.disclaimer_title||'Disclaimer'}</a>}</div>
        {socials.length>0&&<div className="footer-social-col"><h4>Ikuti Kami</h4><div className="footer-social-links">{socials.map((x,i)=><a key={`${x.platform}-${i}`} href={x.url} target="_blank" rel="noreferrer"><span>{x.label}</span><ExternalLink size={13}/></a>)}</div></div>}
      </div>
      {legal.disclaimer_enabled!==false&&legal.disclaimer_footer_text&&<div className="container-wide footer-disclaimer"><b>{legal.disclaimer_title||'Disclaimer'}:</b> {legal.disclaimer_footer_text}</div>}
      <div className="footer-copy">{settings.footer_text}</div>
    </div>
  </footer>
}
