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

async function safeResponse(res: Response) {
  const text = await res.text()
  let body: unknown = text
  try { body = text ? JSON.parse(text) : {} } catch { /* text response */ }
  if (!res.ok) throw new Error(typeof body === 'string' ? body : JSON.stringify(body))
  return body
}

export async function sendWhatsApp(integration: Integration, to: string, message: string) {
  if (!integration.enabled) throw new Error('Integrasi WhatsApp belum diaktifkan')
  const provider = asString(integration.provider || 'fonnte').toLowerCase()
  const apiKey = asString(integration.secrets?.api_key)
  const endpoint = asString(integration.config?.endpoint) || 'https://api.fonnte.com/send'
  const target = normalizePhone(to)
  if (!target) throw new Error('Nomor tujuan kosong')
  if (!apiKey) throw new Error('API token WhatsApp belum disimpan')

  if (provider === 'fonnte') {
    const form = new FormData()
    form.set('target', target)
    form.set('message', message)
    if (integration.sender) form.set('device', normalizePhone(integration.sender))
    const res = await fetch(endpoint, { method: 'POST', headers: { Authorization: apiKey }, body: form })
    return safeResponse(res)
  }

  // Provider lain dibuat configurable karena format API bisa berbeda antar paket/versi.
  // Endpoint custom menerima payload generik ini.
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, 'X-API-Key': apiKey },
    body: JSON.stringify({ target, to: target, message, sender: integration.sender || null }),
  })
  return safeResponse(res)
}

export async function sendEmail(integration: Integration, to: string, subject: string, html: string) {
  if (!integration.enabled) throw new Error('Integrasi email belum diaktifkan')
  const provider = asString(integration.provider || 'mailketing').toLowerCase()
  const apiKey = asString(integration.secrets?.api_key)
  const endpoint = asString(integration.config?.endpoint) || 'https://api.mailketing.co.id/api/v1/send'
  if (!to) throw new Error('Email tujuan kosong')

  if (provider === 'mailketing') {
    if (!apiKey) throw new Error('API token Mailketing belum disimpan')
    const form = new URLSearchParams()
    form.set('api_token', apiKey)
    form.set('from_name', asString(integration.from_name) || 'iMersWAStore')
    form.set('from_email', asString(integration.from_email))
    form.set('recipient', to)
    form.set('subject', subject)
    form.set('content', html)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    return safeResponse(res)
  }

  if (provider === 'smtp') {
    const host = asString(integration.config?.host || integration.config?.endpoint)
    const port = Number(integration.config?.port || 587)
    const username = asString(integration.config?.username)
    const password = apiKey
    if (!host || !username || !password) throw new Error('Host, username, dan SMTP password wajib diisi')
    const nodemailer = await import('npm:nodemailer@6.9.16')
    const transport = nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: username, pass: password },
    })
    return await transport.sendMail({
      from: `"${asString(integration.from_name) || 'iMersWAStore'}" <${asString(integration.from_email) || username}>`,
      to,
      subject,
      html,
    })
  }

  if (!endpoint) throw new Error('Endpoint email webhook belum diisi')
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey ? `Bearer ${apiKey}` : '', 'X-API-Key': apiKey },
    body: JSON.stringify({
      to, subject, html,
      from_name: integration.from_name || null,
      from_email: integration.from_email || null,
    }),
  })
  return safeResponse(res)
}
