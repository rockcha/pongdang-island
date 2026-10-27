import {useMenuActivity} from '@/components/menu-activity'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppQueryProvider } from '@/lib/account-query'
import {appQueryClient,setQueryAccount} from '@/lib/account-cache'
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
  appQueryClient.clear()
  setQueryAccount(null)
  vi.useRealTimers()
})
it('keeps readiness on navigation and removes it after materials change',async()=>{
 setQueryAccount('menu-owner')
 vi.useFakeTimers()
 let ready=2
 read.mockImplementation(async()=>({serverNow:new Date().toISOString(),production:{total:0,sites:[]},baitProduction:{total:0,sites:[]},harbor:{total:0,dockSlots:2,returnsAt:[]},expedition:{returnsAt:null},savings:{account:null},merchant:{ready,total:35,availableAt:new Date().toISOString(),resetsAt:new Date(Date.now()+3600000).toISOString()}}))
 const view=renderHook(()=>useMenuActivity(),{wrapper:AppQueryProvider})
 await act(async()=>{await vi.advanceTimersByTimeAsync(1)})
 expect(view.result.current['/merchant-orders'].ready).toBe(2)
 view.rerender()
 expect(view.result.current['/merchant-orders'].ready).toBe(2)
 ready=0
 await act(async()=>{window.dispatchEvent(new Event('collectibles-changed'));await vi.advanceTimersByTimeAsync(1)})
 expect(view.result.current['/merchant-orders'].ready).toBe(0)
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
      activity:useMenuActivity(),
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
  expect(view.result.current.activity['/production'].ready).toBe(1)
  expect(read).toHaveBeenCalledOnce()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300000)
  })
  expect(read).toHaveBeenCalledTimes(11)
})
