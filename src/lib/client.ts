import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { AUTH_STORAGE_KEY, createAuthStorage } from '@/lib/auth-storage'

let client: SupabaseClient<Database> | undefined

export function createClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Supabase 환경변수를 확인해주세요.')
  client ??= createSupabaseClient<Database>(url, key, {
    auth: {
      flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true,
      storageKey: AUTH_STORAGE_KEY,
      storage: createAuthStorage(localStorage, sessionStorage),
    },
  })
  return client
}
