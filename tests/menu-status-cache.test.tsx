import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppQueryProvider } from '@/lib/account-query'
import { useProductionMenuStatus } from '@/features/production/use-production-menu-status'
import { useHarborStatus } from '@/features/port/use-harbor-status'
import { useExpeditionStatus } from '@/features/expeditions/use-expedition-status'
import { useSavingsStatus } from '@/features/savings/use-savings-status'
const read = vi.hoisted(() => vi.fn())
vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'menu-owner' } }, recovery: false }),
}))
vi.mock('@/lib/menu-status', () => ({ readMenuStatus: read }))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
it('shares one summary across all five badges, advances deadlines locally and reconciles once per poll', async () => {
  vi.useFakeTimers()
  const start = Date.now(),
    arrival = new Date(start + 2000).toISOString(),
    expiry = new Date(start + 3600000).toISOString()
  read.mockImplementation(async () => ({
    serverNow: new Date(Date.now()).toISOString(),
    production: { total: 2, sites: [{ completesAt: arrival, expiresAt: expiry }] },
    baitProduction: { total: 0, sites: [] },
    harbor: { dockSlots: 2, returnsAt: [arrival] },
    expedition: { returnsAt: arrival },
    savings: { account: null },
  }))
  const view = renderHook(
    () => ({
      fuel: useProductionMenuStatus('fuel'),
      bait: useProductionMenuStatus('bait'),
      harbor: useHarborStatus(),
      expedition: useExpeditionStatus(),
      savings: useSavingsStatus(),
    }),
    { wrapper: AppQueryProvider },
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1)
  })
  expect(read).toHaveBeenCalledOnce()
  expect(view.result.current.fuel).toEqual({ ready: 0, total: 2 })
  expect(view.result.current.expedition).toBe('sailing')
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2002)
  })
  expect(view.result.current.fuel).toEqual({ ready: 1, total: 2 })
  expect(view.result.current.harbor).toEqual({ ready: 1, total: 2 })
  expect(view.result.current.expedition).toBe('returned')
  expect(read).toHaveBeenCalledOnce()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300000)
  })
  expect(read).toHaveBeenCalledTimes(2)
})
