import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { createMemoryRouter,Link,RouterProvider } from 'react-router'
import { afterEach,expect,it,vi } from 'vitest'
import { FishingLeaveGuard } from '@/features/fishing/fishing-leave-guard'
afterEach(cleanup)
function setup({active=true,practice=false,busy=false,onLeave=vi.fn().mockResolvedValue(undefined)}={}){
 const onPause=vi.fn()
 const router=createMemoryRouter([{path:'/fish',element:<><FishingLeaveGuard active={active} practice={practice} busy={busy} onPause={onPause} onLeave={onLeave}/><Link to="/map">지도</Link></>},{path:'/map',element:<p>지도 화면</p>}],{initialEntries:['/map','/fish'],initialIndex:1})
 render(<RouterProvider router={router}/>);return {router,onLeave,onPause}
}
it('pauses while confirming and resumes without consuming another bait on cancel',async()=>{
 const {router,onLeave,onPause}=setup()
 fireEvent.click(screen.getByRole('link',{name:'지도'}))
 await screen.findByRole('alertdialog')
 expect(screen.getByText(/사용한 미끼 1개는 돌려받을 수 없어요/)).toBeTruthy()
 expect(onPause).toHaveBeenLastCalledWith(true)
 fireEvent.click(screen.getByRole('button',{name:'계속 낚시하기'}))
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
 expect(onPause).toHaveBeenLastCalledWith(false)
 expect(onLeave).not.toHaveBeenCalled()
 expect(router.state.location.pathname).toBe('/fish')
})
it('waits for settlement before navigating and prevents duplicate confirmation',async()=>{
 let resolve!:()=>void
 const onLeave=vi.fn(()=>new Promise<void>(done=>{resolve=done}))
 const {router}=setup({onLeave})
 act(()=>{void router.navigate(-1)})
 fireEvent.click(await screen.findByRole('button',{name:'그만두고 이동'}))
 expect(router.state.location.pathname).toBe('/fish')
 expect(screen.getByRole('button',{name:'처리 중…'})).toHaveProperty('disabled',true)
 await act(async()=>{resolve()})
 await screen.findByText('지도 화면')
 expect(onLeave).toHaveBeenCalledOnce()
})
it('keeps the destination blocked after an uncertain settlement and permits retry',async()=>{
 const onLeave=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined)
 const {router}=setup({onLeave})
 fireEvent.click(screen.getByRole('link',{name:'지도'}))
 fireEvent.click(await screen.findByRole('button',{name:'그만두고 이동'}))
 await screen.findByRole('alert')
 expect(router.state.location.pathname).toBe('/fish')
 fireEvent.click(screen.getByRole('button',{name:'그만두고 이동'}))
 await screen.findByText('지도 화면')
 expect(onLeave).toHaveBeenCalledTimes(2)
})
it('warns on refresh only during fishing and does not claim practice consumes bait',async()=>{
 setup({practice:true})
 const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event)
 expect(event.defaultPrevented).toBe(true)
 fireEvent.click(screen.getByRole('link',{name:'지도'}))
 await screen.findByText('이동하면 진행 중인 연습이 끝나요.')
 expect(screen.queryByText(/미끼 1개/)).toBeNull()
 cleanup()
 setup({active:false})
 const after=new Event('beforeunload',{cancelable:true});window.dispatchEvent(after)
 expect(after.defaultPrevented).toBe(false)
 fireEvent.click(screen.getByRole('link',{name:'지도'}))
 await screen.findByText('지도 화면')
})
