import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { createMemoryRouter,Link,RouterProvider } from 'react-router'
import { afterEach,expect,it } from 'vitest'
import { GameLeaveGuard } from '@/features/arcade/game-leave-guard'
afterEach(cleanup)
function setup(active=true,practice=false){
 const router=createMemoryRouter([{path:'/game',element:<><GameLeaveGuard active={active} practice={practice}/><p>플레이 중</p><Link to="/lobby">목록으로</Link></>},{path:'/lobby',element:<p>게임 목록 화면</p>}],{initialEntries:['/lobby','/game'],initialIndex:1})
 render(<RouterProvider router={router}/>);return router
}
it('guards leaving practice, supports cancel, and proceeds only after confirmation',async()=>{
 const router=setup(true,true)
 fireEvent.click(screen.getByRole('link',{name:'목록으로'}))
 await screen.findByRole('alertdialog')
 expect(router.state.location.pathname).toBe('/game')
 expect(screen.getByText('나가면 연습 진행이 사라져요.')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'취소'}))
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
 expect(router.state.location.pathname).toBe('/game')
 fireEvent.click(screen.getByRole('link',{name:'목록으로'}))
 fireEvent.click(await screen.findByRole('button',{name:'확인'}))
 await screen.findByText('게임 목록 화면')
})
it('guards browser back during paid play and installs the refresh warning only while active',async()=>{
 const router=setup()
 const refresh=new Event('beforeunload',{cancelable:true});window.dispatchEvent(refresh);expect(refresh.defaultPrevented).toBe(true)
 act(()=>{void router.navigate(-1)})
 await screen.findByRole('alertdialog')
 expect(screen.getByText(/진행 중인 게임은 돌아와/)).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'확인'}))
 await screen.findByText('게임 목록 화면')
 const after=new Event('beforeunload',{cancelable:true});window.dispatchEvent(after);expect(after.defaultPrevented).toBe(false)
})
it('does not block navigation before starting or after finishing',async()=>{
 setup(false)
 fireEvent.click(screen.getByRole('link',{name:'목록으로'}))
 await screen.findByText('게임 목록 화면')
 expect(screen.queryByRole('alertdialog')).toBeNull()
})
