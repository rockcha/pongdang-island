import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {FarmProductionDialog} from '@/features/farm/production-dialog'
import {initialTopview,type FarmTool} from '@/features/farm/topview-model'
afterEach(cleanup)
function setup(kind:FarmTool,level=1){
 const state=initialTopview(),object={id:100,kind,x:8,y:8,level},onAction=vi.fn(),onMove=vi.fn()
 state.objects.push(object);state.simulation.inventory.milk=12
 render(<FarmProductionDialog object={object} state={state} message="" onAction={onAction} onClose={()=>{}} onStore={()=>{}} onMove={onMove}/>)
 return {onAction,onMove}
}
it('keeps management collapsed and reveals move controls when requested',()=>{
 const {onMove}=setup('office')
 expect(screen.getByLabelText('건물 관리').closest('details')?.open).toBe(false)
 fireEvent.click(screen.getByLabelText('건물 관리'))
 expect(screen.getByLabelText('건물 관리').closest('details')?.open).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'이동하기'}))
 expect(onMove).toHaveBeenCalledOnce()
})
it('shows recipe stock and feasibility while preserving production actions',()=>{
 const {onAction}=setup('dairy')
 fireEvent.click(screen.getByRole('button',{name:'요구르트 선택'}))
 expect(screen.getByRole('button',{name:'요구르트 선택'}).textContent).toContain('제작 가능')
 fireEvent.click(screen.getByRole('button',{name:'요구르트 만들기'}))
 expect(onAction).toHaveBeenCalledWith({type:'craft',recipe:'yogurt',quantity:1})
})
it('preserves seed purchase and research locks in the grid',()=>{
 const {onAction}=setup('seedShop')
 fireEvent.click(screen.getByRole('button',{name:'밀 종자 구매'}))
 expect(onAction).toHaveBeenCalledWith(expect.objectContaining({type:'seed',good:'wheatSeed',quantity:1}))
 fireEvent.click(screen.getByRole('button',{name:'딸기 종자 선택'}))
 expect(screen.getByRole('button',{name:'딸기 종자 구매'})).toHaveProperty('disabled',true)
})
it('shows all reserved ingredients and disables unaffordable consecutive production',()=>{
 const {onAction}=setup('dairy',3)
 fireEvent.click(screen.getByRole('button',{name:'요구르트 선택'}))
 expect(screen.queryByRole('combobox',{name:'연속 생산 횟수'})).toBeNull()
 fireEvent.change(screen.getByRole('spinbutton',{name:'요구르트 제작 수량'}),{target:{value:'3'}})
 expect(screen.getByRole('group',{name:'필요한 재료'}).textContent).toContain('우유 ×9')
 expect(screen.getByText('생산: 요구르트 3개 · 소요 시간: 40분 · 최대 6개')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'요구르트 만들기'}))
 expect(onAction).toHaveBeenCalledWith({type:'craft',recipe:'yogurt',quantity:3})
 fireEvent.change(screen.getByRole('spinbutton',{name:'요구르트 제작 수량'}),{target:{value:'6'}})
 expect(screen.getByRole('group',{name:'필요한 재료'}).textContent).toContain('우유 ×12')
 expect(screen.getByRole('button',{name:'요구르트 만들기'})).toHaveProperty('disabled',false)
})
it('keeps the selected recipe ingredients in a separate workbench panel',()=>{
 setup('advancedKitchen')
 fireEvent.click(screen.getByRole('button',{name:'고기스튜 선택'}))
 const ingredients=screen.getByRole('group',{name:'필요한 재료'})
 expect(ingredients.textContent).toContain('붉은 고기 ×2')
 expect(ingredients.textContent).toContain('감자 ×3')
 expect(ingredients.textContent).toContain('토마토케첩 ×2')
 expect(ingredients.closest('.farm-workbench')).toBeTruthy()
 expect(ingredients.closest('.farm-item-selector')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'콘치즈 선택'}))
 expect(screen.getByRole('group',{name:'필요한 재료'}).textContent).toContain('옥수수 ×3')
 expect(screen.getByRole('group',{name:'필요한 재료'}).textContent).not.toContain('붉은 고기')
})
