type Integration = {
  provider?: string | null
  enabled?: boolean
  sender?: string | null
  from_name?: string | null
  from_email?: string | null
  config?: Record<string, unknown> | null
  secrets?: Record<string, unknown> | null
}

function asString(value: unknown) { return String(value ?? '').trim() }

export function normalizePhone(value: string) {
  let phone = value.replace(/\D/g, '')
  if (phone.startsWith('0')) phone = `62${phone.slice(1)}`
  return phone
}

async function readResponse(res: Response) {
  const text = await res.text()
  let body: any = text
  try { body = text ? JSON.parse(text) : {} } catch { /* keep text */ }
  if (!res.ok) throw new Error(body?.message || body?.error || (typeof body === 'string' ? body : JSON.stringify(body)))
  return body
}

const WA_ENDPOINTS: Record<string,string> = {
  fonnte: 'https://api.fonnte.com/send',
  waplus: 'https://app.waplus.id/send-message',
  starsender: 'https://api.starsender.online/api/send',
  xsender: 'https://xsender.id/send-message',
}

function resolvedWaEndpoint(provider: string, custom?: unknown) {
  const entered = asString(custom)
  if (!entered) return WA_ENDPOINTS[provider] || ''
  const known = new Set(Object.values(WA_ENDPOINTS))
  if (known.has(entered) && entered !== WA_ENDPOINTS[provider]) return WA_ENDPOINTS[provider] || entered
  return entered
}

export async function sendWhatsApp(integration: Integration, to: string, message: string) {
  if (!integration.enabled) throw new Error('Integrasi WhatsApp belum diaktifkan')
  const provider = asString(integration.provider || 'fonnte').toLowerCase()
  const apiKey = asString(integration.secrets?.api_key)
  const target = normalizePhone(to)
  const sender = normalizePhone(asString(integration.sender))
  const endpoint = resolvedWaEndpoint(provider, integration.config?.endpoint)
  if (!target) throw new Error('Nomor tujuan kosong')
  if (!apiKey) throw new Error('API token / device key WhatsApp belum disimpan')

  // Persis mengikuti implementasi WAGateway.gs iMersWAStore GAS v1.2.
  if (provider === 'fonnte') {
    const form = new FormData()
    form.set('target', target)
    form.set('message', message)
    const body = await readResponse(await fetch(endpoint || WA_ENDPOINTS.fonnte, {
      method: 'POST', headers: { Authorization: apiKey }, body: form,
    }))
    if (body && typeof body === 'object' && body.status === false) throw new Error(body.reason || body.message || 'Fonnte menolak pengiriman')
    return body
  }

  if (provider === 'waplus') {
    if (!sender) throw new Error('Nomor Device / Sender wajib untuk WAplus')
    const body = await readResponse(await fetch(endpoint || WA_ENDPOINTS.waplus, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, sender, number: target, message }),
    }))
    if (body && typeof body === 'object' && body.status === false) throw new Error(body.message || 'WAplus menolak pengiriman')
    return body
  }

  if (provider === 'starsender') {
    const body = await readResponse(await fetch(endpoint || WA_ENDPOINTS.starsender, {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageType: 'text', to: target, body: message }),
    }))
    if (body && typeof body === 'object' && (body.status === false || body.success === false)) {
      throw new Error(body.message || body.error || 'StarSender menolak pengiriman')
    }
    return body
  }

  if (provider === 'xsender') {
    if (!sender) throw new Error('Nomor Device / Sender wajib untuk XSender')
    const body = await readResponse(await fetch(endpoint || WA_ENDPOINTS.xsender, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, sender, number: target, message }),
    }))
    if (body && typeof body === 'object' && body.status === false) throw new Error(body.message || 'XSender menolak pengiriman')
    return body
  }

  if (!endpoint) throw new Error('Endpoint WhatsApp webhook belum diisi')
  return await readResponse(await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'X-API-Key': apiKey },
    body: JSON.stringify({ target, to: target, message, sender: sender || null }),
  }))
}

export async function sendEmail(integration: Integration, to: string, subject: string, html: string) {
  if (!integration.enabled) throw new Error('Integrasi email belum diaktifkan')
  const provider = asString(integration.provider || 'mailketing').toLowerCase()
  const apiKey = asString(integration.secrets?.api_key)
  const endpoint = asString(integration.config?.endpoint) || 'https://api.mailketing.co.id/api/v1/send'
  if (!to) throw new Error('Email tujuan kosong')

  if (provider === 'mailketing') {
    if (!apiKey) throw new Error('API token Mailketing belum disimpan')
    if (!asString(integration.from_email)) throw new Error('From Email Mailketing wajib diisi dan harus sudah terverifikasi')
    const form = new URLSearchParams()
    form.set('api_token', apiKey)
    form.set('from_name', asString(integration.from_name) || 'iMersWAStore')
    form.set('from_email', asString(integration.from_email))
    form.set('recipient', to)
    form.set('subject', subject)
    form.set('content', html)
    return await readResponse(await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
    }))
  }

  if (provider === 'smtp') {
    const host = asString(integration.config?.host || integration.config?.endpoint)
    const port = Number(integration.config?.port || 587)
    const username = asString(integration.config?.username)
    const password = apiKey
    if (!host || !username || !password) throw new Error('Host, username, dan SMTP password wajib diisi')
    const nodemailer = await import('npm:nodemailer@6.9.16')
    const transport = nodemailer.default.createTransport({
      host, port, secure: port === 465, auth: { user: username, pass: password },
    })
    return await transport.sendMail({
      from: `"${asString(integration.from_name) || 'iMersWAStore'}" <${asString(integration.from_email) || username}>`,
      to, subject, html,
    })
  }

  if (!endpoint) throw new Error('Endpoint email webhook belum diisi')
  return await readResponse(await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey ? `Bearer ${apiKey}` : '', 'X-API-Key': apiKey },
    body: JSON.stringify({ to, subject, html, from_name: integration.from_name || null, from_email: integration.from_email || null }),
  }))
}
