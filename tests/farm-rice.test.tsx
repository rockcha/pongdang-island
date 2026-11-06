import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {legacyTradeFixture as initialTopview} from './helpers/legacy-trade-fixture'
import {simulateFarm,farmGoods} from '@/features/farm/farm-simulation'
import {finishedFoods,isFinishedFood,farmRecipes,millProducts} from '@/features/farm/food-catalog'
import {cropKinds} from '@/features/farm/crop-catalog'
import {dailyFarmOrders,farmOrderDay,farmOrderKey} from '@/features/farm/daily-orders'
import {MillWorkshop} from '@/features/farm/mill-workshop'
import {FarmWarehouse} from '@/features/farm/warehouse'

afterEach(cleanup)
it('researches and harvests paddy, then husks it once into rice',()=>{
 let state=initialTopview()
 expect(simulateFarm(state,23,{type:'seed',good:'paddySeed',quantity:1},0).state).toBe(state)
 state=simulateFarm(state,20,{type:'research',crop:'paddy'},0).state
 state=simulateFarm(state,20,{type:'completeResearch'},8000).state
 state=simulateFarm(state,23,{type:'seed',good:'paddySeed',quantity:1},8000).state
 state=simulateFarm(state,10,{type:'plant',crop:'paddy'},8000).state
 expect(state.simulation.inventory.paddySeed).toBe(0)
 state=simulateFarm(state,10,{type:'harvest'},18000).state
 expect(state.simulation.inventory.paddy).toBe(3)
 state=simulateFarm(state,21,{type:'mill',product:'rice',quantity:1},18000).state
 expect(state.simulation.inventory.paddy).toBe(1)
 expect(simulateFarm(state,21,{type:'collectFlour'},27999).state).toBe(state)
 state=simulateFarm(state,21,{type:'collectFlour'},28000).state
 expect(state.simulation.inventory.rice).toBe(1)
 expect(simulateFarm(state,21,{type:'collectFlour'},28000).state).toBe(state)
})
it.each(['omurice'] as const)('makes and sells %s with rice and actual reserved ingredients',product=>{
 let state=initialTopview();state.simulation.unlockedCrops=[...cropKinds]
 const recipe=farmRecipes[product],workshop=state.objects.find(object=>object.kind===recipe.building)!,store=state.objects.find(object=>object.kind==='processed')!
 for(const item of recipe.ingredients)state.simulation.inventory[item.good]=item.quantity
 state=simulateFarm(state,workshop.id,{type:'craft',recipe:product,quantity:1},0).state
 for(const item of recipe.ingredients)expect(state.simulation.inventory[item.good]).toBe(0)
 state=simulateFarm(state,workshop.id,{type:'collectCraft'},recipe.seconds*1000).state
 expect(state.simulation.inventory[product]).toBe(1)
 const at=Array.from({length:90},(_,day)=>Date.UTC(2026,10,6+day)).find(at=>dailyFarmOrders(store,at,state).some(order=>order.good===product))!
 expect(at).toBeDefined()
 const sold=simulateFarm(state,store.id,{type:'sell',good:product,quantity:1,orderDay:farmOrderDay(at)},at).state
 expect(sold.gold).toBe(state.gold+farmGoods[product].price)
 expect(sold.simulation.inventory[product]).toBe(0)
})
it('advertises only finished foods and refuses material sales even with old material delivery records',()=>{
 const state=initialTopview(),store=state.objects.find(object=>object.kind==='processed')!,at=Date.UTC(2026,10,6),seen=new Set<string>()
 state.simulation.unlockedCrops=[...cropKinds];state.simulation.unlockedAnimals=['cow','chicken','duck','sheep']
 state.objects.push({id:80,kind:'duck',x:7,y:7},{id:81,kind:'sheep',x:8,y:7},{id:82,kind:'butcher',x:8,y:15})
 for(let day=0;day<90;day++)for(const order of dailyFarmOrders(store,at+day*86400000,state)){expect(isFinishedFood(order.good)).toBe(true);seen.add(order.good)}
 for(const food of finishedFoods)expect(seen.has(food)).toBe(true)
 for(const good of [...millProducts,'tomatoKetchup','strawberryJam'] as const){
  state.simulation.inventory[good]=5
  state.simulation.orderDeliveries[farmOrderKey(store,at)]={[good]:1}
  expect(dailyFarmOrders(store,at,state).some(order=>order.good===good)).toBe(false)
  expect(simulateFarm(state,store.id,{type:'sell',good,quantity:1,orderDay:farmOrderDay(at)},at).state).toBe(state)
 }
})
it('uses a husking action in the mill and removes the sales link for stored rice',()=>{
 const state=initialTopview(),onAction=vi.fn(),onNavigate=vi.fn()
 state.simulation.unlockedCrops.push('paddy');state.simulation.inventory.paddy=2
 const {unmount}=render(<MillWorkshop buildingId={21} simulation={state.simulation} now={0} onAction={onAction}/>)
 fireEvent.click(screen.getByRole('button',{name:'쌀 선택'}))
 fireEvent.click(screen.getByRole('button',{name:'벼 도정 시작'}))
 expect(onAction).toHaveBeenCalledWith({type:'mill',product:'rice',quantity:1})
 unmount();state.simulation.inventory.rice=1
 render(<FarmWarehouse simulation={state.simulation} onClose={()=>{}} onNavigate={onNavigate}/>)
 fireEvent.click(screen.getByRole('button',{name:'가공품',exact:true}))
 fireEvent.click(screen.getByRole('button',{name:/쌀.*×1/}))
 expect(screen.getByRole('button',{name:'판매소로 →'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'판매소로 →'})).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'중급 주방 이동 →'}))
 expect(onNavigate).toHaveBeenCalledWith('advancedKitchen')
})
