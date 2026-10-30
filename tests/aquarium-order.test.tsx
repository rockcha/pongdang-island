import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {AquariumTankPicker} from '@/features/aquarium/aquarium-tank-picker'
import {useState} from 'react'
vi.mock('@/features/aquarium/api',()=>({backgroundUrl:(path:string)=>path}))
afterEach(cleanup)
const tanks=Array.from({length:5},(_,i)=>({id:String(i+1),name:`어항 ${i+1}`,background_id:'default',is_representative:i===0}))
function setup(save=vi.fn().mockResolvedValue(undefined)){
 function Harness(){const [current,setCurrent]=useState(tanks);return <AquariumTankPicker tanks={current} selectedId="3" backgrounds={[]} busy={false} onSelect={vi.fn()} onAdd={vi.fn()} onRename={vi.fn()} onRepresentative={async id=>setCurrent(old=>old.map(t=>({...t,is_representative:t.id===id})))} onReorder={save}/>}
 render(<Harness/>)
 fireEvent.click(screen.getByRole('button',{name:'어항 선택'}));return save
}
it('changes the representative independently from display order and saves reordering separately',async()=>{
 const save=setup()
 expect(screen.queryByText('첫번째 어항은 친구들이 방문했을 때 보여지는 대표 어항입니다.')).toBeNull()
 expect(screen.queryByText('1번째 어항')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'어항 5 대표 지정'}))
 await waitFor(()=>expect(screen.getByRole('img',{name:'대표 어항'}).closest('[data-tank-order-id]')?.getAttribute('data-tank-order-id')).toBe('5'))
 expect(within(screen.getByRole('list')).getAllByRole('listitem')[0].textContent).toContain('어항 1')
 expect(screen.queryByRole('button',{name:'저장'})).toBeNull()
 expect(save).not.toHaveBeenCalled()
 expect(screen.getByRole('img',{name:'대표 어항'}).closest('[data-tank-order-id]')?.getAttribute('data-tank-order-id')).toBe('5')
 for(let i=0;i<4;i++)fireEvent.click(screen.getByRole('button',{name:'어항 5 위로'}))
 fireEvent.click(screen.getByRole('button',{name:'저장'}))
 await waitFor(()=>expect(save).toHaveBeenCalledExactlyOnceWith(['5','1','2','3','4'],['1','2','3','4','5']))
})
it('supports arrow movement and cancels without saving',()=>{
 const save=setup()
 fireEvent.click(screen.getByRole('button',{name:'어항 2 위로'}))
 expect(screen.getByRole('img',{name:'대표 어항'}).closest('[data-tank-order-id]')?.getAttribute('data-tank-order-id')).toBe('1')
 fireEvent.click(screen.getByRole('button',{name:'취소'}))
 expect(save).not.toHaveBeenCalled()
 expect(within(screen.getByRole('list')).getAllByRole('listitem')[0].textContent).toContain('어항 1')
})
it('keeps the draft and shows an error when saving fails',async()=>{
 const save=setup(vi.fn().mockRejectedValue(new Error('저장 실패')))
 fireEvent.click(screen.getByRole('button',{name:'어항 5 위로'}));fireEvent.click(screen.getByRole('button',{name:'저장'}))
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','저장 실패')
 expect(within(screen.getByRole('list')).getAllByRole('listitem')[3].textContent).toContain('어항 5')
 expect(save).toHaveBeenCalledTimes(1)
})
