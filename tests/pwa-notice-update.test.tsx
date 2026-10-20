import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {PwaStatus} from '../src/components/pwa-status'
import {OPEN_PWA_UPDATE_MENU,requestPwaUpdate} from '@/features/pwa/update-state'
const mocks=vi.hoisted(()=>({
 social:{owner:'user-a',unread:{notice:0},loading:false,error:null as string|null},
 ready:true,blocked:false,update:vi.fn().mockResolvedValue(undefined),info:vi.fn(),success:vi.fn(),dismiss:vi.fn(),
}))
vi.mock('@/features/social/social-provider',()=>({useSocial:()=>mocks.social}))
vi.mock('@/features/pwa/update-blockers',()=>({usePwaUpdateBlocked:()=>mocks.blocked}))
vi.mock('virtual:pwa-register/react',()=>({useRegisterSW:()=>({offlineReady:[false],needRefresh:[mocks.ready],updateServiceWorker:mocks.update})}))
vi.mock('sonner',()=>({toast:{info:mocks.info,success:mocks.success,dismiss:mocks.dismiss,error:vi.fn()}}))
beforeEach(()=>{vi.clearAllMocks();sessionStorage.clear();vi.stubGlobal('navigator',{serviceWorker:new EventTarget()});vi.useFakeTimers();mocks.update.mockReset().mockResolvedValue(undefined);mocks.social={owner:'user-a',unread:{notice:0},loading:false,error:null};mocks.ready=true;mocks.blocked=false})
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()})
it('opens the avatar menu when the available-update toast is clicked',()=>{
 const opened=vi.fn();window.addEventListener(OPEN_PWA_UPDATE_MENU,opened)
 try{
  render(<PwaStatus/>);render(mocks.info.mock.calls[0][0])
  fireEvent.click(screen.getByRole('button',{name:'퐁당섬에 새 업데이트가 있어요.'}))
  expect(opened).toHaveBeenCalledOnce();expect(mocks.dismiss).toHaveBeenCalledWith('pwa-update')
  expect(mocks.update).not.toHaveBeenCalled()
 }finally{window.removeEventListener(OPEN_PWA_UPDATE_MENU,opened)}
})
it('shows success once after controller activation and reloading, never on request alone',async()=>{
 const view=render(<PwaStatus/>);act(()=>requestPwaUpdate())
 await act(()=>vi.advanceTimersByTimeAsync(1500))
 expect(mocks.success).not.toHaveBeenCalled()
 act(()=>navigator.serviceWorker.dispatchEvent(new Event('controllerchange')))
 expect(mocks.success).not.toHaveBeenCalled()
 view.unmount();mocks.ready=false
 const updated=render(<PwaStatus/>)
 expect(mocks.success).toHaveBeenCalledExactlyOnceWith('업데이트 완료',expect.any(Object))
 updated.unmount();render(<PwaStatus/>)
 expect(mocks.success).toHaveBeenCalledOnce()
})
it('does not announce completion after a rejected update or an ordinary reload',async()=>{
 mocks.update.mockRejectedValueOnce(new Error('offline'))
 const view=render(<PwaStatus/>);act(()=>requestPwaUpdate())
 await act(()=>vi.advanceTimersByTimeAsync(1500))
 act(()=>navigator.serviceWorker.dispatchEvent(new Event('controllerchange')))
 view.unmount();mocks.ready=false;render(<PwaStatus/>)
 expect(mocks.success).not.toHaveBeenCalled()
})
it('does not apply just because the notice badge is initially empty',async()=>{
 render(<PwaStatus/>);await act(()=>vi.advanceTimersByTimeAsync(5000))
 expect(mocks.update).not.toHaveBeenCalled()
})
it('does not apply when the notice badge clears or a game ends without an explicit request',async()=>{
 mocks.social.unread.notice=2;mocks.blocked=true
 const view=render(<PwaStatus/>)
 mocks.social={...mocks.social,unread:{notice:0}};view.rerender(<PwaStatus/>)
 await act(()=>vi.advanceTimersByTimeAsync(5000));expect(mocks.update).not.toHaveBeenCalled()
 mocks.blocked=false;view.rerender(<PwaStatus/>)
 await act(()=>vi.advanceTimersByTimeAsync(1500));expect(mocks.update).not.toHaveBeenCalled()
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
