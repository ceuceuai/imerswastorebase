import { corsHeaders, json } from '../_shared/cors.ts'
import { requireAdmin, serviceClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const auth = await requireAdmin(req.headers.get('Authorization'))
    if (!['owner', 'admin'].includes(auth.role.role)) throw new Error('Hanya owner/admin yang dapat mengelola login staff')
    const body = await req.json()
    const action = String(body.action || 'invite')
    const svc = serviceClient()

    if (action === 'status' || action === 'delete') {
      const staffId = String(body.staff_id || '')
      const { data: staff, error: findErr } = await svc.from('store_staff').select('*').eq('id', staffId).eq('store_id', auth.role.store_id).maybeSingle()
      if (findErr) throw findErr
      if (!staff) throw new Error('Staff tidak ditemukan')
      if (action === 'delete') {
        if (staff.auth_user_id) await svc.auth.admin.deleteUser(staff.auth_user_id)
        const { error: delErr } = await svc.from('store_staff').delete().eq('id', staff.id)
        if (delErr) throw delErr
        return json({ ok: true, message: `Staff ${staff.name} dihapus.` })
      }
      const active = Boolean(body.active)
      const { error: upErr } = await svc.from('store_staff').update({ active, updated_at: new Date().toISOString() }).eq('id', staff.id)
      if (upErr) throw upErr
      if (staff.auth_user_id) {
        const { error: pErr } = await svc.from('profiles').update({ store_id: active ? auth.role.store_id : null }).eq('id', staff.auth_user_id)
        if (pErr) throw pErr
      }
      return json({ ok: true, message: active ? 'Akses staff diaktifkan.' : 'Akses staff dinonaktifkan.' })
    }

    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = String(body.phone || '').trim() || null
    const role = String(body.role || 'cashier')
    const permissions = body.permissions || { pos: true, orders: true, products: false, inventory: false, reports: false }
    const active = body.active !== false
    if (!name || !email) throw new Error('Nama dan email staff wajib diisi')
    if (!['cashier','manager','inventory','admin'].includes(role)) throw new Error('Role staff tidak valid')

    const { data: existingStaff, error: stErr } = await svc.from('store_staff').select('*').eq('store_id', auth.role.store_id).ilike('email', email).maybeSingle()
    if (stErr) throw stErr
    let authUserId = existingStaff?.auth_user_id || null

    if (!authUserId) {
      const frontOrigin = String(body.redirect_origin || req.headers.get('origin') || '').replace(/\/$/, '')
      const { data: inviteData, error: inviteError } = await svc.auth.admin.inviteUserByEmail(email, {
        data: { account_type: 'staff', full_name: name, role, store_id: auth.role.store_id },
        redirectTo: frontOrigin ? `${frontOrigin}/reset-password` : undefined,
      })
      if (inviteError) throw inviteError
      authUserId = inviteData.user?.id || null
    }
    if (!authUserId) throw new Error('User staff gagal dibuat')

    const { error: profileErr } = await svc.from('profiles').upsert({
      id: authUserId,
      store_id: active ? auth.role.store_id : null,
      full_name: name,
      role,
    }, { onConflict: 'id' })
    if (profileErr) throw profileErr

    const payload = { store_id: auth.role.store_id, auth_user_id: authUserId, name, email, phone, role, permissions, active, updated_at: new Date().toISOString() }
    const { data: staff, error: upsertErr } = existingStaff?.id
      ? await svc.from('store_staff').update(payload).eq('id', existingStaff.id).select().single()
      : await svc.from('store_staff').insert(payload).select().single()
    if (upsertErr) throw upsertErr

    return json({ ok: true, staff, message: existingStaff?.auth_user_id ? 'Data staff diperbarui.' : `Undangan login dikirim ke ${email}.` })
  } catch (error) {
    return json({ ok: false, message: error instanceof Error ? error.message : 'Pengelolaan staff gagal' }, 400)
  }
})
