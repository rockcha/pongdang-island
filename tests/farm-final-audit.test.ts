import {expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,type FarmSimAction} from '@/features/farm/farm-simulation'
import {farmCrops,cropKinds} from '@/features/farm/crop-catalog'
import {recipeIds,farmRecipes,recipeOutput,finishedFoods,millRecipes,millProducts} from '@/features/farm/food-catalog'
import {farmAnimals} from '@/features/farm/animal-catalog'
import {butcherRecipes} from '@/features/farm/butcher-catalog'

it.each(recipeIds)('reserves, completes and collects %s exactly once',recipe=>{
 const state=initialTopview(),definition=farmRecipes[recipe]
 state.simulation.unlockedAnimals=['cow','chicken','duck','sheep']
 state.objects.push({id:100,kind:definition.building,x:5,y:8})
 for(const item of definition.ingredients)state.simulation.inventory[item.good]=item.quantity*2
 const original=structuredClone(state)
 const started=simulateFarm(state,100,{type:'craft',recipe,quantity:2},0).state
 expect(state).toEqual(original)
 expect(started).not.toBe(state)
 const job=started.simulation.processingJobs[100]
 expect(job.quantity).toBe(2*recipeOutput(recipe))
 expect(simulateFarm(started,100,{type:'collectCraft'},job.readyAt-1).state).toBe(started)
 const completed=simulateFarm(started,100,{type:'collectCraft'},job.readyAt).state
 expect(completed.simulation.inventory[recipe]).toBe(state.simulation.inventory[recipe]+job.quantity)
 expect(simulateFarm(completed,100,{type:'collectCraft'},job.readyAt+1).state).toBe(completed)
 if(finishedFoods.some(id=>id===recipe)){
  const counter=completed.objects.find(o=>o.kind==='store')!
  const sold=simulateFarm(completed,counter.id,{type:'marketSell',good:recipe,quantity:job.quantity},job.readyAt).state
  expect(sold.gold).toBeGreaterThan(completed.gold)
  expect(sold.simulation.inventory[recipe]).toBe(state.simulation.inventory[recipe])
  expect(simulateFarm(sold,counter.id,{type:'marketSell',good:recipe,quantity:job.quantity},job.readyAt).state).toBe(sold)
 }
})

it.each(['wheatFAKE','wheat','notASeed'])('rejects malformed seed %s without changing balances',good=>{
 const state=initialTopview(),shop=state.objects.find(o=>o.kind==='seedShop')!
 expect(simulateFarm(state,shop.id,{type:'seed',good,quantity:1} as FarmSimAction,0).state).toBe(state)
})
it('rejects oversized or unsafe seed inventory additions',()=>{
 const state=initialTopview(),shop=state.objects.find(o=>o.kind==='seedShop')!
 state.simulation.inventory.wheatSeed=Number.MAX_SAFE_INTEGER
 expect(simulateFarm(state,shop.id,{type:'seed',good:'wheatSeed',quantity:1},0).state).toBe(state)
 const funded={...initialTopview(),gold:1000000}
 expect(simulateFarm(funded,shop.id,{type:'seed',good:'wheatSeed',quantity:1001},0).state).toBe(funded)
})

it('keeps every active final food profitable after recursive seed, feed and animal costs',()=>{
 const costs:Record<string,number>=Object.fromEntries(cropKinds.map(crop=>[crop,farmCrops[crop].seedPrice/farmCrops[crop].yield]))
 for(const [animal,details] of Object.entries(farmAnimals)){
  costs[details.product]=costs.wheat/2
  const recipe=butcherRecipes[animal as keyof typeof farmAnimals],cost=details.price/recipe.output
  costs[recipe.good]=Math.max(costs[recipe.good]??0,cost)
 }
 for(const product of millProducts){const recipe=millRecipes[product];costs[product]=costs[recipe.crop]*recipe.input/recipe.output}
 function inputCost(good:string,chain:string[]=[]):number{
  if(costs[good]!==undefined)return costs[good]
  expect(chain).not.toContain(good)
  const recipe=farmRecipes[good as keyof typeof farmRecipes]
  return costs[good]=recipe.ingredients.reduce((sum,item)=>sum+inputCost(item.good,[...chain,good])*item.quantity,0)/recipeOutput(good as keyof typeof farmRecipes)
 }
 for(const good of finishedFoods){
  const cost=inputCost(good)
  expect(Number.isFinite(cost)).toBe(true)
  expect(cost).toBeGreaterThanOrEqual(0)
  // Revenue must exceed the cash inputs, including the more expensive cow meat route.
  const counter=initialTopview(),id=counter.objects.find(o=>o.kind==='store')!.id
  counter.simulation.inventory[good]=1
  expect(simulateFarm(counter,id,{type:'marketSell',good,quantity:1},0).state.gold-counter.gold).toBeGreaterThan(cost)
 }
})

it('keeps repeated seed-to-food sales solvent without duplicating crops, food or gold',()=>{
 let state=initialTopview(),now=0
 const shop=state.objects.find(o=>o.kind==='seedShop')!.id,kitchen=state.objects.find(o=>o.kind==='kitchen')!.id,counter=state.objects.find(o=>o.kind==='store')!.id,plots=state.objects.filter(o=>o.kind==='plot')
 const initialGold=state.gold,initialWheat=state.simulation.inventory.wheat,initialSeeds=state.simulation.inventory.wheatSeed
 for(let cycle=0;cycle<24;cycle++){
  state=simulateFarm(state,shop,{type:'seed',good:'wheatSeed',quantity:4},now).state
  for(const plot of plots)state=simulateFarm(state,plot.id,{type:'plant',crop:'wheat'},now).state
  now+=farmCrops.wheat.growSeconds*1000
  for(const plot of plots)state=simulateFarm(state,plot.id,{type:'harvest'},now).state
  for(let batch=0;batch<2;batch++){
   state=simulateFarm(state,kitchen,{type:'craft',recipe:'wholeWheatPorridge',quantity:2},now).state
   now=state.simulation.processingJobs[kitchen].readyAt
   state=simulateFarm(state,kitchen,{type:'collectCraft'},now).state
   state=simulateFarm(state,counter,{type:'marketSell',good:'wholeWheatPorridge',quantity:2},now).state
  }
  expect(state.gold).toBe(initialGold+(cycle+1)*(4*40-4*farmCrops.wheat.seedPrice))
  expect(state.simulation.inventory.wheat).toBe(initialWheat)
  expect(state.simulation.inventory.wheatSeed).toBe(initialSeeds)
  expect(state.simulation.inventory.wholeWheatPorridge).toBe(0)
  expect(Object.keys(state.simulation.cropJobs)).toHaveLength(0)
  expect(Object.keys(state.simulation.processingJobs)).toHaveLength(0)
 }
})
