import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,farmStorageUsage,storedFarmQuantity,farmBuildingStorageError} from '@/features/farm/farm-simulation'
import {buildingCapacity,warehouseCapacity} from '@/features/farm/building-upgrades'
import {farmProductionTasks} from '@/features/farm/farm-overview-model'
import {FarmWarehouse} from '@/features/farm/warehouse'
import {FarmCapacitySummary} from '@/features/farm/capacity-summary'

afterEach(cleanup)
it('adds quantities across categories, keeps seeds separate, and grows by thirty per warehouse level',()=>{
 const state=initialTopview(),warehouse=state.objects.find(o=>o.kind==='warehouse')!
 Object.assign(state.simulation.inventory,{wheat:10,milk:5,flour:3,wool:2,wheatSeed:99})
 expect(storedFarmQuantity(state.simulation.inventory)).toBe(20)
 for(let level=1;level<=10;level++)expect(buildingCapacity({...warehouse,level})).toBe(30*level)
 const upgraded=simulateFarm(simulateFarm(state,26,{type:'upgrade'},0).state,26,{type:'completeUpgrade'},10000).state
 expect(warehouseCapacity(upgraded)).toBe(60)
 render(<><FarmWarehouse simulation={state.simulation} state={state} object={warehouse} onClose={()=>{}}/><FarmCapacitySummary state={state}/></>)
 expect(screen.getByText('20 / 30개')).toBeTruthy()
 expect(screen.getByLabelText(/^창고 20 \/ 30 ·/)).toBeTruthy()
})
it('keeps a two-item completed batch at its producer until both items fit, even for an existing stack',()=>{
 const state=initialTopview();Object.assign(state.simulation.inventory,{wheat:28,flour:1})
 state.simulation.millJobs[21]={product:'flour',quantity:2,startedAt:0,readyAt:10000}
 expect(farmProductionTasks(state,10000).find(t=>t.objectId===21)?.status).toBe('blocked')
 expect(simulateFarm(state,21,{type:'collectFlour'},10000).state).toBe(state)
 expect(state.simulation.millJobs[21]).toBeTruthy()
 state.simulation.inventory.wheat=27
 const received=simulateFarm(state,21,{type:'collectFlour'},10000).state
 expect(received.simulation.inventory.flour).toBe(3);expect(farmStorageUsage(received.simulation)).toBe(30)
 expect(simulateFarm(received,21,{type:'collectFlour'},10000).state).toBe(received)
})
it('reserves all three crops before concurrent harvest and counts the reservation once on collection',()=>{
 let state=initialTopview();state.simulation.inventory.wheat=27
 state.simulation.cropJobs={10:{crop:'wheat',readyAt:0},11:{crop:'potato',readyAt:0}}
 state.simulation.animalJobs[4]=0
 state=simulateFarm(state,10,{type:'beginHarvest'},1).state
 expect(farmStorageUsage(state.simulation)).toBe(30)
 expect(simulateFarm(state,11,{type:'beginHarvest'},1).state).toBe(state)
 expect(simulateFarm(state,4,{type:'collectAnimal'},1).state).toBe(state)
 expect(farmProductionTasks(state,3001).find(t=>t.objectId===10)?.status).toBe('ready')
 const received=simulateFarm(state,10,{type:'harvest'},3001).state
 expect(received.simulation.inventory.wheat).toBe(30);expect(farmStorageUsage(received.simulation)).toBe(30)
})
it('prevents recovering a warehouse when the remaining capacity cannot hold quantities and reserved harvests',()=>{
 const state=initialTopview();state.objects.push({id:80,kind:'warehouse',x:4,y:6})
 state.simulation.inventory.wheat=28;state.simulation.cropJobs[10]={crop:'potato',readyAt:0,harvestingAt:0}
 expect(farmStorageUsage(state.simulation)).toBe(31)
 expect(farmBuildingStorageError(state,26)).not.toBeNull()
 expect(simulateFarm(state,26,{type:'storeBuilding'},0).state).toBe(state)
 state.simulation.inventory.wheat=27
 expect(farmBuildingStorageError(state,26)).toBeNull()
})
