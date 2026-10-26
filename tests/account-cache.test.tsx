import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppQueryProvider, useAccountResource } from '@/lib/account-query'
import {
  accountQueryKey,
  appQueryClient,
  getQueryAccount,
  publishAccountResource,
  readAccountResource,
  resourceChanged,
  setQueryAccount,
} from '@/lib/account-cache'
const auth = vi.hoisted(() => ({ owner: 'one' as string | null }))
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: auth.owner ? { user: { id: auth.owner } } : null, recovery: false }),
}))
beforeEach(() => {
  auth.owner = 'one'
  setQueryAccount('one')
})
afterEach(() => {
  cleanup()
  setQueryAccount(null)
  appQueryClient.clear()
  vi.useRealTimers()
})
it('shares one request between two observers and imperative screen loads', async () => {
  const read = vi.fn().mockResolvedValue({ gold: 100 })
  const first = renderHook(() => ({data:useAccountResource('wallet', read).data}), { wrapper: AppQueryProvider })
  const second = renderHook(() => ({data:useAccountResource('wallet', read).data}))
  await waitFor(() => expect(first.result.current.data).toEqual({ gold: 100 }))
  await waitFor(() => expect(second.result.current.data).toEqual({ gold: 100 }))
  await readAccountResource('wallet', read)
  expect(read).toHaveBeenCalledOnce()
})
it('uses the confirmed mutation response without requesting the same resource again', async () => {
  const read = vi.fn().mockResolvedValue({ gold: 100 })
  const view = renderHook(() => useAccountResource('wallet', read))
  await waitFor(() => expect(view.result.current.data).toEqual({ gold: 100 }))
  await act(async () => {
    resourceChanged('wallet', 'wallet-changed', { gold: 80 }, getQueryAccount())
  })
  await waitFor(() => expect(view.result.current.data).toEqual({ gold: 80 }))
  expect(await readAccountResource('wallet', read)).toEqual({ gold: 80 })
  expect(read).toHaveBeenCalledOnce()
})
it('cancels old account reads, removes private data and rejects late mutation responses', async () => {
  let finish!: (data: unknown) => void
  let signal!: AbortSignal
  const old = getQueryAccount()
  const pending = readAccountResource('wallet', (next) => {
    signal = next
    return new Promise((resolve) => {
      finish = resolve
    })
  })
  const rejected = pending.catch(() => 'cancelled')
  setQueryAccount('two')
  auth.owner = 'two'
  expect(signal.aborted).toBe(true)
  finish({ gold: 900 })
  expect(await rejected).toBe('cancelled')
  expect(publishAccountResource('wallet', { gold: 800 }, old)).toBe(false)
  expect(appQueryClient.getQueriesData({ queryKey: ['account', 'one'] })).toHaveLength(0)
  expect(await readAccountResource('wallet', async () => ({ gold: 2 }))).toEqual({ gold: 2 })
})
it('advances cached server samples so imperative countdowns do not restart', async () => {
  vi.useFakeTimers()
  const start = Date.now(),
    server = '2026-10-26T00:00:00.000Z'
  const read = vi.fn().mockResolvedValue({ serverNow: server })
  await readAccountResource('harbor', read)
  vi.setSystemTime(start + 15_000)
  expect(await readAccountResource('harbor', read)).toEqual({
    serverNow: '2026-10-26T00:00:15.000Z',
  })
  expect(read).toHaveBeenCalledOnce()
})
it('does not retry failed financial commands automatically', async () => {
  const command = vi.fn().mockRejectedValue(new Error('uncertain transport result'))
  const mutation = appQueryClient.getMutationCache().build(appQueryClient, { mutationFn: command })
  await expect(mutation.execute(undefined)).rejects.toThrow('uncertain transport result')
  expect(command).toHaveBeenCalledOnce()
  expect(appQueryClient.getQueryData(accountQueryKey('one', 'wallet'))).toBeUndefined()
})
