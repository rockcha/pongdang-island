import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { DecorationEditor } from '../src/features/aquarium/decoration-editor'
const value={position_x:.2,position_y:.3,rotation:345,scale:1}
afterEach(cleanup)
it('uses only icon buttons and saves rotation and size changes immediately',async()=>{
 const change=vi.fn(async()=>{})
 render(<DecorationEditor name="불가사리" value={value} busy={false} onChange={change}/>)
 expect(screen.getAllByRole('button')).toHaveLength(5)
 expect(screen.queryByRole('button',{name:'꾸미기 저장'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'시계 방향 15도 회전'}))
 await waitFor(()=>expect(change).toHaveBeenLastCalledWith({...value,rotation:0}))
 await waitFor(()=>expect(screen.getByRole('button',{name:'크기 키우기'})).toHaveProperty('disabled',false))
 fireEvent.click(screen.getByRole('button',{name:'크기 키우기'}))
 await waitFor(()=>expect(change).toHaveBeenLastCalledWith({...value,scale:1.1}))
})
it('enforces both size limits',()=>{
 const props={name:'불가사리',busy:false,onChange:vi.fn()}
 const view=render(<DecorationEditor {...props} value={{...value,scale:.5}}/>)
 expect(screen.getByRole('button',{name:'크기 줄이기'})).toHaveProperty('disabled',true)
 view.rerender(<DecorationEditor {...props} value={{...value,scale:2}}/>)
 expect(screen.getByRole('button',{name:'크기 키우기'})).toHaveProperty('disabled',true)
})

it('supports mirror and reverse rotation',async()=>{
 const change=vi.fn(async()=>{})
 render(<DecorationEditor name="개체" value={{...value,rotation:0}} busy={false} onChange={change}/>)
 fireEvent.click(screen.getByRole('button',{name:'반시계 방향 15도 회전'}))
 await waitFor(()=>expect(change).toHaveBeenLastCalledWith({...value,rotation:345}))
 await waitFor(()=>expect(screen.getByRole('button',{name:'좌우 반전'})).toHaveProperty('disabled',false))
 fireEvent.click(screen.getByRole('button',{name:'좌우 반전'}))
 await waitFor(()=>expect(change).toHaveBeenLastCalledWith({...value,rotation:0,flipped:true}))
})
