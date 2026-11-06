import {dailyFarmOrders,farmOrderDay} from '@/features/farm/daily-orders'
import {expect,it} from 'vitest'
import {legacyTradeFixture as initialTopview} from './helpers/legacy-trade-fixture'
import {} from '@/features/farm/topview-model'
import {farmLimits,farmPlacementError,simulateFarm} from '@/features/farm/farm-simulation'
import {cropKinds,farmCrops,seedGood} from '@/features/farm/crop-catalog'
it('unlocks potato seeds once through research and purchases the requested quantity',()=>{
 const start=initialTopview()
 expect(simulateFarm(start,2,{type:'seed',good:'potatoSeed',quantity:2},0).state).toBe(start)
 const researching=simulateFarm(start,20,{type:'research',crop:'potato'},0).state
 expect(researching.gold).toBe(start.gold-30)
 expect(simulateFarm(researching,20,{type:'research',crop:'potato'},0).state).toBe(researching)
 expect(simulateFarm(researching,20,{type:'completeResearch'},2999).state).toBe(researching)
 const researched=simulateFarm(researching,20,{type:'completeResearch'},3000).state
 expect(simulateFarm(researched,20,{type:'completeResearch'},3000).state).toBe(researched)
 const bought=simulateFarm(researched,23,{type:'seed',good:'potatoSeed',quantity:2},3000).state
 expect(bought.simulation.inventory.potatoSeed).toBe(2)
 expect(bought.gold).toBe(start.gold-46)
})
it('only delivers goods requested by that store within its daily quota',()=>{
 const state=initialTopview(),store=state.objects.find(o=>o.id===2)!,order=dailyFarmOrders(store,0,state)[0]
 state.simulation.inventory[order.good]=100
 const sold=simulateFarm(state,2,{type:'sell',good:order.good,quantity:4,orderDay:farmOrderDay(0)},0).state
 expect(sold.simulation.inventory[order.good]).toBe(96)
 for(const quantity of [13,-1,1.5])expect(simulateFarm(state,2,{type:'sell',good:order.good,quantity,orderDay:farmOrderDay(0)},0).state).toBe(state)
 expect(simulateFarm(state,22,{type:'sell',good:'wheat',quantity:1,orderDay:farmOrderDay(0)},0).state).toBe(state)
})
it('mills up to two items in exactly ten seconds and never claims them twice',()=>{
 const start=initialTopview(),milling=simulateFarm(start,21,{type:'mill',quantity:2},100).state
 expect(milling.simulation.inventory.wheat).toBe(8)
 expect(simulateFarm(milling,21,{type:'collectFlour'},10099).state).toBe(milling)
 expect(simulateFarm(milling,21,{type:'mill',quantity:1},10100).state).toBe(milling)
 const finished=simulateFarm(milling,21,{type:'collectFlour'},10100).state
 expect(finished.simulation.inventory.flour).toBe(2)
 expect(simulateFarm(finished,21,{type:'collectFlour'},10100).state).toBe(finished)
 expect(finished.gold).toBe(start.gold)
})
it('consumes one seed and only grants the harvest after maturity once',()=>{
 const start=initialTopview(),planted=simulateFarm(start,10,{type:'plant',crop:'wheat'},0).state
 expect(planted.simulation.inventory.wheatSeed).toBe(3)
 expect(simulateFarm(planted,10,{type:'plant',crop:'wheat'},0).state).toBe(planted)
 expect(simulateFarm(planted,10,{type:'harvest'},9999).state).toBe(planted)
 const harvested=simulateFarm(planted,10,{type:'harvest'},10000).state
 expect(harvested.simulation.inventory.wheat).toBe(15)
 expect(simulateFarm(harvested,10,{type:'harvest'},10000).state).toBe(harvested)
})
it('keeps every non-wheat seed locked until its own timed research completes, then grows and harvests every crop',()=>{
 for(const crop of cropKinds){
  let state=initialTopview(),now=0
  const seed=seedGood(crop),details=farmCrops[crop]
  if(crop!=='wheat'){
   expect(simulateFarm(state,23,{type:'seed',good:seed,quantity:1},now).state).toBe(state)
   expect(simulateFarm(state,10,{type:'plant',crop},now).state).toBe(state)
   expect(simulateFarm(state,2,{type:'research',crop},now).state).toBe(state)
   state=simulateFarm(state,20,{type:'research',crop},now).state
   expect(simulateFarm(state,20,{type:'research',crop:'wheat'},now).state).toBe(state)
   now=details.researchSeconds*1000
   expect(now).toBeLessThanOrEqual(10000)
   state=simulateFarm(state,20,{type:'completeResearch'},now).state
   expect(simulateFarm(state,20,{type:'research',crop},now).state).toBe(state)
  }
  const balance=state.gold,starting=state.simulation.inventory[crop]
  expect(simulateFarm(state,2,{type:'seed',good:seed,quantity:1},now).state).toBe(state)
  state=simulateFarm(state,23,{type:'seed',good:seed,quantity:1},now).state
  state=simulateFarm(state,10,{type:'plant',crop},now).state
  const ready=now+details.growSeconds*1000
  expect(ready-now).toBeLessThanOrEqual(10000)
  expect(simulateFarm(state,10,{type:'harvest'},ready-1).state).toBe(state)
  state=simulateFarm(state,10,{type:'harvest'},ready).state
  expect(state.simulation.inventory[crop]).toBe(starting+details.yield)
  expect(state.gold).toBe(balance-details.seedPrice)
 }
})
it('serializes research without charging rejected or unaffordable requests',()=>{
 const start=initialTopview(),researching=simulateFarm(start,20,{type:'research',crop:'strawberry'},0).state
 expect(simulateFarm(researching,20,{type:'research',crop:'potato'},0).state).toBe(researching)
 const poor={...start,gold:29}
 expect(simulateFarm(poor,20,{type:'research',crop:'potato'},0).state).toBe(poor)
 expect(researching.simulation.unlockedCrops).toEqual(['wheat'])
})
it('adds plot slots through the farm office and animal slots through the livestock office',()=>{
 const state=initialTopview(),base={...state,objects:state.objects.filter(o=>!['office','livestockOffice','barn','coop'].includes(o.kind))}
 expect(farmLimits(base)).toMatchObject({plots:4,animals:2})
 expect(farmLimits(state)).toMatchObject({plots:8,animals:4})
 expect(farmPlacementError(base,'plot')).toContain('한도')
 expect(farmPlacementError(base,'cow')).toContain('먼저')
 expect(farmLimits({...state,objects:[...state.objects,{id:99,kind:'office',x:0,y:0},{id:100,kind:'barn',x:0,y:0}]})).toMatchObject({plots:12,animals:4})
})
it('buys animals at their correct facilities and counts stored animals against capacity',()=>{
 const state=initialTopview()
 expect(simulateFarm(state,18,{type:'animal',animal:'cow'},0).state).toBe(state)
 const bought=simulateFarm(state,18,{type:'animal',animal:'chicken'},0)
 expect(bought.place).toBeUndefined();expect(bought.state.gold).toBe(state.gold-300)
 expect(bought.state.stored).toEqual([])
 expect(simulateFarm(bought.state,18,{type:'completeAnimalPurchase'},9999).state).toBe(bought.state)
 expect(simulateFarm(bought.state,18,{type:'completeAnimalPurchase'},10000).state.stored).toEqual(['chicken'])
 const second=simulateFarm(bought.state,3,{type:'animal',animal:'cow'},0).state
 expect(simulateFarm(second,18,{type:'animal',animal:'chicken'},0).state).toBe(second)
 const fed=simulateFarm(state,4,{type:'feed'},0).state
 const milk=simulateFarm(fed,4,{type:'collectAnimal'},10000).state
 expect(milk.simulation.inventory.milk).toBe(1)
 expect(simulateFarm(milk,4,{type:'collectAnimal'},10000).state).toBe(milk)
})
