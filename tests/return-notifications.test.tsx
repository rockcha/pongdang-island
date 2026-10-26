import {act,cleanup,renderHook} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {useReturnNotifications} from '@/features/notifications/use-return-notifications'
const check=vi.hoisted(()=>vi.fn())
vi.mock('@/features/notifications/api',()=>({refreshReturnNotifications:check}))
const empty={created:0,nextAt:null,serverNow:'2026-10-21T00:00:00Z'}
beforeEach(()=>{vi.useFakeTimers();check.mockReset();check.mockResolvedValue(empty)})
afterEach(()=>{cleanup();vi.useRealTimers()})
it('refreshes the inbox at the server return time even if realtime misses the insertion',async()=>{
 const refresh=vi.fn().mockResolvedValue(undefined)
 check.mockResolvedValueOnce({...empty,nextAt:'2026-10-21T00:00:01Z'})
 renderHook(()=>useReturnNotifications('me',refresh))
 await act(async()=>{})
 expect(refresh).not.toHaveBeenCalled()
 await act(async()=>{await vi.advanceTimersByTimeAsync(1100)})
 expect(check).toHaveBeenCalledTimes(2)
 expect(refresh).toHaveBeenCalledOnce()
})
it('checks on departures, boosts, reconnect and visibility, then stops on logout',async()=>{
 const refresh=vi.fn().mockResolvedValue(undefined)
 const view=renderHook(({owner})=>useReturnNotifications(owner,refresh),{initialProps:{owner:'me' as string|undefined}})
 await act(async()=>{})
 for(const event of ['harbor-changed','expedition-changed','production-changed','online','focus'])await act(async()=>{window.dispatchEvent(new Event(event))})
 await act(async()=>{await vi.advanceTimersByTimeAsync(150)})
 expect(check).toHaveBeenCalledTimes(2)
 view.rerender({owner:undefined})
 await act(async()=>{window.dispatchEvent(new Event('focus'));await vi.advanceTimersByTimeAsync(300200)})
 expect(check).toHaveBeenCalledTimes(2)
})
it('refreshes stored notices when return polling fails and retries on the next poll',async()=>{
 const refresh=vi.fn().mockResolvedValue(undefined)
 renderHook(()=>useReturnNotifications('me',refresh))
 await act(async()=>{})
 check.mockRejectedValueOnce(new Error('offline'))
 await act(async()=>{await vi.advanceTimersByTimeAsync(300200)})
 expect(refresh).toHaveBeenCalledOnce()
 await act(async()=>{await vi.advanceTimersByTimeAsync(300200)})
 expect(check).toHaveBeenCalledTimes(3)
})
