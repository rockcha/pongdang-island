import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useAuth } from '@/components/auth-provider'
import { getQueryAccount, isCurrentAccount } from '@/lib/account-cache'
import { useAccountResource } from '@/lib/account-query'
import { randomId } from '@/lib/random-id'
import { pauseDefense, type DefenseState } from './tower-defense-engine'
import {
  readTowerDefense,
  saveTowerDefense,
  startTowerDefense,
  towerDefenseError,
  type TowerRun,
} from './tower-defense-api'
import {
  applyTowerAction,
  clearedTowerStages,
  emptyTowerReplay,
  verifyTowerReplay,
  type TowerAction,
  type TowerReplay,
} from './tower-defense-replay'

type Pending = { runId: string; replay: TowerReplay; final: boolean; resume: boolean }

/** Financial requests retain their exact payload until a confirmed response. */
export function useTowerDefenseRun(
  state: RefObject<DefenseState>,
  open: boolean,
  sync: () => void,
) {
  const { session } = useAuth()
  const ownerScope = getQueryAccount()
  const query = useAccountResource('tower-defense', readTowerDefense)
  const run = useRef<TowerRun | null>(null)
  const replay = useRef(emptyTowerReplay())
  const paidRef = useRef(false),
    locked = useRef(false),
    operation = useRef<string | null>(null)
  const pending = useRef<Pending | null>(null),
    alive = useRef(true)
  const [paid, setPaid] = useState(false),
    [busy, setBusy] = useState(false)
  const [error, setError] = useState(''),
    [receipt, setReceipt] = useState('')
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])
  useEffect(() => {
    paidRef.current = false
    run.current = null
    pending.current = null
    operation.current = null
    locked.current = false
    replay.current = emptyTowerReplay()
    setPaid(false)
    setBusy(false)
    setError('')
    setReceipt('')
  }, [session?.user.id, ownerScope])

  const execute = useCallback(
    (action: TowerAction) => {
      if (locked.current || pending.current) return false
      const tick = state.current.tick
      if (!applyTowerAction(state.current, action)) return false
      if (paidRef.current) replay.current.commands.push({ ...action, tick })
      return true
    },
    [state],
  )

  async function start() {
    if (locked.current || !session) return false
    const scope = getQueryAccount()
    locked.current = true
    setBusy(true)
    setError('')
    operation.current ??= randomId()
    try {
      const data = await startTowerDefense(operation.current)
      if (!alive.current || !isCurrentAccount(scope)) return false
      if (!data.run || data.run.finished_at) throw Error('RUN_UNAVAILABLE')
      const restored = verifyTowerReplay(data.run.replay, data.run.seed).state
      state.current = restored
      replay.current = structuredClone(data.run.replay)
      run.current = data.run
      pending.current = null
      operation.current = null
      paidRef.current = true
      setPaid(true)
      setReceipt('')
      sync()
      return true
    } catch (cause) {
      if (alive.current && isCurrentAccount(scope)) setError(towerDefenseError(cause))
      return false
    } finally {
      if (alive.current && isCurrentAccount(scope)) {
        locked.current = false
        setBusy(false)
      }
    }
  }

  const save = useCallback(
    async (final = false) => {
      if (!paidRef.current || !run.current || run.current.finished_at) return true
      if (locked.current) return false
      const scope = getQueryAccount()
      pending.current ??= {
        runId: run.current.id,
        replay: { ...structuredClone(replay.current), ticks: state.current.tick },
        final,
        resume: state.current.phase !== 'paused',
      }
      const request = pending.current
      locked.current = true
      pauseDefense(state.current, true)
      setBusy(true)
      setError('')
      sync()
      try {
        const data = await saveTowerDefense(request.runId, request.replay, request.final)
        if (!alive.current || !isCurrentAccount(scope)) return false
        if (!data.run || data.run.id !== request.runId) throw Error('RUN_UNAVAILABLE')
        const earned = data.run.reward - run.current.reward
        run.current = data.run
        pending.current = null
        if (earned > 0) setReceipt(`${data.run.cleared_stage}스테이지 통과 · ${earned}골드 지급`)
        if (request.resume && !request.final) pauseDefense(state.current, false)
        sync()
        return true
      } catch (cause) {
        if (alive.current && isCurrentAccount(scope)) setError(towerDefenseError(cause))
        return false
      } finally {
        if (alive.current && isCurrentAccount(scope)) {
          locked.current = false
          setBusy(false)
        }
      }
    },
    [state, sync],
  )

  // Stage transitions pay immediately. Periodic checkpoints bound server replay work.
  useEffect(() => {
    const current = run.current,
      s = state.current
    if (
      !open ||
      !paidRef.current ||
      !current ||
      current.finished_at ||
      locked.current ||
      pending.current
    )
      return
    const terminal = s.phase === 'won' || s.phase === 'lost'
    if (
      terminal ||
      clearedTowerStages(s) > current.cleared_stage ||
      s.tick - current.replay.ticks >= 2000
    )
      void save(terminal)
  })

  const pause = useCallback(
    (value: boolean) => {
      if (!value && (locked.current || pending.current)) return
      pauseDefense(state.current, value)
      sync()
    },
    [state, sync],
  )
  return {
    session,
    ownerScope,
    query,
    paid,
    busy,
    error,
    receipt,
    unresolved: !!pending.current,
    uncertainEntry: !!operation.current,
    reward: run.current?.reward ?? 0,
    finalized: !!run.current?.finished_at,
    execute,
    start,
    save,
    pause,
    practice() {
      paidRef.current = false
      setPaid(false)
      setError('')
      setReceipt('')
    },
  }
}
