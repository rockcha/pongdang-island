import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useGold } from '@/features/gold/gold-provider'
import { playRewardSound } from '@/features/gold/purchase-sound'
import {
  actPersonalBaitWorkshop,
  loadPersonalBaitWorkshop,
  personalBaitError,
  type PersonalBaitAction,
  type PersonalBaitState,
} from './personal-bait-api'
function readPending(key: string): PersonalBaitAction | null {
  try {
    const p = JSON.parse(localStorage.getItem(key) ?? 'null')
    return p && ['start', 'claim'].includes(p.p_action) && typeof p.p_operation_id === 'string'
      ? p
      : null
  } catch {
    return null
  }
}
export function usePersonalBaitWorkshop() {
  const { session } = useAuth(),
    { refresh } = useGold(),
    key = `pongdang:personal-bait:${session?.user.id ?? 'guest'}`
  const [state, setState] = useState<PersonalBaitState | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(() => readPending(key)),
    [now, setNow] = useState(Date.now)
  const alive = useRef(true),
    lock = useRef(false),
    revision = useRef(0),
    offset = useRef(0)
  function apply(data: PersonalBaitState) {
    offset.current = Date.parse(data.serverNow) - Date.now()
    setNow(Date.now() + offset.current)
    setState(data)
  }
  function remember(args: PersonalBaitAction | null) {
    setPending(args)
    try {
      if (args) localStorage.setItem(key, JSON.stringify(args))
      else localStorage.removeItem(key)
    } catch {}
  }
  async function reload(clearError = true) {
    if (lock.current) return
    const version = ++revision.current
    try {
      const data = await loadPersonalBaitWorkshop()
      if (alive.current && version === revision.current && !lock.current) {
        apply(data)
        if (clearError) setError('')
      }
    } catch (e) {
      if (alive.current && version === revision.current) setError(personalBaitError(e))
    }
  }
  const onRefresh = useEffectEvent(() => {
    void reload()
  })
  useEffect(() => {
    alive.current = true
    onRefresh()
    const timer = setInterval(() => setNow(Date.now() + offset.current), 1000),
      poll = setInterval(() => {
        if (!document.hidden) onRefresh()
      }, 30000)
    const focus = () => {
      if (!document.hidden) onRefresh()
    }
    window.addEventListener('focus', focus)
    window.addEventListener('online', focus)
    window.addEventListener('personal-bait-changed', focus)
    document.addEventListener('visibilitychange', focus)
    return () => {
      alive.current = false
      revision.current++
      clearInterval(timer)
      clearInterval(poll)
      window.removeEventListener('focus', focus)
      window.removeEventListener('online', focus)
      window.removeEventListener('personal-bait-changed', focus)
      document.removeEventListener('visibilitychange', focus)
    }
  }, [])
  async function run(args: PersonalBaitAction) {
    if (lock.current || (pending && pending.p_operation_id !== args.p_operation_id)) return false
    lock.current = true
    revision.current++
    setBusy(true)
    setError('')
    remember(args)
    try {
      const data = await actPersonalBaitWorkshop(args)
      try {
        localStorage.removeItem(key)
      } catch {}
      if (!alive.current) return true
      apply(data)
      setPending(null)
      if (args.p_action === 'claim') playRewardSound(`personal-bait:${args.p_operation_id}`)
      await Promise.allSettled([refresh()])
      return true
    } catch (e) {
      if (alive.current) {
        setError(personalBaitError(e))
        if ((e as { code?: string }).code) remember(null)
      }
      return false
    } finally {
      lock.current = false
      if (alive.current) {
        setBusy(false)
        void reload(false)
      }
    }
  }
  return { state, error, busy, pending, now, reload, run }
}
