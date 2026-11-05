import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,farmGoods} from '@/features/farm/farm-simulation'
import {canProduceOrderGood,dailyFarmOrders,farmOrderDay} from '@/features/farm/daily-orders'
import {ProcessingWorkshop} from '@/features/farm/processing-workshop'
import {MillWorkshop} from '@/features/farm/mill-workshop'

afterEach(cleanup)
it.each(['carrotCake','tomatoKetchup'] as const)('makes %s in its workshop and sells only the completed food',product=>{
 let state=initialTopview();const cake=product==='carrotCake',workshop=cake?25:28,seconds=cake?10:8
 expect(canProduceOrderGood(state,product)).toBe(false)
 state.simulation.unlockedCrops.push(cake?'carrot':'tomato')
 expect(canProduceOrderGood(state,product)).toBe(false);state.simulation.unlockedCrops.push('sugarcane')
 expect(canProduceOrderGood(state,product)).toBe(true)
 Object.assign(state.simulation.inventory,cake?{carrot:2,flour:1,egg:1,sugar:1,cream:1}:{tomato:2,sugar:1})
 const action=cake?{type:'craft',recipe:'carrotCake',quantity:1} as const:{type:'craft',recipe:'tomatoKetchup',quantity:1} as const
 expect(simulateFarm(state,cake?21:25,action,0).state).toBe(state)
 state=simulateFarm(state,workshop,action,0).state
 expect(state.simulation.inventory[cake?'carrot':'tomato']).toBe(0)
 if(cake)for(const good of ['flour','egg','sugar','cream'] as const)expect(state.simulation.inventory[good]).toBe(0)
 const collect={type:'collectCraft'} as const
 expect(simulateFarm(state,workshop,collect,seconds*1000-1).state).toBe(state)
 state=simulateFarm(state,workshop,collect,seconds*1000).state
 expect(state.simulation.inventory[product]).toBe(1)
 expect(simulateFarm(state,workshop,collect,seconds*1000).state).toBe(state)
 const store=state.objects.find(object=>object.kind==='processed')!
 const at=Array.from({length:90},(_,day)=>Date.UTC(2026,10,6+day)).find(at=>dailyFarmOrders(store,at,state).some(order=>order.good===product))!
 expect(at).toBeDefined()
 const sold=simulateFarm(state,store.id,{type:'sell',good:product,quantity:1,orderDay:farmOrderDay(at)},at).state
 expect(sold.gold).toBe(state.gold+farmGoods[product].price)
 expect(sold.simulation.inventory[product]).toBe(0)
 expect(simulateFarm(sold,store.id,{type:'sell',good:product,quantity:1,orderDay:farmOrderDay(at)},at).state).toBe(sold)
})
it('selects carrot cake in the bakery and submits the recipe using the available ingredients',()=>{
 const simulation=initialTopview().simulation,onAction=vi.fn()
 Object.assign(simulation.inventory,{carrot:2,flour:1,egg:1,sugar:1,cream:1})
 render(<ProcessingWorkshop buildingId={25} kind="bakery" simulation={simulation} now={0} onAction={onAction}/>)
 fireEvent.click(screen.getByRole('button',{name:'당근케이크 선택'}))
 expect(screen.getByRole('article',{name:'당근케이크 제작법'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'당근케이크 만들기'}))
 expect(onAction).toHaveBeenCalledWith({type:'craft',recipe:'carrotCake',quantity:1})
})
it('requires two tomatoes and sugar in the kitchen, with no ketchup in the mill',()=>{
 const state=initialTopview(),simulation=state.simulation,onAction=vi.fn()
 const {unmount}=render(<MillWorkshop buildingId={21} simulation={simulation} now={0} onAction={onAction}/>)
 expect(screen.queryByRole('button',{name:'토마토케첩 선택'})).toBeNull();unmount()
 simulation.inventory.tomato=2
 const {rerender}=render(<ProcessingWorkshop buildingId={28} kind="kitchen" simulation={simulation} now={0} onAction={onAction}/>)
 expect(screen.getByRole('button',{name:'토마토케첩 만들기'})).toHaveProperty('disabled',true)
 expect(simulateFarm(state,28,{type:'craft',recipe:'tomatoKetchup',quantity:1},0).state).toBe(state)
 expect(simulation.inventory.tomato).toBe(2)
 simulation.inventory.sugar=1
 rerender(<ProcessingWorkshop buildingId={28} kind="kitchen" simulation={simulation} now={0} onAction={onAction}/>)
 fireEvent.click(screen.getByRole('button',{name:'토마토케첩 만들기'}))
 expect(onAction).toHaveBeenCalledWith({type:'craft',recipe:'tomatoKetchup',quantity:1})
 expect(screen.getAllByRole('button',{name:/선택$/})).toHaveLength(3)
})
