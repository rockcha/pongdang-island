import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/client'
import { RECOVERY_KEY } from '@/lib/auth-storage'
import { setQueryAccount } from '@/lib/account-cache'

const AuthContext = createContext<{ session: Session | null; loading: boolean; error: string | null; recovery: boolean }>({ session: null, loading: true, error: null, recovery: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recovery, setRecovery] = useState(false)
  useEffect(() => {
    let active = true
    const auth = createClient().auth
    const { data: { subscription } } = auth.onAuthStateChange((event, next) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' && next) {
        sessionStorage.setItem(RECOVERY_KEY, JSON.stringify({ user: next.user.id, until: Date.now() + 60 * 60 * 1000 }))
        setRecovery(true)
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(RECOVERY_KEY)
        setRecovery(false)
      } else {
        try {
          const marker = JSON.parse(sessionStorage.getItem(RECOVERY_KEY) ?? 'null')
          setRecovery(Boolean(next && marker?.user === next.user.id && marker?.until > Date.now()))
        } catch { setRecovery(false) }
      }
      setQueryAccount(event === 'PASSWORD_RECOVERY' ? null : next?.user.id ?? null)
      setSession(next); setError(null)
    })
    void auth.initialize().then(async ({ error: initError }) => {
      const { data, error } = await auth.getSession()
      if (active) { setQueryAccount(data.session?.user.id ?? null); setSession(data.session); setError((initError ?? error)?.message ?? null); setLoading(false) }
    }).catch(() => {
      if (active) { setError('로그인 상태를 확인하지 못했어요. 다시 시도해주세요.'); setLoading(false) }
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  return <AuthContext.Provider value={{ session, loading, error, recovery }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }

export function getNickname(session: Session | null): string {
  const value: unknown = session?.user.user_metadata.game_nickname
  return typeof value === 'string' ? value : ''
}
