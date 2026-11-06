import {cleanup,render,screen,fireEvent} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {legacyTradeFixture as initialTopview} from './helpers/legacy-trade-fixture'
import {placementValid} from '@/features/farm/topview-model'
import {farmBuildingStorageError,simulateFarm} from '@/features/farm/farm-simulation'
import {canProduceOrderGood,dailyFarmOrders} from '@/features/farm/daily-orders'
import {cropKinds} from '@/features/farm/crop-catalog'
import {FarmProductionDialog} from '@/features/farm/production-dialog'

afterEach(cleanup)
it('rejects new pudding production and orders while allowing an existing job to finish once',()=>{
 const state=initialTopview()
 Object.assign(state.simulation.inventory,{rice:4,milk:4,strawberryJam:2})
 expect(simulateFarm(state,28,{type:'craft',recipe:'ricePudding',quantity:1},0).state).toBe(state)
 state.simulation.processingJobs[28]={recipe:'ricePudding',quantity:1,startedAt:0,readyAt:8000}
 const collected=simulateFarm(state,28,{type:'collectCraft'},8000).state
 expect(collected.simulation.inventory.ricePudding).toBe(1)
 expect(simulateFarm(collected,28,{type:'collectCraft'},8000).state).toBe(collected)
 for(let day=0;day<60;day++)expect(dailyFarmOrders(state.objects.find(o=>o.kind==='processed')!,Date.UTC(2026,10,6+day),state).some(o=>o.good==='ricePudding')).toBe(false)
})
it('requires the complete sauce and kitchen chain and never orders sauces as finished food',()=>{
 const state=initialTopview(),kitchen=state.objects.find(o=>o.kind==='kitchen')!,store=state.objects.find(o=>o.kind==='processed')!
 expect(placementValid(state,'kitchen',kitchen.x,kitchen.y,kitchen.id)).toBe(true)
 state.simulation.unlockedCrops=[...cropKinds]
 for(const food of ['tomatoKetchup','omurice'] as const)expect(canProduceOrderGood(state,food)).toBe(true)
 expect(canProduceOrderGood(state,'grilledRiceBall')).toBe(false)
 expect(canProduceOrderGood(state,'ricePudding')).toBe(false)
 state.objects=state.objects.filter(o=>o.kind!=='sauceWorkshop')
 for(const food of ['tomatoKetchup','ricePudding','grilledRiceBall','omurice'] as const)expect(canProduceOrderGood(state,food)).toBe(false)
 for(let day=0;day<30;day++)expect(dailyFarmOrders(store,Date.UTC(2026,10,6+day),state).some(o=>['tomatoKetchup','strawberryJam','ricePudding','grilledRiceBall','omurice'].includes(o.good))).toBe(false)
})
it('rejects the wrong facility and runs two sauce workshops independently without duplicate collection',()=>{
 let state=initialTopview();state.objects.push({id:80,kind:'sauceWorkshop',x:4,y:6})
 Object.assign(state.simulation.inventory,{tomato:8,sugar:4})
 expect(simulateFarm(state,28,{type:'craft',recipe:'tomatoKetchup',quantity:1},0).state).toBe(state)
 expect(simulateFarm(state,25,{type:'craft',recipe:'grilledRiceBall',quantity:1},0).state).toBe(state)
 for(const id of [29,80])state=simulateFarm(state,id,{type:'craft',recipe:'tomatoKetchup',quantity:2},0).state
 expect(state.simulation.inventory.tomato).toBe(0);expect(state.simulation.inventory.sugar).toBe(0)
 expect(farmBuildingStorageError(state,29)).not.toBeNull()
 state=simulateFarm(state,29,{type:'collectCraft'},8000).state
 expect(state.simulation.inventory.tomatoKetchup).toBe(2)
 expect(state.simulation.processingJobs[80]).toBeTruthy()
 expect(farmBuildingStorageError(state,29)).toBeNull()
 expect(simulateFarm(state,29,{type:'collectCraft'},8000).state).toBe(state)
})
it('shows only each facility recipes and resets a stale recipe selection when switching facilities',()=>{
 const state=initialTopview(),onAction=vi.fn(),props={state,message:'',onAction,onClose:()=>{},onResearch:()=>{}}
 Object.assign(state.simulation.inventory,{tomato:2,sugar:1})
 const view=render(<FarmProductionDialog {...props} object={state.objects.find(o=>o.kind==='sauceWorkshop')!}/>)
 fireEvent.click(screen.getByRole('button',{name:'토마토케첩 만들기'}))
 expect(onAction).toHaveBeenCalledWith({type:'craft',recipe:'tomatoKetchup',quantity:1})
 fireEvent.click(screen.getByRole('button',{name:'딸기잼 선택'}))
 view.rerender(<FarmProductionDialog {...props} object={state.objects.find(o=>o.kind==='advancedKitchen')!}/>)
 expect(screen.getByRole('button',{name:'오므라이스 선택'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'구운주먹밥 선택'})).toBeNull()
 expect(screen.queryByRole('button',{name:'딸기잼 선택'})).toBeNull()
 view.rerender(<FarmProductionDialog {...props} object={state.objects.find(o=>o.kind==='kitchen')!}/>)
 expect(screen.queryByRole('button',{name:'쌀푸딩 선택'})).toBeNull()
 expect(screen.getByRole('button',{name:'버터감자 선택'})).toBeTruthy()
 expect(screen.queryByRole('button',{name:'오므라이스 선택'})).toBeNull()
})
