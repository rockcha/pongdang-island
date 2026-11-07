import {expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,cropIsRotten,CROP_FRESH_MS,farmBuildingStorageError} from '@/features/farm/farm-simulation'
import {farmCrops} from '@/features/farm/crop-catalog'
import {farmAnimals} from '@/features/farm/animal-catalog'
import {farmProducts,farmRecipes,finishedFoods,recipeIds,millRecipes} from '@/features/farm/food-catalog'
import {warehouseCapacity} from '@/features/farm/building-upgrades'
import {farmProductionTasks} from '@/features/farm/farm-overview-model'
import {resellFarmObject} from '@/features/farm/resale'

it.each([['corn',3600],['paddy',3600],['sweetPotato',5400],['sugarcane',7200],['tomato',10800],['strawberry',14400]] as const)('unlocks %s only after the full research time', (crop,seconds)=>{
 const state=initialTopview();state.objects.push({id:100,kind:'lab',x:5,y:8})
 const started=simulateFarm(state,100,{type:'research',crop},0).state
 expect(started.simulation.researchJobs?.[100]?.readyAt).toBe(seconds*1000)
 expect(simulateFarm(started,100,{type:'completeResearch'},seconds*1000-1).state).toBe(started)
 expect(simulateFarm(started,100,{type:'completeResearch'},seconds*1000).state.simulation.unlockedCrops).toContain(crop)
})

it('keeps the proposed price and time bounds, starter crops and warehouse',()=>{
 const state=initialTopview()
 expect(state.simulation.unlockedCrops).toEqual(['wheat','carrot','potato'])
 expect(warehouseCapacity(state)).toBe(120)
 for(const id of finishedFoods)expect(farmProducts[id].price).toBeGreaterThan(0)
 expect(Math.max(...finishedFoods.map(id=>farmProducts[id].price))).toBe(1340)
 for(const id of recipeIds){expect(farmRecipes[id].seconds).toBeGreaterThanOrEqual(600);expect(farmRecipes[id].seconds).toBeLessThanOrEqual('household' in farmRecipes[id]?10800:3600)}
 for(const r of Object.values(millRecipes))expect(r.seconds).toBeGreaterThanOrEqual(600)
 for(const a of Object.values(farmAnimals)){expect(a.seconds).toBeGreaterThanOrEqual(600);expect(a.seconds).toBeLessThanOrEqual(3600)}
 expect(farmCrops.strawberry).toMatchObject({growSeconds:14400,yield:12,seedPrice:72})
})
it('harvests the larger crop yield and gives a full day to collect after ripening',()=>{
 const state=initialTopview();state.simulation.inventory.carrotSeed=1
 const planted=simulateFarm(state,10,{type:'plant',crop:'carrot'},0).state
 const ready=farmCrops.carrot.growSeconds*1000,job=planted.simulation.cropJobs[10]
 expect(simulateFarm(planted,10,{type:'harvest'},ready-1).state).toBe(planted)
 expect(cropIsRotten(job,ready+CROP_FRESH_MS-1)).toBe(false)
 expect(cropIsRotten(job,ready+CROP_FRESH_MS)).toBe(true)
 expect(simulateFarm(planted,10,{type:'harvest'},ready).state.simulation.inventory.carrot).toBe(4)
})
it.each(['startAnimal','feed'] as const)('%s requires wheat and produces two goods once',type=>{
 const state=initialTopview();state.objects.push({id:100,kind:'chicken',x:5,y:8})
 state.simulation.inventory.wheat=0
 expect(simulateFarm(state,100,{type},0).state).toBe(state)
 state.simulation.inventory.wheat=1
 const start=simulateFarm(state,100,{type},0).state
 expect(start.simulation.inventory.wheat).toBe(0)
 expect(start.simulation.animalJobs[100]).toBe(1200000)
 expect(simulateFarm(start,100,{type},1).state).toBe(start)
 expect(simulateFarm(start,100,{type:'collectAnimal'},1199999).state).toBe(start)
 const full={...start,simulation:{...start.simulation,inventory:{...start.simulation.inventory,wheat:120}}}
 expect(simulateFarm(full,100,{type:'collectAnimal'},1200000).state).toBe(full)
 const done=simulateFarm(start,100,{type:'collectAnimal'},1200000).state
 expect(done.simulation.inventory.egg).toBe(2)
 expect(simulateFarm(done,100,{type:'collectAnimal'},1200001).state).toBe(done)
})
it('reserves all three cooking batches and their time, with no early or repeated collection',()=>{
 const state=initialTopview(),id=state.objects.find(o=>o.kind==='kitchen')!.id
 state.objects.find(o=>o.id===id)!.level=3
 state.simulation.inventory.wheat=18
 const action={type:'craft' as const,recipe:'wholeWheatPorridge' as const,quantity:6}
 expect(simulateFarm(state,id,{...action,quantity:7},0).state).toBe(state)
 expect(simulateFarm({...state,simulation:{...state.simulation,inventory:{...state.simulation.inventory,wheat:17}}},id,action,0).state.simulation.processingJobs[id]).toBeUndefined()
 const start=simulateFarm(state,id,action,0).state
 expect(start.simulation.inventory.wheat).toBe(0)
 expect(start.simulation.processingJobs[id]).toMatchObject({quantity:6,readyAt:1800000})
 expect(simulateFarm(start,id,{type:'collectCraft'},1799999).state).toBe(start)
 const done=simulateFarm(start,id,{type:'collectCraft'},1800000).state
 expect(done.simulation.inventory.wholeWheatPorridge).toBe(6)
 expect(simulateFarm(done,id,{type:'collectCraft'},1800001).state).toBe(done)
})
it('reserves milling ingredients and multiplies duration for consecutive batches',()=>{
 const state=initialTopview();state.objects.push({id:100,kind:'mill',x:5,y:8,level:3});state.simulation.inventory.wheat=18
 const start=simulateFarm(state,100,{type:'mill',product:'flour',quantity:6},0).state
 expect(start.simulation.inventory.wheat).toBe(0)
 expect(start.simulation.millJobs[100]).toMatchObject({quantity:6,readyAt:1800000})
 expect(simulateFarm(start,100,{type:'collectFlour'},1799999).state).toBe(start)
 expect(simulateFarm(start,100,{type:'collectFlour'},1800000).state.simulation.inventory.flour).toBe(6)
})
it('consumes stored animals at start and safely collects meat after processing',()=>{
 const state=initialTopview();state.objects.push({id:100,kind:'butcher',x:5,y:8});state.stored=['chicken','chicken']
 const start=simulateFarm(state,100,{type:'butcher',animal:'chicken',quantity:2},0).state
 expect(start.stored).toHaveLength(0)
 expect(start.simulation.inventory.chickenMeat).toBe(0)
 expect(start.simulation.butcherJobs?.[100]).toMatchObject({quantity:12,readyAt:120000})
 expect(farmProductionTasks(start,0).find(t=>t.objectId===100)).toMatchObject({status:'working',quantity:12})
 expect(farmBuildingStorageError(start,100)).toBeTruthy()
 expect(resellFarmObject(start,100).state).toBe(start)
 expect(simulateFarm(start,100,{type:'collectMeat'},119999).state).toBe(start)
 const full={...start,simulation:{...start.simulation,inventory:{...start.simulation.inventory,wheat:120}}}
 expect(simulateFarm(full,100,{type:'collectMeat'},120000).state).toBe(full)
 const done=simulateFarm(start,100,{type:'collectMeat'},120000).state
 expect(done.simulation.inventory.chickenMeat).toBe(12)
 expect(simulateFarm(done,100,{type:'collectMeat'},120001).state).toBe(done)
})
