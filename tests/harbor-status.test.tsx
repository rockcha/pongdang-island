import {act,cleanup,renderHook,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {useHarborStatus} from '@/features/port/use-harbor-status'
const mock=vi.hoisted(()=>({load:vi.fn(),owner:'captain'}))
vi.mock('@/components/auth-provider',()=>({useAuth:()=>({session:{user:{id:mock.owner}},recovery:false})}))
vi.mock('@/features/port/api',()=>({loadHarbor:mock.load}))
afterEach(()=>{cleanup();vi.clearAllMocks();mock.owner='captain'})
it('tracks the earliest boat return and clears after a collection event',async()=>{
 mock.load.mockResolvedValue({serverNow:'2026-10-19T10:00:00Z',voyages:[{returns_at:'2026-10-19T09:59:00Z',claimed_at:null},{returns_at:'2026-10-19T11:00:00Z',claimed_at:null}]})
 const {result,rerender}=renderHook(()=>useHarborStatus())
 await waitFor(()=>expect(result.current).toEqual({ready:1,total:2}))
 mock.owner='other';rerender();expect(result.current).toBeNull()
 mock.load.mockResolvedValue({serverNow:'2026-10-19T10:00:00Z',voyages:[]})
 await act(async()=>{window.dispatchEvent(new Event('harbor-changed'))})
 await waitFor(()=>expect(result.current).toEqual({ready:0,total:2}))
})
