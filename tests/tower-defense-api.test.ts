import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import {
  startTowerDefense,
  saveTowerDefense,
  readTowerDefense,
  readTowerRanking,
  TOWER_SAVE_TIMEOUT_MS,
} from '@/features/arcade/tower-defense-api'
import { emptyTowerReplay } from '@/features/arcade/tower-defense-replay'
import { setQueryAccount, appQueryClient, accountQueryKey } from '@/lib/account-cache'
const api = vi.hoisted(() => ({ rpc: vi.fn(), invoke: vi.fn(), abort: vi.fn() }))
vi.mock('@/lib/client', () => ({
  createClient: () => ({ rpc: api.rpc, functions: { invoke: api.invoke } }),
}))
const snapshot = { run: { id: 'run' }, wallet: { gold: 1234 }, serverNow: new Date().toISOString() }
beforeEach(() => {
  setQueryAccount('A')
  api.rpc.mockReset()
  api.invoke.mockReset()
  api.abort.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
  setQueryAccount(null)
  appQueryClient.clear()
})
it('forwards cancellation for state and paginated rankings', async () => {
  api.rpc.mockReturnValue({ abortSignal: api.abort })
  api.abort.mockResolvedValue({ data: snapshot, error: null })
  const signal = new AbortController().signal
  await readTowerDefense(signal)
  await readTowerRanking(signal, 20)
  expect(api.rpc).toHaveBeenCalledWith('tower_defense_leaderboard', { p_offset: 20 })
  expect(api.abort.mock.calls).toEqual([[signal], [signal]])
})
it('retains entry operation identity and publishes the confirmed state and wallet', async () => {
  api.rpc.mockResolvedValue({ data: snapshot, error: null })
  await startTowerDefense('same-operation')
  expect(api.rpc).toHaveBeenCalledExactlyOnceWith('tower_defense_start', {
    p_operation_id: 'same-operation',
    p_engine_version: 1,
  })
  expect(appQueryClient.getQueryData(accountQueryKey('A', 'tower-defense'))).toEqual(snapshot)
  expect(appQueryClient.getQueryData(accountQueryKey('A', 'wallet'))).toEqual(snapshot.wallet)
})
it('does not retry a lost settlement automatically or publish late responses after A to B to A', async () => {
  const replay = emptyTowerReplay()
  api.invoke.mockResolvedValueOnce({ data: null, error: Error('network') })
  await expect(saveTowerDefense('run', replay, false)).rejects.toThrow('network')
  expect(api.invoke).toHaveBeenCalledTimes(1)
  let resolve!: (value: unknown) => void
  api.invoke.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const pending = saveTowerDefense('run', replay, true)
  setQueryAccount('B')
  setQueryAccount('A')
  resolve({
    data: { ...snapshot, run: { id: 'run', cleared_stage: 0, replay, finished_at: 'done' } },
    error: null,
  })
  await expect(pending).rejects.toThrow('ACCOUNT_CHANGED')
  expect(appQueryClient.getQueryData(accountQueryKey('A', 'wallet'))).toBeUndefined()
})
it('rejects stale successful responses without publishing them or automatically retrying', async () => {
  const replay = { ...emptyTowerReplay(), ticks: 100 }
  api.invoke.mockResolvedValue({
    data: { ...snapshot, run: { id: 'run', cleared_stage: 0, replay: emptyTowerReplay() } },
    error: null,
  })
  await expect(saveTowerDefense('run', replay, false, 1)).rejects.toThrow('SETTLEMENT_MISMATCH')
  expect(api.invoke).toHaveBeenCalledTimes(1)
  expect(appQueryClient.getQueryData(accountQueryKey('A', 'tower-defense'))).toBeUndefined()
  expect(appQueryClient.getQueryData(accountQueryKey('A', 'wallet'))).toBeUndefined()
})
it('checks stages, finalization and command contents while accepting jsonb key order', async () => {
  const replay = {
    ...emptyTowerReplay(),
    ticks: 100,
    commands: [{ type: 'wave' as const, tick: 0 }],
  }
  const valid = {
    ...snapshot,
    run: {
      id: 'run',
      cleared_stage: 1,
      replay: { ...replay, commands: [{ tick: 0, type: 'wave' }] },
      finished_at: null,
    },
  }
  for (const run of [
    { ...valid.run, cleared_stage: 0 },
    { ...valid.run, replay: { ...replay, commands: [{ type: 'wave', tick: 1 }] } },
    { ...valid.run, finished_at: 'already-ended' },
  ]) {
    api.invoke.mockResolvedValueOnce({ data: { ...valid, run }, error: null })
    await expect(saveTowerDefense('run', replay, false, 1)).rejects.toThrow('SETTLEMENT_MISMATCH')
  }
  api.invoke.mockResolvedValueOnce({ data: valid, error: null })
  await expect(saveTowerDefense('run', replay, true, 1)).rejects.toThrow('SETTLEMENT_MISMATCH')
  api.invoke.mockResolvedValueOnce({ data: valid, error: null })
  await expect(saveTowerDefense('run', replay, false, 1)).resolves.toEqual(valid)
})
it('times out, aborts and ignores late success, then allows explicit confirmation of the same request', async () => {
  vi.useFakeTimers()
  const replay = emptyTowerReplay()
  const valid = { ...snapshot, run: { id: 'run', cleared_stage: 0, replay, finished_at: null } }
  let resolve!: (value: unknown) => void
  api.invoke.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const request = saveTowerDefense('run', replay, false)
  const rejected = expect(request).rejects.toThrow('SETTLEMENT_TIMEOUT')
  await vi.advanceTimersByTimeAsync(TOWER_SAVE_TIMEOUT_MS)
  await rejected
  expect(api.invoke.mock.calls[0][1].signal.aborted).toBe(true)
  resolve({ data: valid, error: null })
  await Promise.resolve()
  expect(appQueryClient.getQueryData(accountQueryKey('A', 'wallet'))).toBeUndefined()
  expect(api.invoke).toHaveBeenCalledTimes(1)
  api.invoke.mockResolvedValueOnce({ data: valid, error: null })
  await expect(saveTowerDefense('run', replay, false)).resolves.toEqual(valid)
  expect(api.invoke.mock.calls[0][1].body).toEqual(api.invoke.mock.calls[1][1].body)
})
