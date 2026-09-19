import { corsHeaders, json } from '../_shared/cors.ts'
import { requireAdmin, serviceClient } from '../_shared/supabase.ts'
import { sendEmail, sendWhatsApp } from '../_shared/providers.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = await requireAdmin(req.headers.get('Authorization'))
    const { channel, to } = await req.json()
    if (!['whatsapp', 'email'].includes(channel)) return json({ ok: false, message: 'Channel test tidak valid' }, 400)
    const svc = serviceClient()
    const storeId = auth.role.store_id
    const [{ data: settings, error: sErr }, { data: secret, error: xErr }] = await Promise.all([
      svc.from('integration_settings').select('*').eq('store_id', storeId).eq('channel', channel).maybeSingle(),
      svc.from('integration_secrets').select('secrets').eq('store_id', storeId).eq('channel', channel).maybeSingle(),
    ])
    if (sErr) throw sErr
    if (xErr) throw xErr
    if (!settings) throw new Error('Integrasi belum disimpan')
    const integration = { ...settings, secrets: secret?.secrets || {} }
    if (channel === 'whatsapp') {
      await sendWhatsApp(integration, to, `Test koneksi iMersWAStore berhasil.\nWaktu: ${new Date().toLocaleString('id-ID')}`)
      return json({ ok: true, message: 'Test WhatsApp berhasil dikirim.' })
    }
    await sendEmail(integration, to, 'Test Email iMersWAStore', '<h2>Test berhasil</h2><p>Koneksi email iMersWAStore sudah aktif.</p>')
    return json({ ok: true, message: 'Test email berhasil dikirim.' })
  } catch (error) {
    return json({ ok: false, message: error instanceof Error ? error.message : 'Test gagal' }, 400)
  }
})
