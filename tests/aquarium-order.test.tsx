import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {AquariumTankPicker} from '@/features/aquarium/aquarium-tank-picker'
vi.mock('@/features/aquarium/api',()=>({backgroundUrl:(path:string)=>path}))
afterEach(cleanup)
const tanks=Array.from({length:5},(_,i)=>({id:String(i+1),name:`어항 ${i+1}`,background_id:'default'}))
function setup(save=vi.fn().mockResolvedValue(undefined)){
 render(<AquariumTankPicker tanks={tanks} selectedId="3" backgrounds={[]} busy={false} onSelect={vi.fn()} onAdd={vi.fn()} onRename={vi.fn()} onReorder={save}/> )
 fireEvent.click(screen.getByRole('button',{name:'어항 선택'}));return save
}
it('previews the fifth tank as representative and saves the inserted order with its original order',async()=>{
 const save=setup()
 expect(screen.getByText('첫번째 어항은 친구들이 방문했을 때 보여지는 대표 어항입니다.')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'순서 편집'}))
 fireEvent.click(screen.getByRole('button',{name:'어항 5 맨 앞으로'}))
 expect(screen.getByRole('status').textContent).toContain('어항 5')
 expect(within(screen.getByRole('list')).getAllByRole('listitem')[0].textContent).toContain('어항 5')
 expect(save).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'저장'}))
 await waitFor(()=>expect(save).toHaveBeenCalledExactlyOnceWith(['5','1','2','3','4'],['1','2','3','4','5']))
})
it('supports arrow movement and cancels without saving',()=>{
 const save=setup();fireEvent.click(screen.getByRole('button',{name:'순서 편집'}))
 fireEvent.click(screen.getByRole('button',{name:'어항 2 위로'}))
 expect(screen.getByRole('status').textContent).toContain('어항 2')
 fireEvent.click(screen.getByRole('button',{name:'취소'}))
 expect(save).not.toHaveBeenCalled()
 expect(within(screen.getByRole('list')).getAllByRole('listitem')[0].textContent).toContain('어항 1')
})
it('keeps the draft and shows an error when saving fails',async()=>{
 const save=setup(vi.fn().mockRejectedValue(new Error('저장 실패')))
 fireEvent.click(screen.getByRole('button',{name:'순서 편집'}));fireEvent.click(screen.getByRole('button',{name:'어항 5 맨 앞으로'}));fireEvent.click(screen.getByRole('button',{name:'저장'}))
 expect(await screen.findByRole('alert')).toHaveProperty('textContent','저장 실패')
 expect(screen.getByRole('status').textContent).toContain('어항 5')
 expect(save).toHaveBeenCalledTimes(1)
})
