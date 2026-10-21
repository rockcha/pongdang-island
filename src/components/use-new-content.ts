import {loadShowcase} from '@/features/showcase/api'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from './auth-provider'
import { loadBoardFeed } from '@/features/board/api'
import { loadExchange } from '@/features/exchange/api'
import { loadSuggestions } from '@/features/suggestions/api'
import { loadBugReports } from '@/features/bugs/api'

type Source = 'board' | 'exchange' | 'suggestions' | 'bugs' | 'showcase'
const sources: Source[] = ['board', 'exchange', 'suggestions', 'bugs', 'showcase']
const sourcePaths:Record<Source,string>={board:'/board',exchange:'/exchange',suggestions:'/square/suggestions',bugs:'/square/bugs',showcase:'/showcase'}
const emptyState={board:false,exchange:false,suggestions:false,bugs:false,showcase:false}
const seenKey = (owner: string, source: Source) => `pongdang:content-seen:${owner}:${source}`
function seen(owner: string, source: Source) {
  try {
    return Number(localStorage.getItem(seenKey(owner, source))) || 0
  } catch {
    return 0
  }
}
function markSeen(owner: string, source: Source, timestamp: number) {
  try {
    localStorage.setItem(seenKey(owner, source), String(Math.max(seen(owner, source), timestamp)))
  } catch {}
}

export function useNewContent() {
  const { session, recovery } = useAuth()
  const owner = session?.user.id
  const { pathname } = useLocation()
  const [state, setState] = useState<({ owner: string } & Record<Source,boolean>) | null>(
    null,
  )
  useEffect(() => {
    if (!owner || recovery) return
    let active = true,
      loading = false
    const onSourcePage = (source: Source) =>
      pathname === sourcePaths[source] || (source!=='showcase'&&pathname.startsWith(`${sourcePaths[source]}/`))
    async function refresh() {
      if (!active || loading || document.hidden) return
      loading = true
      const results = await Promise.allSettled([
        loadBoardFeed('latest', false, 0),
        loadExchange('all', '', 0),
        loadSuggestions(0,null),
        loadBugReports(0,null),
        loadShowcase(false,0),
      ])
      loading = false
      if (!active) return
      const updates: Partial<Record<Source, boolean>> = {}
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return
        const source = sources[index]
        const entries = result.value.items as {
          created_at: string
          author_id?: string
          owner_id?: string
          side?: string
        }[]
        const newest = entries.reduce((latest, entry) => {
          if (
            (entry.author_id ?? entry.owner_id) === owner ||
            (source === 'exchange' && entry.side !== 'sell')
          )
            return latest
          return Math.max(latest, Date.parse(entry.created_at) || 0)
        }, 0)
        if (onSourcePage(source)) markSeen(owner!, source, newest)
        updates[source] = newest > seen(owner!, source)
      })
      setState((previous) => ({
        owner: owner!,
        ...emptyState,
        ...(previous?.owner === owner ? previous : {}),
        ...updates,
      }))
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 60000)
    const update = () => void refresh()
    const storage = (event: StorageEvent) => {
      if (event.key?.startsWith(`pongdang:content-seen:${owner}:`)) update()
    }
    window.addEventListener('focus', update)
    window.addEventListener('online', update)
    window.addEventListener('exchange-changed', update)
    window.addEventListener('board-changed', update)
    window.addEventListener('showcase-changed', update)
    window.addEventListener('storage', storage)
    document.addEventListener('visibilitychange', update)
    return () => {
      active = false
      clearInterval(timer)
      window.removeEventListener('focus', update)
      window.removeEventListener('online', update)
      window.removeEventListener('exchange-changed', update)
      window.removeEventListener('board-changed', update)
      window.removeEventListener('showcase-changed', update)
      window.removeEventListener('storage', storage)
      document.removeEventListener('visibilitychange', update)
    }
  }, [owner, recovery, pathname])
  return !recovery && state && state.owner === owner
    ? { board: state.board, exchange: state.exchange, suggestions:state.suggestions, bugs:state.bugs, showcase:state.showcase }
    : emptyState
}
