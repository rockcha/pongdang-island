import {expect,it} from 'vitest'
import {legacyTradeFixture as initialTopview} from './helpers/legacy-trade-fixture'
import {} from '@/features/farm/topview-model'
import {farmGoods,simulateFarm} from '@/features/farm/farm-simulation'
import {canProduceOrderGood,dailyFarmOrders,farmOrderDay} from '@/features/farm/daily-orders'
import {farmRecipes} from '@/features/farm/food-catalog'

it('researches and grows cane, processes two sugar, bakes cookies and delivers them once',()=>{
 let state=initialTopview()
 expect(canProduceOrderGood(state,'sugar')).toBe(false)
 state=simulateFarm(state,20,{type:'research',crop:'sugarcane'},0).state
 state=simulateFarm(state,20,{type:'completeResearch'},8000).state
 state=simulateFarm(state,23,{type:'seed',good:'sugarcaneSeed',quantity:1},8000).state
 state=simulateFarm(state,10,{type:'plant',crop:'sugarcane'},8000).state
 state=simulateFarm(state,10,{type:'harvest'},18000).state
 state=simulateFarm(state,10,{type:'harvest'},21000).state
 expect(state.simulation.inventory.sugarcane).toBe(3)
 expect(canProduceOrderGood(state,'sugar')).toBe(true)
 expect(simulateFarm(state,21,{type:'mill',product:'sugar',quantity:2},21000).state).toBe(state)
 state=simulateFarm(state,21,{type:'mill',product:'sugar',quantity:1},21000).state
 expect(state.simulation.inventory.sugarcane).toBe(1)
 expect(state.simulation.millJobs[21].quantity).toBe(1)
 expect(simulateFarm(state,21,{type:'collectFlour'},28999).state).toBe(state)
 state=simulateFarm(state,21,{type:'collectFlour'},29000).state
 expect(state.simulation.inventory.sugar).toBe(2)
 expect(simulateFarm(state,21,{type:'collectFlour'},29000).state).toBe(state)
 Object.assign(state.simulation.inventory,{flour:1,butter:1})
 state=simulateFarm(state,25,{type:'craft',recipe:'butterCookies',quantity:1},29000).state
 expect(state.simulation.inventory.sugar).toBe(1)
 state=simulateFarm(state,25,{type:'collectCraft'},37000).state
 expect(state.simulation.inventory.butterCookies).toBe(1)
 const store=state.objects.find(object=>object.kind==='processed')!
 const at=Array.from({length:90},(_,day)=>Date.UTC(2026,10,6+day)).find(at=>dailyFarmOrders(store,at,state).some(order=>order.good==='butterCookies'))!
 expect(at).toBeDefined()
 const sold=simulateFarm(state,store.id,{type:'sell',good:'butterCookies',quantity:1,orderDay:farmOrderDay(at)},at).state
 expect(sold.gold).toBe(state.gold+farmGoods.butterCookies.price)
 expect(sold.simulation.inventory.butterCookies).toBe(0)
 expect(simulateFarm(sold,store.id,{type:'sell',good:'butterCookies',quantity:1,orderDay:farmOrderDay(at)},at).state).toBe(sold)
})

it('requires both cane research and a mill for sugar-dependent orders, but preserves reserved baking jobs',()=>{
 const state=initialTopview()
 for(const good of ['sugar','butterCookies','cake'] as const)expect(canProduceOrderGood(state,good)).toBe(false)
 state.objects=state.objects.filter(object=>object.kind!=='mill')
 state.simulation.unlockedCrops.push('sugarcane','strawberry')
 expect(canProduceOrderGood(state,'butterCookies')).toBe(false)
 state.objects.push({id:60,kind:'mill',x:4,y:7})
 for(const good of ['sugar','butterCookies','cake'] as const)expect(canProduceOrderGood(state,good)).toBe(true)
 state.simulation.processingJobs[25]={recipe:'cake',quantity:2,startedAt:0,readyAt:10000}
 expect(state.simulation.inventory.sugar).toBe(0)
 expect(simulateFarm(state,25,{type:'collectCraft'},10000).state.simulation.inventory.cake).toBe(2)
 for(const id of ['butterCookies','cake','duckEggTart'] as const)expect(farmRecipes[id].ingredients.some(item=>item.good==='sugar')).toBe(true)
 expect(Object.keys(farmGoods).some(id=>id.toLowerCase().includes('golden'))).toBe(false)
})
