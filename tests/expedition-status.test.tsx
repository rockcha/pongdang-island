import {act,cleanup,renderHook} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {useExpeditionStatus} from '@/features/expeditions/use-expedition-status'
const mock=vi.hoisted(()=>({owner:'me',load:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:mock.owner?{user:{id:mock.owner}}:null,recovery:false})}))
vi.mock('@/features/expeditions/api',()=>({loadExpeditions:mock.load}))
beforeEach(()=>{vi.useFakeTimers();mock.owner='me';mock.load.mockReset()})
afterEach(()=>{cleanup();vi.useRealTimers()})
it('uses server time for arrival and clears the badge after collection',async()=>{
 mock.load.mockResolvedValue({serverNow:'2026-10-19T00:00:00Z',active:{returns_at:'2026-10-19T00:00:02Z'}})
 const {result}=renderHook(()=>useExpeditionStatus())
 await act(async()=>{})
 expect(result.current).toBe('sailing')
 await act(async()=>{vi.advanceTimersByTime(2000)})
 expect(result.current).toBe('returned')
 mock.load.mockResolvedValue({serverNow:'2026-10-19T00:00:03Z',active:null})
 await act(async()=>{window.dispatchEvent(new Event('expedition-changed'))})
 expect(result.current).toBeNull()
})
it('hides the previous account status while the next account loads',async()=>{
 mock.load.mockResolvedValueOnce({serverNow:'2026-10-19T00:00:00Z',active:{returns_at:'2026-10-19T00:00:02Z'}})
 const {result,rerender}=renderHook(()=>useExpeditionStatus())
 await act(async()=>{})
 expect(result.current).toBe('sailing')
 mock.owner='other';mock.load.mockImplementation(()=>new Promise(()=>{}))
 rerender()
 expect(result.current).toBeNull()
})
