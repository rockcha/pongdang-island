import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { AUTH_STORAGE_KEY, createAuthStorage } from '@/lib/auth-storage'

let client: SupabaseClient<Database> | undefined
const backgroundPaths = new Set([
  'rpc/sync_titles', 'rpc/player_presence_ping', 'rpc/sync_player_profile',
  'rpc/new_content_state', 'rpc/refresh_return_notifications',
  'rpc/menu_status', 'rpc/notification_inbox',
  'rpc/expedition_state', 'rpc/production_state', 'rpc/bait_production_state',
  'rpc/harbor_state', 'rpc/savings_state',
])

export function createClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Supabase 환경변수를 확인해주세요.')
  client ??= createSupabaseClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const requestUrl = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
        const headers = new Headers(input instanceof Request ? input.headers : undefined)
        new Headers(init?.headers).forEach((value, name) => headers.set(name, value))
        const authorization = headers.get('Authorization')
        if (backgroundPaths.has(requestUrl.pathname.replace(/^\/rest\/v1\//, '')) &&
          (!authorization || authorization === `Bearer ${key}`)) {
          return Promise.resolve(new Response(JSON.stringify({code:'PGRST301',message:'로그인이 필요해요.'}), {
            status:401,headers:{'Content-Type':'application/json'},
          }))
        }
        return fetch(input, init)
      },
    },
    auth: {
      flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true,
      storageKey: AUTH_STORAGE_KEY,
      storage: createAuthStorage(localStorage, sessionStorage),
    },
  })
  return client
}
