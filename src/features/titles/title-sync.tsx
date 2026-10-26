import { useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useSocial } from '@/features/social/social-provider'
import { createClient } from '@/lib/client'
import { hasBackgroundSession, isAuthFailure } from '@/lib/background-session'
import { syncTitles } from './api'

export function TitleSync() {
  const { session, recovery } = useAuth()
  const { refresh } = useSocial()
  const owner = !recovery ? session?.user.id : undefined
  useEffect(() => {
    if (!owner) return
    let active = true, running = false, pending = false, blocked = false, lastRun = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      pending = true
      if (!active || blocked || running || document.hidden) return
      clearTimeout(timer)
      timer = setTimeout(() => void sync(), Math.max(1000, lastRun + 60000 - Date.now()))
    }
    const sync = async () => {
      if (!active || running || blocked || document.hidden) return
      running = true
      pending = false
      lastRun = Date.now()
      try {
        if (!await hasBackgroundSession(owner) || !active) return
        const count = await syncTitles()
        if (active && count > 0) await refresh()
      } catch (cause) {
        blocked = isAuthFailure(cause)
      } finally {
        running = false
        if (pending && active) schedule()
      }
    }
    const resume = () => { schedule() }
    const { data: { subscription } } = createClient().auth.onAuthStateChange(() => { blocked = false; schedule() })
    schedule()
    window.addEventListener('quest-progress-changed', schedule)
    window.addEventListener('focus', resume)
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)
    return () => {
      active = false
      clearTimeout(timer)
      subscription.unsubscribe()
      window.removeEventListener('quest-progress-changed', schedule)
      window.removeEventListener('focus', resume)
      window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [owner, refresh])
  return null
}
