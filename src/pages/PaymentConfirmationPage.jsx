import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  QrCode,
  ReceiptText,
  Search,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { configuredStoreId, supabase, supabaseEnabled } from '../lib/supabase'
import { rupiah } from '../lib/format'
import '../public-commerce.css'

const fallbackBrand = {
  name: 'iMersWAStore',
  tagline: 'Belanja Mudah, Untung Setiap Hari',
  logo: '',
  primary: '#0f67ff',
  accent: '#6d38ff',
}

const paymentTypeLabel = {
  bank: 'Transfer Bank',
  ewallet: 'E-Wallet',
  qris: 'QRIS',
  cod: 'COD / Tunai',
}

function paymentIcon(type) {
  if (type === 'qris') return <QrCode />
  if (type === 'ewallet') return <WalletCards />
  return <Landmark />
}

export default function PaymentConfirmationPage() {
  const [form, setForm] = useState({
    order_number: '',
    phone: '',
    payer_name: '',
    amount: '',
    payment_method: '',
    bank_name: '',
    proof_url: '',
    notes: '',
  })
  const [brand, setBrand] = useState(fallbackBrand)
  const [payments, setPayments] = useState([])
  const [selectedPaymentId, setSelectedPaymentId] = useState('')
  const [verifiedOrder, setVerifiedOrder] = useState(null)
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabaseEnabled || !configuredStoreId) return
    let alive = true
    ;(async () => {
      const [storeRes, brandRes, settingsRes, paymentRes] = await Promise.all([
        supabase.from('stores').select('name,logo_url,theme_color').eq('id', configuredStoreId).maybeSingle(),
        supabase.from('brand_settings').select('app_name,logo_url,primary_color,secondary_color').eq('store_id', configuredStoreId).maybeSingle(),
        supabase.from('store_settings').select('tagline').eq('store_id', configuredStoreId).maybeSingle(),
        supabase.from('payment_settings').select('id,payment_type,provider_name,account_name,account_number,qr_image,instructions,icon_url,sort_order').eq('store_id', configuredStoreId).eq('enabled', true).order('sort_order').order('created_at'),
      ])
      if (!alive) return
      setBrand({
        name: brandRes.data?.app_name || storeRes.data?.name || fallbackBrand.name,
        tagline: settingsRes.data?.tagline || fallbackBrand.tagline,
        logo: brandRes.data?.logo_url || storeRes.data?.logo_url || '',
        primary: brandRes.data?.primary_color || storeRes.data?.theme_color || fallbackBrand.primary,
        accent: brandRes.data?.secondary_color || fallbackBrand.accent,
      })
      if (!paymentRes.error) setPayments(paymentRes.data || [])
    })().catch(() => {})
    return () => { alive = false }
  }, [])

  const selectedPayment = useMemo(
    () => payments.find((item) => item.id === selectedPaymentId) || null,
    [payments, selectedPaymentId],
  )

  const invalidateOrder = (patch) => {
    setVerifiedOrder(null)
    setError('')
    setForm((current) => ({ ...current, ...patch }))
  }

  const choosePayment = (item) => {
    setSelectedPaymentId(item.id)
    setForm((current) => ({
      ...current,
      payment_method: paymentTypeLabel[item.payment_type] || item.payment_type || 'Transfer',
      bank_name: item.provider_name || '',
    }))
  }

  const checkOrder = async () => {
    setError('')
    if (!supabaseEnabled || !configuredStoreId) {
      setError('Koneksi Supabase belum siap.')
      return null
    }
    if (!form.order_number.trim() || !form.phone.trim()) {
      setError('Isi Nomor Order dan WhatsApp terlebih dahulu.')
      return null
    }
    setChecking(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('lookup_public_order', {
        p_store_id: configuredStoreId,
        p_order_number: form.order_number.trim(),
        p_phone: form.phone.trim(),
      })
      if (rpcError) throw rpcError
      if (!data?.found) {
        setVerifiedOrder(null)
        setError('Pesanan tidak ditemukan. Periksa kembali nomor order dan WhatsApp.')
        return null
      }
      setVerifiedOrder(data)
      setForm((current) => ({
        ...current,
        payer_name: current.payer_name || data.customer_name || '',
        amount: current.amount || String(data.total_amount || ''),
      }))
      return data
    } catch (err) {
      setVerifiedOrder(null)
      setError(err.message || 'Gagal memeriksa pesanan.')
      return null
    } finally {
      setChecking(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (!supabaseEnabled || !configuredStoreId) throw new Error('Koneksi Supabase belum siap.')
      const order = verifiedOrder || await checkOrder()
      if (!order) return
      const { data, error: rpcError } = await supabase.rpc('submit_payment_confirmation', {
        p_store_id: configuredStoreId,
        p_order_number: form.order_number.trim(),
        p_phone: form.phone.trim(),
        p_payer_name: form.payer_name.trim(),
        p_amount: Number(form.amount || 0),
        p_payment_method: form.payment_method || selectedPayment?.payment_type || 'Transfer',
        p_bank_name: form.bank_name || selectedPayment?.provider_name || null,
        p_proof_url: form.proof_url.trim() || null,
        p_notes: form.notes.trim() || null,
      })
      if (rpcError) throw rpcError
      if (!data?.ok) throw new Error('Konfirmasi pembayaran gagal disimpan.')
      if (data?.order_id && data?.notification_token) {
        supabase.functions.invoke('order-notify', {
          body: {
            event: 'payment_confirmation',
            order_id: data.order_id,
            notification_token: data.notification_token,
            confirmation_id: data.id,
            amount: Number(form.amount || 0),
          },
        }).catch(() => {})
      }
      setDone(true)
    } catch (err) {
      setError(err.message || 'Konfirmasi pembayaran gagal dikirim.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="public-commerce-page"
      style={{ '--pc-primary': brand.primary, '--pc-accent': brand.accent }}
    >
      <header className="public-commerce-header">
        <div className="container-wide public-commerce-header-inner">
          <Link to="/" className="public-commerce-brand">
            {brand.logo ? <img src={brand.logo} alt={brand.name} /> : <span>iM</span>}
            <div><b>{brand.name}</b><small>{brand.tagline}</small></div>
          </Link>
          <div className="public-commerce-head-actions">
            <Link to="/track-order">Cek Pesanan</Link>
            <Link to="/" className="public-back-link"><ArrowLeft /> Kembali ke toko</Link>
          </div>
        </div>
      </header>

      <main className="public-commerce-shell container-wide">
        <section className="payment-confirm-main">
          <div className="public-commerce-hero">
            <div className="public-commerce-hero-icon"><CreditCard /></div>
            <div>
              <span>KONFIRMASI PEMBAYARAN</span>
              <h1>Kirim bukti pembayaran dengan lebih mudah</h1>
              <p>Verifikasi pesanan dulu, pilih metode pembayaran, lalu kirim detail transfer ke admin toko.</p>
            </div>
          </div>

          {done ? (
            <div className="public-success-card">
              <div className="public-success-icon"><CheckCircle2 /></div>
              <span>BERHASIL DIKIRIM</span>
              <h2>Konfirmasi pembayaran sudah diterima</h2>
              <p>Admin akan memeriksa pembayaran Anda. Status pesanan dapat dipantau kapan saja.</p>
              <div className="public-success-actions">
                <Link className="btn-primary" to="/track-order">Cek Status Pesanan</Link>
                <Link className="btn-outline" to="/">Kembali Belanja</Link>
              </div>
            </div>
          ) : (
            <form className="public-payment-form" onSubmit={submit}>
              <div className="public-form-section">
                <div className="public-form-section-title">
                  <span>1</span>
                  <div><h2>Temukan pesanan</h2><p>Gunakan data yang sama saat checkout.</p></div>
                </div>
                <div className="public-form-grid order-check-grid">
                  <label>
                    <span>Nomor Order</span>
                    <input
                      required
                      value={form.order_number}
                      onChange={(e) => invalidateOrder({ order_number: e.target.value })}
                      placeholder="Contoh: INV-20260919-001"
                    />
                  </label>
                  <label>
                    <span>WhatsApp Order</span>
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => invalidateOrder({ phone: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                    />
                  </label>
                  <button type="button" className="public-check-order" onClick={checkOrder} disabled={checking}>
                    {checking ? <Loader2 className="spin" /> : <Search />} {checking ? 'Memeriksa...' : 'Cek Pesanan'}
                  </button>
                </div>

                {verifiedOrder && (
                  <div className="verified-order-card">
                    <div className="verified-order-badge"><BadgeCheck /> Pesanan ditemukan</div>
                    <div><span>Nomor Order</span><b>{verifiedOrder.order_number}</b></div>
                    <div><span>Total Pesanan</span><b>{rupiah(verifiedOrder.total_amount)}</b></div>
                    <div><span>Status</span><b>{verifiedOrder.status} / {verifiedOrder.payment_status}</b></div>
                  </div>
                )}
              </div>

              <div className="public-form-section">
                <div className="public-form-section-title">
                  <span>2</span>
                  <div><h2>Detail pembayaran</h2><p>Pilih rekening atau metode yang digunakan.</p></div>
                </div>

                {payments.length > 0 && (
                  <div className="public-payment-methods">
                    {payments.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={selectedPaymentId === item.id ? 'active' : ''}
                        onClick={() => choosePayment(item)}
                      >
                        <span className="public-payment-method-icon">
                          {item.icon_url ? <img src={item.icon_url} alt="" /> : paymentIcon(item.payment_type)}
                        </span>
                        <span><b>{item.provider_name || paymentTypeLabel[item.payment_type]}</b><small>{paymentTypeLabel[item.payment_type] || item.payment_type}</small></span>
                        <i>{selectedPaymentId === item.id ? '✓' : ''}</i>
                      </button>
                    ))}
                  </div>
                )}

                {selectedPayment && (
                  <div className="selected-payment-info">
                    {selectedPayment.qr_image && <img src={selectedPayment.qr_image} alt="QRIS" />}
                    <div>
                      <b>{selectedPayment.provider_name || paymentTypeLabel[selectedPayment.payment_type]}</b>
                      {selectedPayment.account_number && <strong>{selectedPayment.account_number}</strong>}
                      {selectedPayment.account_name && <span>a/n {selectedPayment.account_name}</span>}
                      {selectedPayment.instructions && <p>{selectedPayment.instructions}</p>}
                    </div>
                  </div>
                )}

                <div className="public-form-grid">
                  <label>
                    <span>Nama Pembayar</span>
                    <input required value={form.payer_name} onChange={(e) => setForm({ ...form, payer_name: e.target.value })} placeholder="Nama sesuai rekening / e-wallet" />
                  </label>
                  <label>
                    <span>Jumlah Transfer</span>
                    <input required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
                  </label>
                  {payments.length === 0 && (
                    <>
                      <label>
                        <span>Metode Pembayaran</span>
                        <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                          <option value="Transfer Bank">Transfer Bank</option>
                          <option value="E-Wallet">E-Wallet</option>
                          <option value="QRIS">QRIS</option>
                        </select>
                      </label>
                      <label>
                        <span>Bank / E-Wallet</span>
                        <input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="BCA / BRI / GoPay / DANA" />
                      </label>
                    </>
                  )}
                </div>
              </div>

              <div className="public-form-section">
                <div className="public-form-section-title">
                  <span>3</span>
                  <div><h2>Bukti & catatan</h2><p>Masukkan URL publik bukti transfer jika tersedia.</p></div>
                </div>
                <div className="public-form-grid">
                  <label className="span2">
                    <span>URL Bukti Transfer <small>Opsional</small></span>
                    <input type="url" value={form.proof_url} onChange={(e) => setForm({ ...form, proof_url: e.target.value })} placeholder="https://drive.google.com/... atau URL gambar publik" />
                    <em>Gunakan link Google Drive yang bisa dilihat publik atau image host.</em>
                  </label>
                  <label className="span2">
                    <span>Catatan <small>Opsional</small></span>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contoh: Transfer dari rekening atas nama berbeda." />
                  </label>
                </div>
              </div>

              {error && <div className="public-form-error">{error}</div>}

              <button className="public-submit-payment" disabled={busy || checking}>
                {busy ? <Loader2 className="spin" /> : <ReceiptText />}
                {busy ? 'Mengirim Konfirmasi...' : 'Kirim Konfirmasi Pembayaran'}
              </button>
            </form>
          )}
        </section>

        <aside className="payment-confirm-side">
          <div className="public-side-card public-side-highlight">
            <ShieldCheck />
            <span>VERIFIKASI AMAN</span>
            <h3>Data pesanan dicocokkan sebelum dikirim</h3>
            <p>Nomor order dan WhatsApp digunakan untuk memastikan konfirmasi masuk ke transaksi yang tepat.</p>
          </div>
          <div className="public-side-card">
            <h3>Langkah Konfirmasi</h3>
            <ol className="public-steps">
              <li><b>1</b><span><strong>Cek pesanan</strong><small>Masukkan nomor order & WhatsApp.</small></span></li>
              <li><b>2</b><span><strong>Pilih pembayaran</strong><small>Pilih bank, e-wallet, atau QRIS.</small></span></li>
              <li><b>3</b><span><strong>Kirim bukti</strong><small>Admin akan memverifikasi pembayaran.</small></span></li>
            </ol>
          </div>
          <div className="public-side-note">
            <CreditCard />
            <div><b>Sudah transfer?</b><span>Pastikan nominal sesuai dengan pesanan agar verifikasi lebih cepat.</span></div>
          </div>
        </aside>
      </main>
    </div>
  )
}
