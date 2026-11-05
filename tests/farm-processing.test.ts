import {expect,it} from 'vitest'
import {initialTopview,placementValid,topviewItems} from '@/features/farm/topview-model'
import {simulateFarm,farmGoods} from '@/features/farm/farm-simulation'
import {farmRecipes,recipeIds,recipeOutput,millProducts,millRecipes} from '@/features/farm/food-catalog'

const stocked=()=>{
 const state=initialTopview();state.objects.find(object=>object.kind==='warehouse')!.level=2
 state.simulation.unlockedAnimals=['cow','chicken','duck','goat']
 Object.assign(state.simulation.inventory,{tomato:10,tomatoKetchup:10,rice:20,cheese:10,carrot:10,sugar:20,sugarcane:20,goatMilk:10,duckEgg:10,milk:10,egg:10,flour:20,butter:5,strawberry:10,cornFlour:10,potato:10,sweetPotato:10,cream:10})
 return state
}
it.each(millProducts)('reserves multiple raw crops for %s and collects the batch once',product=>{
 const state=initialTopview(),recipe=millRecipes[product]
 state.simulation.unlockedCrops.push(recipe.crop)
 state.simulation.inventory[recipe.crop]=recipe.input-1
 const action={type:'mill',product,quantity:1} as const
 expect(simulateFarm(state,21,action,0).state).toBe(state)
 state.simulation.inventory[recipe.crop]=recipe.input
 const started=simulateFarm(state,21,action,0).state
 expect(started.simulation.inventory[recipe.crop]).toBe(0)
 expect(simulateFarm(started,21,{type:'collectFlour'},recipe.seconds*1000-1).state).toBe(started)
 const collected=simulateFarm(started,21,{type:'collectFlour'},recipe.seconds*1000)
 expect(collected.state.simulation.inventory[product]).toBe(recipe.output)
 expect(collected.effect).toMatchObject({good:product,quantity:recipe.output})
 expect(simulateFarm(collected.state,21,{type:'collectFlour'},recipe.seconds*1000).state).toBe(collected.state)
 expect(farmGoods[product].price*recipe.output).toBeGreaterThan(farmGoods[recipe.crop].price*recipe.input)
})
it('requires more than one livestock product for every dairy recipe without consuming insufficient stock',()=>{
 for(const id of recipeIds.filter(id=>farmRecipes[id].building==='dairy')){
  const state=stocked(),recipe=farmRecipes[id],animalIngredient=recipe.ingredients.find(item=>item.good==='milk'||item.good==='goatMilk')!
  expect(animalIngredient.quantity).toBeGreaterThan(1)
  state.simulation.inventory[animalIngredient.good]=1
  const before={...state.simulation.inventory}
  expect(simulateFarm(state,24,{type:'craft',recipe:id,quantity:1},0).state).toBe(state)
  expect(state.simulation.inventory).toEqual(before)
 }
})
it('creates every recipe with exact ingredients, time, collection and product values',()=>{
 for(const id of recipeIds){
  const recipe=farmRecipes[id],start=stocked(),building=start.objects.find(object=>object.kind===recipe.building)!.id,quantity=2/recipeOutput(id)
  const wrong=recipe.building==='dairy'?25:24
  expect(simulateFarm(start,wrong,{type:'craft',recipe:id,quantity},100).state).toBe(start)
  const started=simulateFarm(start,building,{type:'craft',recipe:id,quantity},100)
  expect(started.effect?.type).toBe('craft')
  expect(started.state.gold).toBe(start.gold)
  for(const item of recipe.ingredients)expect(started.state.simulation.inventory[item.good]).toBe(start.simulation.inventory[item.good]-item.quantity*quantity)
  expect(simulateFarm(started.state,building,{type:'craft',recipe:id,quantity:1},100).state).toBe(started.state)
  const ready=100+recipe.seconds*1000
  expect(recipe.seconds).toBeLessThanOrEqual(10)
  expect(simulateFarm(started.state,building,{type:'collectCraft'},ready-1).state).toBe(started.state)
  expect(simulateFarm(started.state,wrong,{type:'collectCraft'},ready).state).toBe(started.state)
  const finished=simulateFarm(started.state,building,{type:'collectCraft'},ready)
  expect(finished.state.simulation.inventory[id]).toBe(started.state.simulation.inventory[id]+2)
  expect(finished.effect?.type).toBe('crafted')
  expect(simulateFarm(finished.state,building,{type:'collectCraft'},ready).state).toBe(finished.state)
  const inputValue=recipe.ingredients.reduce((sum,item)=>sum+farmGoods[item.good].price*item.quantity,0)
  expect(farmGoods[id].price*recipeOutput(id)).toBeGreaterThan(inputValue)
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
it('mills unlocked corn into corn flour and uses the collected flour in cornbread',()=>{
 let state=initialTopview();Object.assign(state.simulation.inventory,{corn:4,flour:1,milk:2})
 const request={type:'mill',quantity:2,product:'cornFlour'} as const
 expect(simulateFarm(state,21,request,0).state).toBe(state)
 state.simulation.unlockedCrops.push('corn')
 state=simulateFarm(state,21,request,0).state
 expect(state.simulation.inventory.corn).toBe(0);expect(state.simulation.millJobs[21].product).toBe('cornFlour')
 expect(simulateFarm(state,21,{type:'collectFlour'},9999).state).toBe(state)
 state=simulateFarm(state,21,{type:'collectFlour'},10000).state
 expect(state.simulation.inventory.cornFlour).toBe(2);expect(state.simulation.inventory.flour).toBe(1)
 expect(simulateFarm(state,21,{type:'collectFlour'},10000).state).toBe(state)
 state=simulateFarm(state,25,{type:'craft',recipe:'cornBread',quantity:1},10000).state
 expect(state.simulation.inventory.cornFlour).toBe(1)
 state=simulateFarm(state,25,{type:'collectCraft'},17000).state
 expect(state.simulation.inventory.cornBread).toBe(1)
})
it('runs workshops independently and makes cake from cream actually collected at the dairy',()=>{
 let state=stocked();state.simulation.inventory.cream=0
 state=simulateFarm(state,24,{type:'craft',recipe:'cream',quantity:1},0).state
 state=simulateFarm(state,25,{type:'craft',recipe:'eggCookies',quantity:1},0).state
 expect(Object.keys(state.simulation.processingJobs)).toHaveLength(2)
 state=simulateFarm(state,24,{type:'collectCraft'},4000).state
 state=simulateFarm(state,25,{type:'collectCraft'},5000).state
 expect(state.simulation.inventory.cream).toBe(1)
 state=simulateFarm(state,25,{type:'craft',recipe:'cake',quantity:1},5000).state
 expect(state.simulation.inventory.cream).toBe(0)
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
