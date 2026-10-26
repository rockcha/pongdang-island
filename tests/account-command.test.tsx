import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { accountCommand } from '@/lib/account-command'
import {
  accountQueryKey,
  appQueryClient,
  invalidateAccountResource,
  readAccountResource,
  setQueryAccount,
  subscribeResourceEvents,
} from '@/lib/account-cache'
import { useAccountState } from '@/lib/account-query'
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'one' } }, recovery: false }),
}))
beforeEach(() => setQueryAccount('one'))
afterEach(() => {
  cleanup()
  setQueryAccount(null)
  appQueryClient.clear()
})

it('separates page/filter keys and invalidates all variants in one resource family', async () => {
  const read = vi.fn().mockResolvedValue({ items: [] })
  await readAccountResource(['storage', 0, 'fish'], read)
  await readAccountResource(['storage', 50, 'fish'], read)
  await readAccountResource(['storage', 0, 'trash'], read)
  await readAccountResource(['storage', 0, 'fish'], read)
  expect(read).toHaveBeenCalledTimes(3)
  invalidateAccountResource('storage')
  expect(
    appQueryClient
      .getQueryCache()
      .findAll({ queryKey: ['account', 'one', 'storage'] })
      .every((q) => q.state.isInvalidated),
  ).toBe(true)
  await readAccountResource(['storage', 0, 'fish'], read)
  expect(read).toHaveBeenCalledTimes(4)
})
it('can explicitly refresh a still-fresh quote', async () => {
  const read = vi.fn().mockResolvedValueOnce({ fee: 500 }).mockResolvedValueOnce({ fee: 0 })
  expect(await readAccountResource('relics', read)).toEqual({ fee: 500 })
  expect(await readAccountResource('relics', read, { fresh: true })).toEqual({ fee: 0 })
})
it('publishes a complete command response once and invalidates dependent resources', async () => {
  const unsubscribe = subscribeResourceEvents()
  try {
    appQueryClient.setQueryData(accountQueryKey('one', 'wallet'), { gold: 1000 })
    const execute = vi.fn().mockResolvedValue({ equippedId: 'shell' })
    await accountCommand(execute, { resource: 'relics', event: 'relic-loadout-changed' })
    expect(execute).toHaveBeenCalledOnce()
    expect(appQueryClient.getQueryData(accountQueryKey('one', 'relics'))).toEqual({
      equippedId: 'shell',
    })
    expect(appQueryClient.getQueryState(accountQueryKey('one', 'relics'))?.isInvalidated).toBe(
      false,
    )
    expect(appQueryClient.getQueryState(accountQueryKey('one', 'wallet'))?.isInvalidated).toBe(true)
  } finally {
    unsubscribe()
  }
})
it('rejects an old command even after switching away and back to the same account', async () => {
  let finish!: (value: { gold: number }) => void
  const after = vi.fn(),
    listener = vi.fn()
  window.addEventListener('wallet-changed', listener)
  try {
    const pending = accountCommand(
      () =>
        new Promise<{ gold: number }>((resolve) => {
          finish = resolve
        }),
      { resource: 'wallet', event: 'wallet-changed', after },
    )
    const rejected = expect(pending).rejects.toThrow('ACCOUNT_CHANGED')
    setQueryAccount('two')
    setQueryAccount('one')
    appQueryClient.setQueryData(accountQueryKey('one', 'wallet'), { gold: 10 })
    finish({ gold: 999 })
    await rejected
    expect(appQueryClient.getQueryData(accountQueryKey('one', 'wallet'))).toEqual({ gold: 10 })
    expect(after).not.toHaveBeenCalled()
    expect(listener).not.toHaveBeenCalled()
  } finally {
    window.removeEventListener('wallet-changed', listener)
  }
})
it('does not retry an uncertain write', async () => {
  const execute = vi.fn().mockRejectedValue(new Error('transport'))
  await expect(accountCommand(execute)).rejects.toThrow('transport')
  expect(execute).toHaveBeenCalledOnce()
})
it('keeps a published page fresh while invalidating sibling pages in its family', async () => {
  appQueryClient.setQueryData(accountQueryKey('one', ['storage', 0]), { items: ['old'] })
  appQueryClient.setQueryData(accountQueryKey('one', ['storage', 50]), { items: ['other'] })
  await accountCommand(async () => ({ items: ['new'] }), {
    resource: ['storage', 0],
    invalidate: ['storage'],
  })
  expect(appQueryClient.getQueryState(accountQueryKey('one', ['storage', 0]))?.isInvalidated).toBe(
    false,
  )
  expect(appQueryClient.getQueryState(accountQueryKey('one', ['storage', 50]))?.isInvalidated).toBe(
    true,
  )
})
it('shares confirmed partial patches between screens and cancels a stale background read', async () => {
  const read = vi.fn().mockResolvedValue({ count: 1 })
  const first = renderHook(() => {
    const [data, patch, query] = useAccountState('aquarium', read)
    return { data, patch, query }
  })
  const second = renderHook(() => {
    const [data] = useAccountState('aquarium', read)
    return data
  })
  await waitFor(() => expect(second.result.current).toEqual({ count: 1 }))
  expect(read).toHaveBeenCalledOnce()
  let finish!: (value: { count: number }) => void
  read.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  let refresh!: Promise<unknown>
  act(() => {
    refresh = first.result.current.query.refetch()
  })
  act(() => first.result.current.patch({ count: 2 }))
  await act(async () => {
    finish({ count: 0 })
    await refresh
  })
  await waitFor(() => expect(second.result.current).toEqual({ count: 2 }))
  expect(first.result.current.data).toEqual({ count: 2 })
})
