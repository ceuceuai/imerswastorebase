import { corsHeaders, json } from '../_shared/cors.ts'
import { requireAdmin, serviceClient } from '../_shared/supabase.ts'
import { sendEmail, sendWhatsApp } from '../_shared/providers.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = await requireAdmin(req.headers.get('Authorization'))
    const { campaign_id, batch_size = 20 } = await req.json()
    if (!campaign_id) return json({ ok: false, message: 'campaign_id wajib diisi' }, 400)
    const limit = Math.min(Math.max(Number(batch_size) || 20, 1), 20)
    const svc = serviceClient()
    const { data: campaign, error: cErr } = await svc.from('broadcast_campaigns').select('*').eq('id', campaign_id).eq('store_id', auth.role.store_id).maybeSingle()
    if (cErr) throw cErr
    if (!campaign) throw new Error('Campaign tidak ditemukan')
    const [{ data: settings, error: sErr }, { data: secret, error: xErr }] = await Promise.all([
      svc.from('integration_settings').select('*').eq('store_id', auth.role.store_id).eq('channel', campaign.channel).maybeSingle(),
      svc.from('integration_secrets').select('secrets').eq('store_id', auth.role.store_id).eq('channel', campaign.channel).maybeSingle(),
    ])
    if (sErr) throw sErr
    if (xErr) throw xErr
    if (!settings?.enabled) throw new Error(`Integrasi ${campaign.channel} belum aktif`)
    const integration = { ...settings, secrets: secret?.secrets || {} }

    const { data: recipients, error: rErr } = await svc.from('broadcast_recipients')
      .select('*').eq('campaign_id', campaign_id).eq('status', 'pending').order('created_at').limit(limit)
    if (rErr) throw rErr
    if (!recipients?.length) {
      const doneStatus = Number(campaign.failed_count || 0) > 0 ? 'partial' : 'sent'
      await svc.from('broadcast_campaigns').update({ status: doneStatus, completed_at: new Date().toISOString() }).eq('id', campaign_id)
      return json({ ok: true, processed: 0, message: doneStatus === 'partial' ? 'Antrean selesai dengan sebagian penerima gagal.' : 'Antrean campaign sudah selesai.' })
    }

    await svc.from('broadcast_campaigns').update({ status: 'sending', started_at: campaign.started_at || new Date().toISOString() }).eq('id', campaign_id)
    let sent = 0, failed = 0
    for (const recipient of recipients) {
      const message = String(campaign.message || '').replaceAll('{name}', recipient.recipient_name || 'Pelanggan')
      try {
        if (campaign.channel === 'whatsapp') {
          if (!recipient.recipient) throw new Error('Nomor WhatsApp kosong')
          await sendWhatsApp(integration, recipient.recipient, message)
        } else {
          if (!recipient.recipient) throw new Error('Email kosong')
          await sendEmail(integration, recipient.recipient, campaign.subject || campaign.name, message.replace(/\n/g, '<br>'))
        }
        sent++
        await svc.from('broadcast_recipients').update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null }).eq('id', recipient.id)
      } catch (error) {
        failed++
        await svc.from('broadcast_recipients').update({ status: 'failed', error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Gagal' }).eq('id', recipient.id)
      }
    }

    const { count: remaining } = await svc.from('broadcast_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign_id).eq('status', 'pending')
    const nextStatus = (remaining || 0) > 0 ? (failed ? 'partial' : 'sending') : (failed ? 'partial' : 'sent')
    await svc.from('broadcast_campaigns').update({
      status: nextStatus,
      sent_count: Number(campaign.sent_count || 0) + sent,
      failed_count: Number(campaign.failed_count || 0) + failed,
      completed_at: (remaining || 0) === 0 ? new Date().toISOString() : null,
    }).eq('id', campaign_id)

    return json({ ok: true, processed: recipients.length, sent, failed, remaining: remaining || 0, message: `${sent} terkirim, ${failed} gagal. Sisa antrean ${remaining || 0}.` })
  } catch (error) {
    return json({ ok: false, message: error instanceof Error ? error.message : 'Dispatch gagal' }, 400)
  }
})
