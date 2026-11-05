import {cleanup,render,screen,fireEvent} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {initialTopview,placementValid} from '@/features/farm/topview-model'
import {farmBuildingStorageError,simulateFarm} from '@/features/farm/farm-simulation'
import {canProduceOrderGood,dailyFarmOrders} from '@/features/farm/daily-orders'
import {cropKinds} from '@/features/farm/crop-catalog'
import {FarmProductionDialog} from '@/features/farm/production-dialog'

afterEach(cleanup)
it('places the kitchen on free land and requires it for kitchen orders',()=>{
 const state=initialTopview(),kitchen=state.objects.find(o=>o.kind==='kitchen')!,store=state.objects.find(o=>o.kind==='processed')!
 expect(placementValid(state,'kitchen',kitchen.x,kitchen.y,kitchen.id)).toBe(true)
 state.simulation.unlockedCrops=[...cropKinds]
 for(const food of ['tomatoKetchup','ricePudding','grilledRiceBall'] as const)expect(canProduceOrderGood(state,food)).toBe(true)
 state.objects=state.objects.filter(o=>o.kind!=='kitchen')
 for(const food of ['tomatoKetchup','ricePudding','grilledRiceBall'] as const)expect(canProduceOrderGood(state,food)).toBe(false)
 for(let day=0;day<30;day++)expect(dailyFarmOrders(store,Date.UTC(2026,10,6+day),state).some(o=>['tomatoKetchup','ricePudding','grilledRiceBall'].includes(o.good))).toBe(false)
})
it('rejects the previous buildings and runs two kitchens independently without duplicate collection',()=>{
 let state=initialTopview();state.objects.push({id:80,kind:'kitchen',x:4,y:6})
 Object.assign(state.simulation.inventory,{tomato:8,sugar:4,rice:4,milk:4,egg:2,cheese:2,tomatoKetchup:2})
 expect(simulateFarm(state,24,{type:'craft',recipe:'ricePudding',quantity:1},0).state).toBe(state)
 expect(simulateFarm(state,25,{type:'craft',recipe:'grilledRiceBall',quantity:1},0).state).toBe(state)
 for(const id of [28,80])state=simulateFarm(state,id,{type:'craft',recipe:'tomatoKetchup',quantity:2},0).state
 expect(state.simulation.inventory.tomato).toBe(0);expect(state.simulation.inventory.sugar).toBe(0)
 expect(farmBuildingStorageError(state,28)).not.toBeNull()
 state=simulateFarm(state,28,{type:'collectCraft'},8000).state
 expect(state.simulation.inventory.tomatoKetchup).toBe(4)
 expect(state.simulation.processingJobs[80]).toBeTruthy()
 expect(farmBuildingStorageError(state,28)).toBeNull()
 expect(simulateFarm(state,28,{type:'collectCraft'},8000).state).toBe(state)
})
it('shows the three dishes together in the kitchen and submits cooking with tomatoes and sugar',()=>{
 const state=initialTopview(),object=state.objects.find(o=>o.kind==='kitchen')!,onAction=vi.fn()
 Object.assign(state.simulation.inventory,{tomato:2,sugar:1})
 render(<FarmProductionDialog object={object} state={state} message="" onAction={onAction} onClose={()=>{}} onResearch={()=>{}}/>)
 expect(screen.getByRole('dialog',{name:'작은 주방'})).toBeTruthy()
 for(const name of ['토마토케첩 선택','쌀푸딩 선택','구운주먹밥 선택'])expect(screen.getByRole('button',{name})).toBeTruthy()
 expect(screen.queryByRole('tab')).toBeNull()
 fireEvent.click(screen.getByRole('button',{name:'토마토케첩 만들기'}))
 expect(onAction).toHaveBeenCalledWith({type:'craft',recipe:'tomatoKetchup',quantity:1})
})
