import {act,cleanup,render} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {PwaStatus} from '../src/components/pwa-status'
import {requestPwaUpdate} from '@/features/pwa/update-state'
const mocks=vi.hoisted(()=>({
 social:{owner:'user-a',unread:{notice:0},loading:false,error:null as string|null},
 ready:true,blocked:false,update:vi.fn().mockResolvedValue(undefined),info:vi.fn(),
}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>mocks.social}))
vi.mock('@/features/pwa/update-blockers',()=>({usePwaUpdateBlocked:()=>mocks.blocked}))
vi.mock('virtual:pwa-register/react',()=>({useRegisterSW:()=>({offlineReady:[false],needRefresh:[mocks.ready],updateServiceWorker:mocks.update})}))
vi.mock('sonner',()=>({toast:{info:mocks.info,success:vi.fn(),error:vi.fn()}}))
beforeEach(()=>{vi.useFakeTimers();mocks.update.mockReset().mockResolvedValue(undefined);mocks.social={owner:'user-a',unread:{notice:0},loading:false,error:null};mocks.ready=true;mocks.blocked=false})
afterEach(()=>{cleanup();vi.useRealTimers()})
it('does not apply just because the notice badge is initially empty',async()=>{
 render(<PwaStatus/>);await act(()=>vi.advanceTimersByTimeAsync(5000))
 expect(mocks.update).not.toHaveBeenCalled()
})
it('waits for the notice badge to clear and for an active game to finish',async()=>{
 mocks.social.unread.notice=2;mocks.blocked=true
 const view=render(<PwaStatus/>)
 mocks.social={...mocks.social,unread:{notice:0}};view.rerender(<PwaStatus/>)
 await act(()=>vi.advanceTimersByTimeAsync(5000));expect(mocks.update).not.toHaveBeenCalled()
 mocks.blocked=false;view.rerender(<PwaStatus/>)
 await act(()=>vi.advanceTimersByTimeAsync(1500));expect(mocks.update).toHaveBeenCalledWith(true)
})
it('cancels scheduled application if a new unread notice arrives',async()=>{
 mocks.social.unread.notice=1
 const view=render(<PwaStatus/>)
 mocks.social={...mocks.social,unread:{notice:0}};view.rerender(<PwaStatus/>)
 mocks.social={...mocks.social,unread:{notice:1}};view.rerender(<PwaStatus/>)
 await act(()=>vi.advanceTimersByTimeAsync(5000));expect(mocks.update).not.toHaveBeenCalled()
})
it('accepts an explicit avatar-menu request even without a notice acknowledgment',async()=>{
 mocks.social.unread.notice=2
 render(<PwaStatus/>)
 act(()=>requestPwaUpdate())
 await act(()=>vi.advanceTimersByTimeAsync(1500))
 expect(mocks.update).toHaveBeenCalledWith(true)
})
it('keeps a manual request queued until gameplay finishes',async()=>{
 mocks.blocked=true
 const view=render(<PwaStatus/>)
 act(()=>requestPwaUpdate())
 await act(()=>vi.advanceTimersByTimeAsync(5000))
 expect(mocks.update).not.toHaveBeenCalled()
 mocks.blocked=false;view.rerender(<PwaStatus/>)
 await act(()=>vi.advanceTimersByTimeAsync(1500))
 expect(mocks.update).toHaveBeenCalledOnce()
})
it('allows a manual retry after an update error without starting an automatic retry loop',async()=>{
 mocks.update.mockRejectedValueOnce(new Error('offline'))
 render(<PwaStatus/>)
 act(()=>requestPwaUpdate())
 await act(()=>vi.advanceTimersByTimeAsync(5000))
 expect(mocks.update).toHaveBeenCalledTimes(1)
 act(()=>requestPwaUpdate())
 await act(()=>vi.advanceTimersByTimeAsync(1500))
 expect(mocks.update).toHaveBeenCalledTimes(2)
})
