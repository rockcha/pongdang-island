import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {FoodSalePanel} from '@/features/farm/food-sale-panel'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,farmGoods} from '@/features/farm/farm-simulation'
import {finishedFoods} from '@/features/farm/food-catalog'
afterEach(cleanup)
function setup(){const state=initialTopview();state.simulation.inventory.roastedSweetPotato=3;state.simulation.inventory.yogurt=2;return state}
it('filters owned foods, selects multiple items and submits quantities together',()=>{
 const state=setup(),onAction=vi.fn();render(<FoodSalePanel state={state} onAction={onAction}/>)
 expect(screen.queryByRole('button',{name:'꿀우유 선택'})).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'전체 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'군고구마 수량 변경'}))
 fireEvent.change(screen.getByRole('spinbutton',{name:'군고구마 판매 수량'}),{target:{value:'1'}})
 fireEvent.click(screen.getByRole('button',{name:/400\s*골드에 판매/}))
 expect(onAction).toHaveBeenCalledWith({type:'marketSellBatch',items:expect.arrayContaining([{good:'roastedSweetPotato',quantity:1},{good:'yogurt',quantity:2}])})
 fireEvent.click(screen.getByRole('checkbox'))
 expect(screen.getByRole('button',{name:'꿀우유 선택'})).toHaveProperty('disabled',true)
 const names=screen.getAllByRole('button',{name:/ 선택$/}).filter(button=>button.hasAttribute('aria-pressed')).map(button=>button.getAttribute('aria-label'))
 const expected=[...finishedFoods].sort((a,b)=>farmGoods[a].price-farmGoods[b].price||farmGoods[a].name.localeCompare(farmGoods[b].name,'ko')).map(id=>`${farmGoods[id].name} 선택`)
 expect(names).toEqual(expected)
})
it('sells atomically, rejects insufficient stock and cannot repeat the same sale',()=>{
 const state=setup(),id=state.objects.find(o=>o.kind==='store')!.id
 const action={type:'marketSellBatch' as const,items:[{good:'roastedSweetPotato' as const,quantity:3},{good:'yogurt' as const,quantity:2}]}
 const done=simulateFarm(state,id,action,0)
 expect(done.state.gold).toBe(state.gold+560)
 expect(done.state.simulation.inventory.roastedSweetPotato).toBe(0)
 expect(done.state.simulation.inventory.yogurt).toBe(0)
 expect(simulateFarm(done.state,id,action,0).state).toBe(done.state)
 expect(simulateFarm(state,id,{...action,items:[action.items[0],{good:'yogurt',quantity:3}]},0).state).toBe(state)
 expect(simulateFarm(state,id,{type:'marketSellBatch',items:[{good:'wheatSeed',quantity:1}]},0).state).toBe(state)
})
