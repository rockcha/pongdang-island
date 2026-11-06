import {expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {farmLimits,farmAnimalHousing,farmPlacementError,farmBuildingStorageError} from '@/features/farm/farm-simulation'
import {applyFarmCommand} from '@/features/farm/account-engine'

it('starts at four plots and two animals from the supplied management buildings',()=>{
 const state=initialTopview()
 expect(farmLimits(state)).toMatchObject({plots:4,usedPlots:4,animals:2,totalAnimals:0})
 expect(applyFarmCommand(state,{type:'clear',cells:[{x:6,y:8}]},0)).toBe(state)
 expect(farmBuildingStorageError(state,state.objects.find(o=>o.kind==='office')!.id)).toContain('밭 한도')
})
it('adds capacity only when another management building is complete',()=>{
 const state=initialTopview()
 state.objects.push({id:100,kind:'office',x:6,y:7,constructionReadyAt:1000},{id:101,kind:'livestockOffice',x:6,y:12,constructionReadyAt:1000})
 expect(farmLimits(state)).toMatchObject({plots:4,animals:2})
 delete state.objects.find(o=>o.id===100)!.constructionReadyAt
 delete state.objects.find(o=>o.id===101)!.constructionReadyAt
 expect(farmLimits(state)).toMatchObject({plots:8,animals:4})
 const cleared=applyFarmCommand(state,{type:'clear',cells:[{x:6,y:8}]},1000)
 expect(farmLimits(cleared)).toMatchObject({plots:8,usedPlots:5})
})
it('counts stored and preparing animals against the starting two slots',()=>{
 const state=initialTopview()
 state.objects.push({id:100,kind:'barn',x:6,y:7})
 state.stored=['cow'];state.simulation.animalPurchaseJobs[100]={animal:'sheep',startedAt:0,readyAt:1000}
 expect(farmAnimalHousing(state,'cow')).toMatchObject({capacity:2,total:2,hasHousing:true})
 expect(farmPlacementError(state,'cow')).toBeTruthy()
 expect(farmPlacementError(state,'cow',{fromStorage:true})).toBeNull()
})
