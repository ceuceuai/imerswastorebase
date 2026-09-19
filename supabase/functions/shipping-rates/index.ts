import { corsHeaders, json } from '../_shared/cors.ts'
import { serviceClient } from '../_shared/supabase.ts'

function safeBase(base: string) { return (base || 'https://rajaongkir.komerce.id/api/v1/').replace(/\/+$/, '') + '/' }
async function parse(res: Response) {
  const text = await res.text()
  let body: any = text
  try { body = text ? JSON.parse(text) : {} } catch { /* text */ }
  if (!res.ok) throw new Error(body?.meta?.message || body?.message || (typeof body === 'string' ? body : 'RajaOngkir request gagal'))
  return body
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json()
    const svc = serviceClient()
    const { data: runtime, error: rtErr } = await svc.from('single_store_runtime').select('store_id').eq('singleton', true).maybeSingle()
    if (rtErr) throw rtErr
    if (!runtime?.store_id) throw new Error('Single store belum dikonfigurasi')
    const [{ data: settings, error: sErr }, { data: secret, error: xErr }] = await Promise.all([
      svc.from('integration_settings').select('*').eq('store_id', runtime.store_id).eq('channel', 'shipping').maybeSingle(),
      svc.from('integration_secrets').select('secrets').eq('store_id', runtime.store_id).eq('channel', 'shipping').maybeSingle(),
    ])
    if (sErr) throw sErr
    if (xErr) throw xErr
    if (!settings?.enabled || settings.provider !== 'rajaongkir') return json({ ok: true, enabled: false, items: [] })
    const apiKey = String(secret?.secrets?.api_key || '')
    if (!apiKey) throw new Error('RajaOngkir API key belum disimpan')
    const base = safeBase(String(settings.config?.base_url || ''))

    if (body.action === 'search') {
      const q = String(body.search || '').trim()
      if (q.length < 2) return json({ ok: true, enabled: true, items: [] })
      const url = `${base}destination/domestic-destination?search=${encodeURIComponent(q)}&limit=20&offset=0`
      const res = await fetch(url, { headers: { key: apiKey } })
      const payload = await parse(res)
      const raw = payload?.data || []
      const items = (Array.isArray(raw) ? raw : []).map((x: any) => ({
        id: String(x.id ?? x.subdistrict_id ?? x.district_id ?? ''),
        label: [x.subdistrict_name, x.district_name, x.city_name, x.province_name, x.zip_code].filter(Boolean).join(', '),
        raw: x,
      })).filter((x: any) => x.id)
      return json({ ok: true, enabled: true, items })
    }

    if (body.action === 'quote') {
      const origin = String(settings.config?.origin_id || '').trim()
      const destination = String(body.destination_id || '').trim()
      const weight = Math.max(1, Math.ceil(Number(body.weight || 1000)))
      const courier = String(body.couriers || settings.config?.couriers || 'jne:sicepat:jnt:ninja:tiki:anteraja:pos')
      if (!origin || !destination) throw new Error('Origin dan destination RajaOngkir wajib diisi')
      const form = new URLSearchParams({ origin, destination, weight: String(weight), courier, price: 'lowest' })
      const res = await fetch(`${base}calculate/domestic-cost`, {
        method: 'POST', headers: { key: apiKey, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
      })
      const payload = await parse(res)
      const raw = payload?.data || []
      const parsed = (Array.isArray(raw) ? raw : []).map((x: any, i: number) => ({
        id: `${x.code || x.name || x.service || 'ship'}-${i}`,
        courier: x.name || x.code || x.courier_name || 'Kurir',
        service: x.service || x.service_name || x.description || '-',
        description: x.description || x.service || '',
        cost: Number(x.cost ?? x.price ?? x.value ?? 0),
        etd: x.etd || x.estimated || x.estimated_delivery || '',
      })).filter((x: any) => Number.isFinite(x.cost) && x.cost >= 0)
      const rows = parsed.map((x: any) => ({
        store_id: runtime.store_id,
        destination_id: destination,
        courier: x.courier,
        service: x.service,
        description: x.description,
        cost: x.cost,
        etd: x.etd,
        weight_grams: weight,
      }))
      if (!rows.length) return json({ ok: true, enabled: true, items: [] })
      const { data: saved, error: saveErr } = await svc.from('shipping_quotes').insert(rows).select('quote_token,courier,service,description,cost,etd')
      if (saveErr) throw saveErr
      const items = (saved || []).map((x: any, i: number) => ({ ...x, id: `${x.courier}-${x.service}-${i}` }))
      return json({ ok: true, enabled: true, items })
    }

    return json({ ok: false, message: 'Action tidak valid' }, 400)
  } catch (error) {
    return json({ ok: false, message: error instanceof Error ? error.message : 'Shipping API gagal' }, 400)
  }
})
