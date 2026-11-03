import {expect,it} from 'vitest'
import {initialTopview,placementValid,topviewItems} from '@/features/farm/topview-model'
import {simulateFarm,farmGoods} from '@/features/farm/farm-simulation'
import {farmRecipes,recipeIds} from '@/features/farm/food-catalog'

const stocked=()=>{
 const state=initialTopview()
 Object.assign(state.simulation.inventory,{milk:10,egg:10,flour:20,butter:5,strawberry:10})
 return state
}
it('creates every recipe with exact ingredients, time, collection and processed-store proceeds',()=>{
 for(const id of recipeIds){
  const recipe=farmRecipes[id],start=stocked(),building=recipe.building==='dairy'?24:25
  const wrong=recipe.building==='dairy'?25:24
  expect(simulateFarm(start,wrong,{type:'craft',recipe:id,quantity:2},100).state).toBe(start)
  const started=simulateFarm(start,building,{type:'craft',recipe:id,quantity:2},100)
  expect(started.effect?.type).toBe('craft')
  expect(started.state.gold).toBe(start.gold)
  for(const item of recipe.ingredients)expect(started.state.simulation.inventory[item.good]).toBe(start.simulation.inventory[item.good]-item.quantity*2)
  expect(simulateFarm(started.state,building,{type:'craft',recipe:id,quantity:1},100).state).toBe(started.state)
  const ready=100+recipe.seconds*1000
  expect(recipe.seconds).toBeLessThanOrEqual(10)
  expect(simulateFarm(started.state,building,{type:'collectCraft'},ready-1).state).toBe(started.state)
  expect(simulateFarm(started.state,wrong,{type:'collectCraft'},ready).state).toBe(started.state)
  const finished=simulateFarm(started.state,building,{type:'collectCraft'},ready)
  expect(finished.state.simulation.inventory[id]).toBe(started.state.simulation.inventory[id]+2)
  expect(finished.effect?.type).toBe('crafted')
  expect(simulateFarm(finished.state,building,{type:'collectCraft'},ready).state).toBe(finished.state)
  expect(simulateFarm(finished.state,2,{type:'sell',good:id,quantity:2},ready).state).toBe(finished.state)
  const sold=simulateFarm(finished.state,22,{type:'sell',good:id,quantity:2},ready)
  expect(sold.state.gold).toBe(start.gold+farmGoods[id].price*2)
  const inputValue=recipe.ingredients.reduce((sum,item)=>sum+farmGoods[item.good].price*item.quantity,0)
  expect(farmGoods[id].price).toBeGreaterThan(inputValue)
 }
})
it('rejects invalid and insufficient batches without consuming any ingredients',()=>{
 const state=stocked()
 for(const quantity of [0,-1,1.5,100,Number.MAX_SAFE_INTEGER])expect(simulateFarm(state,24,{type:'craft',recipe:'butter',quantity},0).state).toBe(state)
 const missing=stocked();missing.simulation.inventory.egg=0
 const inventory={...missing.simulation.inventory}
 expect(simulateFarm(missing,25,{type:'craft',recipe:'cake',quantity:1},0).state).toBe(missing)
 expect(missing.simulation.inventory).toEqual(inventory)
})
it('runs workshops independently and makes cake from butter actually collected at the dairy',()=>{
 let state=stocked();state.simulation.inventory.butter=0
 state=simulateFarm(state,24,{type:'craft',recipe:'butter',quantity:1},0).state
 state=simulateFarm(state,25,{type:'craft',recipe:'eggCookies',quantity:1},0).state
 expect(Object.keys(state.simulation.processingJobs)).toHaveLength(2)
 state=simulateFarm(state,24,{type:'collectCraft'},4000).state
 state=simulateFarm(state,25,{type:'collectCraft'},5000).state
 expect(state.simulation.inventory.butter).toBe(1)
 state=simulateFarm(state,25,{type:'craft',recipe:'cake',quantity:1},5000).state
 expect(state.simulation.inventory.butter).toBe(0)
 expect(state.simulation.inventory.cake).toBe(0)
 state=simulateFarm(state,25,{type:'collectCraft'},15000).state
 expect(state.simulation.inventory.cake).toBe(1)
})
it('places the new compact buildings without overlapping the initial farm',()=>{
 const state=initialTopview()
 for(const object of state.objects)expect(placementValid(state,object.kind,object.x,object.y,object.id)).toBe(true)
 for(const object of state.objects.filter(o=>['dairy','bakery','processed'].includes(o.kind))){
  expect(topviewItems[object.kind].w).toBeLessThanOrEqual(2)
  expect(topviewItems[object.kind].h).toBeLessThanOrEqual(2)
  expect(placementValid(state,object.kind,object.x,object.y,object.id)).toBe(true)
 }
})
