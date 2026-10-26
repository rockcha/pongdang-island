import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from './auth-provider'
import { createClient } from '@/lib/client'
import { hasBackgroundSession, isAuthFailure } from '@/lib/background-session'

type Source = 'board' | 'exchange' | 'suggestions' | 'bugs' | 'showcase'
type Latest = Record<Source, string | null>
const sources: Source[] = ['board', 'exchange', 'suggestions', 'bugs', 'showcase']
const sourcePaths: Record<Source, string> = { board: '/board', exchange: '/exchange', suggestions: '/square/suggestions', bugs: '/square/bugs', showcase: '/showcase' }
const emptyState = { board: false, exchange: false, suggestions: false, bugs: false, showcase: false }
const seenKey = (owner: string, source: Source) => `pongdang:content-seen:${owner}:${source}`
function seen(owner: string, source: Source) {
  try { return Number(localStorage.getItem(seenKey(owner, source))) || 0 } catch { return 0 }
}
function markSeen(owner: string, source: Source, timestamp: number) {
  try { localStorage.setItem(seenKey(owner, source), String(Math.max(seen(owner, source), timestamp))) } catch {}
}

export function useNewContent() {
  const { session, recovery } = useAuth()
  const owner = session?.user.id
  const { pathname } = useLocation()
  const path = useRef(pathname)
  const applyRef = useRef<() => void>(() => {})
  const [state, setState] = useState<({ owner: string } & Record<Source, boolean>) | null>(null)
  useEffect(() => { path.current = pathname; applyRef.current() }, [pathname])
  useEffect(() => {
    if (!owner || recovery) return
    let active = true, loading = false, blocked = false, pending = false
    let latest: Latest | null = null
    const apply = () => {
      if (!active || !latest) return
      const updates = { ...emptyState }
      for (const source of sources) {
        const newest = Date.parse(latest[source] ?? '') || 0
        const destination = sourcePaths[source]
        if (path.current === destination || (source !== 'showcase' && path.current.startsWith(`${destination}/`))) markSeen(owner, source, newest)
        updates[source] = newest > seen(owner, source)
      }
      setState({ owner, ...updates })
    }
    applyRef.current = apply
    async function refresh() {
      if (!active || blocked || document.hidden) return
      if (loading) { pending = true; return }
      loading = true
      try {
        if (!await hasBackgroundSession(owner!) || !active) return
        const { data, error } = await createClient().rpc('new_content_state')
        if (error) throw error
        if (!active) return
        latest = data
        apply()
      } catch (cause) { blocked = isAuthFailure(cause) }
      finally {
        loading = false
        if (pending && active) { pending = false; void refresh() }
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 60000)
    const update = () => void refresh()
    const storage = (event: StorageEvent) => { if (event.key?.startsWith(`pongdang:content-seen:${owner}:`)) apply() }
    const { data: { subscription } } = createClient().auth.onAuthStateChange(() => { blocked = false; setTimeout(() => { if (active) void refresh() }, 0) })
    for (const event of ['focus', 'online', 'exchange-changed', 'board-changed', 'showcase-changed']) window.addEventListener(event, update)
    window.addEventListener('storage', storage)
    document.addEventListener('visibilitychange', update)
    return () => {
      active = false
      clearInterval(timer)
      subscription.unsubscribe()
      applyRef.current = () => {}
      for (const event of ['focus', 'online', 'exchange-changed', 'board-changed', 'showcase-changed']) window.removeEventListener(event, update)
      window.removeEventListener('storage', storage)
      document.removeEventListener('visibilitychange', update)
    }
  }, [owner, recovery])
  if (!recovery && state && state.owner === owner) {
    const { owner: _owner, ...badges } = state
    return badges
  }
  return emptyState
}
