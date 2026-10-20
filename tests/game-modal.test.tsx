import {useState} from 'react'
import {act,cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {createMemoryRouter,Link,RouterProvider} from 'react-router'
import {afterEach,expect,it,vi} from 'vitest'
import {GameModal} from '@/features/arcade/game-modal'
afterEach(()=>cleanup())
it('guards a route change and runs game cleanup before proceeding',async()=>{
 const exit=vi.fn()
 function Game(){const [open,setOpen]=useState(true);return <GameModal open={open} title="공통 게임" active practice onExit={async()=>{exit();setOpen(false)}}><Link to="/other">다른 화면</Link></GameModal>}
 const router=createMemoryRouter([{path:'/',element:<Game/>},{path:'/other',element:<p>이동 완료</p>}])
 render(<RouterProvider router={router}/>)
 fireEvent.click(screen.getByRole('link',{name:'다른 화면'}))
 expect(await screen.findByRole('alertdialog')).toBeTruthy()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'취소'}))
 expect(exit).not.toHaveBeenCalled()
 await waitFor(()=>expect(screen.queryByRole('alertdialog')).toBeNull())
 fireEvent.click(screen.getByRole('link',{name:'다른 화면'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'나가기'}))
 await screen.findByText('이동 완료');expect(exit).toHaveBeenCalledOnce()
})
it('keeps the modal open when asynchronous settlement fails',async()=>{
 const exit=vi.fn().mockRejectedValue(Error('offline')),pause=vi.fn()
 render(<GameModal open title="공통 게임" active practice={false} onExit={exit} onPause={pause}><p>게임 보드</p></GameModal>)
 fireEvent.click(screen.getByRole('button',{name:'게임 나가기'}))
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'나가기'}))
 await screen.findByText('종료 처리에 실패했어요. 다시 시도해주세요.')
 expect(screen.getByRole('dialog',{name:'공통 게임'})).toBeTruthy()
 fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button',{name:'취소'}))
 await act(async()=>{});expect(pause).toHaveBeenLastCalledWith(false)
})
