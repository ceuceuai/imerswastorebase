import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

export const supabaseUrl = Deno.env.get('SUPABASE_URL')!
export const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
export const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

export function serviceClient() {
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function userClient(authHeader: string) {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function requireAdmin(authHeader: string | null) {
  if (!authHeader) throw new Error('Unauthorized')
  const client = userClient(authHeader)
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData?.user) throw new Error('Unauthorized')
  const { data: roleData, error: roleError } = await client.rpc('resolve_account_role')
  if (roleError) throw roleError
  if (roleData?.account_type !== 'admin' || !['owner', 'admin', 'manager'].includes(roleData?.role)) {
    throw new Error('Akses admin toko diperlukan')
  }
  return { client, user: userData.user, role: roleData }
}
