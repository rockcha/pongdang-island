import { useCallback, useEffect, useRef, useState } from 'react'
import { randomId } from '@/lib/random-id'
import {
  actProduction,
  actProductionBulk,
  loadProduction,
  productionError,
  type ProductionAction,
  type ProductionBulkAction,
  type ProductionState,
} from './api'

type Mutation =
  | { kind: 'single'; args: Omit<ProductionAction, 'p_operation_id'> }
  | { kind: 'bulk'; args: Omit<ProductionBulkAction, 'p_operation_id'> }

export function useProduction() {
  const [state, setState] = useState<ProductionState | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [now, setNow] = useState(Date.now()),
    offset = useRef(0),
    alive = useRef(true),
    lock = useRef(false),
    request = useRef(0)
  const pending = useRef<{ signature: string; id: string; body: Mutation } | null>(null)
  const apply = useCallback((data: ProductionState) => {
    if (!alive.current) return
    offset.current = Date.parse(data.serverNow) - Date.now()
    setNow(Date.now() + offset.current)
    setState(data)
    if (!pending.current) setError('')
  }, [])
  const reload = useCallback(async () => {
    const version = ++request.current
    try {
      const data = await loadProduction()
      if (version === request.current && !lock.current) apply(data)
    } catch (cause) {
      if (alive.current && version === request.current) setError(productionError(cause))
    }
  }, [apply])
  useEffect(() => {
    alive.current = true
    void reload()
    const sync = () => {
      if (!document.hidden) void reload()
    }
    const timer = setInterval(() => {
      if (!document.hidden) setNow(Date.now() + offset.current)
    }, 1000)
    window.addEventListener('focus', sync)
    const refresh = setInterval(sync, 15000)
    window.addEventListener('online', sync)
    window.addEventListener('production-changed', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      alive.current = false
      clearInterval(timer)
      clearInterval(refresh)
      window.removeEventListener('focus', sync)
      window.removeEventListener('online', sync)
      window.removeEventListener('production-changed', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [reload])
  async function mutate(mutation: Mutation) {
    if (lock.current) return false
    const signature = JSON.stringify(mutation)
    if (pending.current && pending.current.signature !== signature) {
      setError('이전 작업의 결과를 먼저 확인해 주세요. 같은 작업을 다시 누르면 확인할 수 있어요.')
      return false
    }
    lock.current = true
    setBusy(true)
    setError('')
    request.current++
    pending.current ??= { signature, id: randomId(), body: mutation }
    try {
      const data =
        mutation.kind === 'single'
          ? await actProduction({ ...mutation.args, p_operation_id: pending.current.id })
          : await actProductionBulk({ ...mutation.args, p_operation_id: pending.current.id })
      pending.current = null
      apply(data)
      return true
    } catch (cause) {
      if (
        cause &&
        typeof cause === 'object' &&
        'code' in cause &&
        /^[0-9A-Z]{5}$/.test(String(cause.code))
      )
        pending.current = null
      if (alive.current) setError(productionError(cause))
      return false
    } finally {
      lock.current = false
      if (alive.current) setBusy(false)
    }
  }
  return {
    state,
    error,
    busy,
    now,
    reload,
    action: (args: Omit<ProductionAction, 'p_operation_id'>) => mutate({ kind: 'single', args }),
    bulkAction: (args: Omit<ProductionBulkAction, 'p_operation_id'>) =>
      mutate({ kind: 'bulk', args }),
    retry: () => (pending.current ? mutate(pending.current.body) : reload()),
  }
}
