import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import {
  startBilliards,
  saveBilliards,
  readBilliards,
  readBilliardsRanking,
} from '@/features/arcade/billiards-api'
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
  setQueryAccount(null)
  appQueryClient.clear()
})
it('forwards read cancellation for both the state and paginated leaderboard', async () => {
  api.rpc.mockReturnValue({ abortSignal: api.abort })
  api.abort.mockResolvedValue({ data: snapshot, error: null })
  const signal = new AbortController().signal
  await readBilliards(signal)
  await readBilliardsRanking(signal, 20)
  expect(api.rpc).toHaveBeenCalledWith('billiards_leaderboard', { p_offset: 20 })
  expect(api.abort.mock.calls).toEqual([[signal], [signal]])
})
it('retains the entry operation ID and publishes the confirmed state and wallet', async () => {
  api.rpc.mockResolvedValue({ data: snapshot, error: null })
  await startBilliards('same-operation')
  expect(api.rpc).toHaveBeenCalledExactlyOnceWith('billiards_start', {
    p_operation_id: 'same-operation',
    p_engine_version: 1,
  })
  expect(appQueryClient.getQueryData(accountQueryKey('A', 'billiards'))).toEqual(snapshot)
  expect(appQueryClient.getQueryData(accountQueryKey('A', 'wallet'))).toEqual(snapshot.wallet)
})
it('does not retry settlement on a lost response or expose late results after A to B to A', async () => {
  const replay = { version: 1, shots: [] }
  api.invoke.mockResolvedValueOnce({ data: null, error: new Error('network') })
  await expect(saveBilliards('run', replay, true)).rejects.toThrow('network')
  expect(api.invoke).toHaveBeenCalledTimes(1)
  let resolve!: (value: unknown) => void
  api.invoke.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const pending = saveBilliards('run', replay, true)
  setQueryAccount('B')
  setQueryAccount('A')
  resolve({ data: snapshot, error: null })
  await expect(pending).rejects.toThrow('ACCOUNT_CHANGED')
  expect(appQueryClient.getQueryData(accountQueryKey('A', 'wallet'))).toBeUndefined()
})
