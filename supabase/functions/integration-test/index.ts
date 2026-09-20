import { corsHeaders, json } from '../_shared/cors.ts'
import { requireAdmin, serviceClient } from '../_shared/supabase.ts'
import { sendEmail, sendWhatsApp } from '../_shared/providers.ts'

function safeBase(base: string) { return (base || 'https://rajaongkir.komerce.id/api/v1/').replace(/\/+$/, '') + '/' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = await requireAdmin(req.headers.get('Authorization'))
    const { channel, to } = await req.json()
    if (!['whatsapp', 'email', 'shipping'].includes(channel)) return json({ ok: false, message: 'Channel test tidak valid' }, 400)
    const svc = serviceClient()
    const storeId = auth.role.store_id
    const [{ data: settings, error: sErr }, { data: secret, error: xErr }] = await Promise.all([
      svc.from('integration_settings').select('*').eq('store_id', storeId).eq('channel', channel).maybeSingle(),
      svc.from('integration_secrets').select('secrets').eq('store_id', storeId).eq('channel', channel).maybeSingle(),
    ])
    if (sErr) throw sErr
    if (xErr) throw xErr
    if (!settings) throw new Error('Integrasi belum disimpan')
    const integration = { ...settings, enabled: true, secrets: secret?.secrets || {} } // Test koneksi boleh dijalankan walau integrasi belum diaktifkan.

    if (channel === 'whatsapp') {
      await sendWhatsApp(integration, to, `Test koneksi iMersWAStore berhasil.\nWaktu: ${new Date().toLocaleString('id-ID')}`)
      const normalized = String(to || '').replace(/\D/g, '').replace(/^0/, '62')
      return json({ ok: true, message: `Test WhatsApp ${settings.provider || ''} berhasil dikirim ke ${normalized}.` })
    }

    if (channel === 'email') {
      await sendEmail(integration, to, 'Test Email iMersWAStore', '<h2>Test berhasil</h2><p>Koneksi email iMersWAStore sudah aktif.</p>')
      return json({ ok: true, message: `Test Email ${settings.provider || ''} berhasil dikirim.` })
    }

    if (settings.provider !== 'rajaongkir') return json({ ok: true, message: 'Mode ongkir manual aktif; tidak ada API yang perlu dites.' })
    const apiKey = String(secret?.secrets?.api_key || '').trim()
    if (!apiKey) throw new Error('RajaOngkir API key belum disimpan')
    const search = String(to || 'Jakarta').trim() || 'Jakarta'
    const base = safeBase(String(settings.config?.base_url || ''))
    const res = await fetch(`${base}destination/domestic-destination?search=${encodeURIComponent(search)}&limit=1&offset=0`, {
      headers: { key: apiKey, Accept: 'application/json' },
    })
    const text = await res.text()
    let payload: any = text
    try { payload = text ? JSON.parse(text) : {} } catch { /* text */ }
    if (!res.ok) throw new Error(payload?.meta?.message || payload?.message || 'Test RajaOngkir gagal')
    if (!Array.isArray(payload?.data)) throw new Error('Response RajaOngkir tidak sesuai format yang diharapkan')
    return json({ ok: true, message: `RajaOngkir terhubung. Pencarian "${search}" mengembalikan ${payload.data.length} hasil.` })
  } catch (error) {
    return json({ ok: false, message: error instanceof Error ? error.message : 'Test gagal' }, 400)
  }
})
