import {act,cleanup,renderHook,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {useSavingsStatus} from '@/features/savings/use-savings-status'
const mock=vi.hoisted(()=>({load:vi.fn()}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:'captain'}},recovery:false})}))
vi.mock('@/features/savings/api',()=>({loadSavings:mock.load}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('updates unpaid, mature and collected labels from confirmed account state',async()=>{
 const account={closed_at:null,paid_count:1,term_days:3,maturesAt:'2026-10-22T00:00:00Z',nextOpenAt:'2026-10-19T09:00:00Z',depositDeadline:'2026-10-20T09:00:00Z'}
 mock.load.mockResolvedValue({serverNow:'2026-10-19T10:00:00Z',account})
 const {result}=renderHook(()=>useSavingsStatus())
 await waitFor(()=>expect(result.current).toBe('미납'))
 mock.load.mockResolvedValue({serverNow:'2026-10-22T10:00:00Z',account:{...account,paid_count:3}})
 await act(async()=>{window.dispatchEvent(new Event('savings-changed'))})
 await waitFor(()=>expect(result.current).toBe('수령 가능'))
 mock.load.mockResolvedValue({serverNow:'2026-10-22T10:00:00Z',account:null})
 await act(async()=>{window.dispatchEvent(new Event('savings-changed'))})
 await waitFor(()=>expect(result.current).toBeNull())
})
