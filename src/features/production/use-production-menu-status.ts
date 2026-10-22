import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { loadProduction } from './api'
import { loadBaitProduction } from './bait-production-api'

type Site = { startedAt: string | null; completesAt: string | null; expiresAt: string | null }
type Snapshot = { serverNow: string; sites?: Site[]; facilities: Site[] }
type Status = { ready: number; total: number }

export function useProductionMenuStatus(kind: 'fuel' | 'bait'): Status | null {
  const { session, recovery } = useAuth()
  const owner = session?.user.id
  const [state, setState] = useState<{ owner: string; status: Status } | null>(null)
  useEffect(() => {
    if (!owner || recovery) return
    let alive = true, revision = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    async function refresh() {
      if (document.hidden) return
      const request = ++revision
      try {
        const data: Snapshot = await (kind === 'fuel' ? loadProduction() : loadBaitProduction())
        if (!alive || request !== revision) return
        clearTimeout(timer)
        const sites = data.sites ?? data.facilities.filter(s => s.startedAt)
        const offset = Date.parse(data.serverNow) - Date.now()
        function publish() {
          if (!alive) return
          const now = Date.now() + offset
          setState({ owner: owner!, status: {
            ready: sites.filter(s => s.startedAt && s.completesAt && s.expiresAt && Date.parse(s.completesAt) <= now && now < Date.parse(s.expiresAt)).length,
            total: sites.length,
          } })
          const future = sites.flatMap(s => s.startedAt ? [s.completesAt, s.expiresAt] : [])
            .filter((value): value is string => !!value).map(value => Date.parse(value) - now).filter(ms => ms > 0)
          if (future.length) timer = setTimeout(publish, Math.min(Math.min(...future) + 1, 2147483647))
        }
        publish()
      } catch { /* Keep the last confirmed status until the next refresh. */ }
    }
    const update = () => { void refresh() }
    const event = kind === 'fuel' ? 'production-changed' : 'bait-production-changed'
    update()
    const poll = setInterval(update, 60000)
    window.addEventListener('focus', update)
    window.addEventListener('online', update)
    window.addEventListener(event, update)
    document.addEventListener('visibilitychange', update)
    return () => {
      alive = false
      clearTimeout(timer)
      clearInterval(poll)
      window.removeEventListener('focus', update)
      window.removeEventListener('online', update)
      window.removeEventListener(event, update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [owner, recovery, kind])
  return !recovery && state?.owner === owner ? state?.status ?? null : null
}
