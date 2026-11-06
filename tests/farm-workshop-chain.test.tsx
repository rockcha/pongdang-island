import {expect,it} from 'vitest'
import {existsSync} from 'node:fs'
import {initialTopview,topviewItems,placementValid} from '@/features/farm/topview-model'
import {farmRecipes,recipeIds,isFinishedFood,farmProducts} from '@/features/farm/food-catalog'
import {farmWorkshops} from '@/features/farm/workshop-catalog'
import {farmBuildingArtPath} from '@/features/farm/building-art'
import {simulateFarm,farmGoods} from '@/features/farm/farm-simulation'
import {buyFarmItem} from '@/features/farm/farm-stock'

it('registers every production facility with valid art, placeable footprint and independent purchased copies',()=>{
 const state=initialTopview();state.gold=100000
 for(const [kind,definition] of Object.entries(farmWorkshops)){
  const key=kind as keyof typeof farmWorkshops
  expect(topviewItems[key].name).toBe(definition.name);expect(existsSync('public'+farmBuildingArtPath(key))).toBe(true)
  expect(placementValid(state,key,5,12)).toBe(true)
 }
 for(const key of Object.keys(farmWorkshops) as (keyof typeof farmWorkshops)[]){
  const purchased=buyFarmItem(state,key,2)
  expect(purchased.gold).toBe(state.gold-farmWorkshops[key].price*2)
  expect(purchased.stored.filter(kind=>kind===key)).toHaveLength(2)
  expect(purchased.storedLevels?.[key]).toEqual([1,1])
 }
})
it('makes sauces and runs basic and intermediate kitchen jobs independently',()=>{
 let state=initialTopview()
 state.objects.push({id:29,kind:'sauceWorkshop',x:5,y:12},{id:30,kind:'advancedKitchen',x:5,y:14})
 for(const good of Object.keys(state.simulation.inventory))state.simulation.inventory[good as keyof typeof state.simulation.inventory]=0
 Object.assign(state.simulation.inventory,{tomato:6,strawberry:3,sugar:6,rice:4,milk:2,egg:3,butter:2,potato:3})
 state=simulateFarm(state,29,{type:'craft',recipe:'strawberryJam',quantity:1},0).state
 state=simulateFarm(state,29,{type:'collectCraft'},1800000).state
 state=simulateFarm(state,29,{type:'craft',recipe:'tomatoKetchup',quantity:2},1800000).state
 state=simulateFarm(state,29,{type:'collectCraft'},3000000).state
 expect(state.simulation.inventory.strawberryJam).toBe(1);expect(state.simulation.inventory.tomatoKetchup).toBe(2)
 expect(simulateFarm(state,28,{type:'craft',recipe:'omurice',quantity:1},3000000).state).toBe(state)
 state=simulateFarm(state,28,{type:'craft',recipe:'butterPotato',quantity:1},3000000).state
 state=simulateFarm(state,30,{type:'craft',recipe:'omurice',quantity:1},3000000).state
 expect(state.simulation.inventory.strawberryJam).toBe(1);expect(state.simulation.inventory.tomatoKetchup).toBe(0)
 expect(state.simulation.processingJobs[28]).toBeTruthy();expect(state.simulation.processingJobs[30]).toBeTruthy()
 state=simulateFarm(state,28,{type:'collectCraft'},4200000).state
 expect(simulateFarm(state,30,{type:'collectCraft'},4200000).state).toBe(state)
 state=simulateFarm(state,30,{type:'collectCraft'},5700000).state
 expect(state.simulation.inventory.butterPotato).toBe(1);expect(state.simulation.inventory.omurice).toBe(1)
 expect(simulateFarm(state,30,{type:'collectCraft'},5700000).state).toBe(state)
})
it('keeps recipe dependencies acyclic and reserves higher ingredient variety for the intermediate kitchen',()=>{
 const visiting=new Set<string>(),done=new Set<string>()
 const visit=(id:typeof recipeIds[number])=>{expect(visiting.has(id)).toBe(false);if(done.has(id))return;visiting.add(id);for(const ingredient of farmRecipes[id].ingredients)if(Object.hasOwn(farmRecipes,ingredient.good))visit(ingredient.good as typeof id);visiting.delete(id);done.add(id)}
 recipeIds.forEach(visit)
 expect(isFinishedFood('tomatoKetchup')).toBe(false);expect(isFinishedFood('strawberryJam')).toBe(false)
 for(const id of ['omurice'] as const){
  expect(farmRecipes[id].building).toBe('advancedKitchen');expect(farmRecipes[id].ingredients.length).toBeGreaterThan(farmRecipes.butterPotato.ingredients.length)
  expect(farmProducts[id].price).toBeGreaterThan(farmRecipes[id].ingredients.reduce((sum,item)=>sum+farmGoods[item.good].price*item.quantity,0))
 }
})
it('finishes an already started job even if its recipe has moved to a different facility',()=>{
 const state=initialTopview();state.simulation.processingJobs[28]={recipe:'tomatoKetchup',quantity:1,startedAt:0,readyAt:8000}
 const result=simulateFarm(state,28,{type:'collectCraft'},8000).state
 expect(result.simulation.inventory.tomatoKetchup).toBe(state.simulation.inventory.tomatoKetchup+1)
 expect(result.simulation.processingJobs[28]).toBeUndefined()
 expect(simulateFarm(result,28,{type:'collectCraft'},8000).state).toBe(result)
})
