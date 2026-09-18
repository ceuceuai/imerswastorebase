import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configuredStoreId = import.meta.env.VITE_STORE_ID || ''
export const supabaseEnabled = Boolean(url && anonKey && !url.includes('YOUR_PROJECT'))

export const supabase = supabaseEnabled
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export async function getOwnerContext() {
  if (!supabaseEnabled) return { user: null, profile: null, storeId: configuredStoreId || null }
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const user = userData?.user
  if (!user) return { user: null, profile: null, storeId: null }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,store_id,full_name,role,avatar_url')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) throw profileError

  return { user, profile, storeId: profile?.store_id || configuredStoreId || null }
}
