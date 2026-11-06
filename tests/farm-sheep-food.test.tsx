import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {legacyTradeFixture as initialTopview} from './helpers/legacy-trade-fixture'
import {topviewItems} from '@/features/farm/topview-model'
import {simulateFarm,farmGoods} from '@/features/farm/farm-simulation'
import {farmAnimals} from '@/features/farm/animal-catalog'
import {farmRecipes,farmProducts} from '@/features/farm/food-catalog'
import {cropKinds} from '@/features/farm/crop-catalog'
import {dailyFarmOrders,farmOrderDay,farmOrderKey} from '@/features/farm/daily-orders'
import {FarmWarehouse} from '@/features/farm/warehouse'
import {ProcessingWorkshop} from '@/features/farm/processing-workshop'

afterEach(cleanup)
it('retires goats and their goods and keeps wool out of both sales boards and recipes',()=>{
 const state=initialTopview(),at=Date.UTC(2026,10,6)
 expect('goat' in farmAnimals).toBe(false);expect('goat' in topviewItems).toBe(false)
 expect('goatMilk' in farmProducts).toBe(false);expect('goatCheese' in farmProducts).toBe(false)
 state.simulation.unlockedCrops=[...cropKinds];state.objects.push({id:80,kind:'sheep',x:7,y:7});state.simulation.inventory.wool=2
 for(const store of state.objects.filter(o=>o.kind==='store'||o.kind==='processed')){
  state.simulation.orderDeliveries[farmOrderKey(store,at)]={wool:1}
  for(let day=0;day<60;day++)expect(dailyFarmOrders(store,at+day*86400000,state).some(order=>order.good==='wool')).toBe(false)
  expect(simulateFarm(state,store.id,{type:'sell',good:'wool',quantity:1,orderDay:farmOrderDay(at)},at).state).toBe(state)
 }
 expect(Object.values(farmRecipes).some(recipe=>recipe.ingredients.some(item=>(item.good as string)==='wool'))).toBe(false)
})
it('stores wool as a livestock product and explains that its uses are undecided',()=>{
 const state=initialTopview(),onNavigate=vi.fn();state.simulation.inventory.wool=1
 render(<FarmWarehouse simulation={state.simulation} onClose={()=>{}} onNavigate={onNavigate}/>)
 fireEvent.click(screen.getByRole('button',{name:'축산물'}));fireEvent.click(screen.getByRole('button',{name:/양털.*×1/}))
 expect(screen.getByRole('button',{name:'판매소로 →'})).toBeTruthy()
 expect(screen.getByRole('button',{name:'판매소로 →'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'가공소로 →'})).toBeNull()
})
it.each(['omurice','strawberryJam'] as const)('crafts %s in its assigned facility and sells only the finished meal',product=>{
 let state=initialTopview();state.simulation.unlockedCrops=[...cropKinds]
 const recipe=farmRecipes[product],store=state.objects.find(o=>o.kind==='processed')!,workshop=state.objects.find(o=>o.kind===recipe.building)!
 const expected=product==='omurice'?[{good:'rice',quantity:2},{good:'egg',quantity:2},{good:'butter',quantity:1},{good:'tomatoKetchup',quantity:1}]:[{good:'strawberry',quantity:2},{good:'sugar',quantity:1}]
 expect(recipe.ingredients).toEqual(expected)
 for(const item of recipe.ingredients)state.simulation.inventory[item.good]=item.quantity
 const onAction=vi.fn(),view=render(<ProcessingWorkshop kind={recipe.building} buildingId={workshop.id} simulation={state.simulation} now={0} onAction={onAction}/>)
 fireEvent.click(screen.getByRole('button',{name:farmGoods[product].name+' 선택'}))
 const card=screen.getByRole('article',{name:farmGoods[product].name+' 제작법'})
 fireEvent.click(within(card).getByRole('button',{name:farmGoods[product].name+' 만들기'}))
 expect(onAction).toHaveBeenCalledWith({type:'craft',recipe:product,quantity:1});view.unmount()
 state=simulateFarm(state,workshop.id,{type:'craft',recipe:product,quantity:1},0).state
 for(const item of recipe.ingredients)expect(state.simulation.inventory[item.good]).toBe(0)
 expect(simulateFarm(state,workshop.id,{type:'collectCraft'},recipe.seconds*1000-1).state).toBe(state)
 state=simulateFarm(state,workshop.id,{type:'collectCraft'},recipe.seconds*1000).state
 expect(state.simulation.inventory[product]).toBe(1)
 expect(simulateFarm(state,workshop.id,{type:'collectCraft'},recipe.seconds*1000).state).toBe(state)
 if(product==='strawberryJam'){
  for(let day=0;day<90;day++)expect(dailyFarmOrders(store,Date.UTC(2026,10,6+day),state).some(o=>o.good===product)).toBe(false)
  return
 }
 const at=Array.from({length:90},(_,day)=>Date.UTC(2026,10,6+day)).find(at=>dailyFarmOrders(store,at,state).some(o=>o.good===product))!
 expect(at).toBeDefined()
 const sold=simulateFarm(state,store.id,{type:'sell',good:product,quantity:1,orderDay:farmOrderDay(at)},at).state
 expect(sold.gold).toBe(state.gold+farmGoods[product].price);expect(sold.simulation.inventory[product]).toBe(0)
})
