import {afterEach,expect,it} from 'vitest'
import {cleanup,render,screen} from '@testing-library/react'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm,canStoreFarmGoods,farmStorageUsage,type FarmSimAction} from '@/features/farm/farm-simulation'
import {warehouseAvailable,warehouseCapacity} from '@/features/farm/building-upgrades'
import {FarmWarehouse} from '@/features/farm/warehouse'

afterEach(cleanup)
function expanding(){
 const state=initialTopview(),warehouse=state.objects.find(o=>o.kind==='warehouse')!
 warehouse.level=2
 state.objects.push({id:100,kind:'mill',x:2,y:2},{id:101,kind:'kitchen',x:4,y:2},{id:102,kind:'cow',x:6,y:2})
 state.simulation.inventory.wheat=12
 return simulateFarm(state,warehouse.id,{type:'upgrade'},0).state
}
it('retains the completed capacity until expansion finishes and restores it on cancellation',()=>{
 const state=expanding(),id=state.objects.find(o=>o.kind==='warehouse')!.id
 expect(warehouseAvailable(state)).toBe(true)
 expect(warehouseCapacity(state)).toBe(60)
 expect(warehouseCapacity(simulateFarm(state,id,{type:'completeUpgrade'},299999).state)).toBe(60)
 expect(warehouseCapacity(simulateFarm(state,id,{type:'completeUpgrade'},300000).state)).toBe(80)
 expect(warehouseCapacity(simulateFarm(state,id,{type:'cancelUpgrade'},1).state)).toBe(60)
})
it.each<[number,FarmSimAction]>([
 [100,{type:'mill',quantity:1}],
 [101,{type:'craft',recipe:'wholeWheatPorridge',quantity:1}],
 [102,{type:'startAnimal'}],
])('starts production at facility %s during warehouse expansion',(id,action)=>{
 const state=expanding();state.simulation.inventory.wheat=60
 const result=simulateFarm(state,id,action,1)
 expect(result.state).not.toBe(state)
 expect(result.state.simulation.inventory.wheat).toBeLessThan(60)
})
function ready(){
 const state=expanding()
 state.simulation.inventory.wheat=58
 state.simulation.millJobs[100]={product:'flour',quantity:2,startedAt:0,readyAt:1}
 state.simulation.processingJobs[101]={recipe:'wholeWheatPorridge',quantity:2,startedAt:0,readyAt:1}
 state.simulation.animalJobs[102]=1
 return state
}
it.each<[number,FarmSimAction]>([
 [100,{type:'collectFlour'}],[101,{type:'collectCraft'}],[102,{type:'collectAnimal'}],
])('receives into the old capacity and preserves ready output when full at facility %s',(id,action)=>{
 const state=ready(),received=simulateFarm(state,id,action,2).state
 expect(received).not.toBe(state)
 expect(farmStorageUsage(received.simulation)).toBe(60)
 const full=ready();full.simulation.inventory.wheat=59
 const blocked=simulateFarm(full,id,action,2)
 expect(blocked.state).toBe(full)
 expect(blocked.message).toContain('창고 용량 60개')
 full.simulation.inventory.wheat=58
 expect(simulateFarm(full,id,action,2).state).not.toBe(full)
})
it('counts harvest reservations and excludes unbuilt warehouses',()=>{
 const state=expanding(),plot=state.objects.find(o=>o.kind==='plot')!
 state.simulation.inventory.wheat=57
 state.simulation.cropJobs[plot.id]={crop:'wheat',readyAt:0,harvestingAt:1}
 expect(canStoreFarmGoods(state,[{good:'milk',quantity:1}])).toBe(false)
 const id=state.objects.find(o=>o.kind==='warehouse')!.id
 expect(warehouseAvailable({...state,objects:state.objects.filter(o=>o.id!==id)})).toBe(false)
 expect(warehouseAvailable({...state,objects:state.objects.map(o=>o.id===id?{...o,constructionReadyAt:999}:o)})).toBe(false)
})
it('harvests up to the old capacity and rejects another harvest without losing the crop',()=>{
 const state=expanding(),plots=state.objects.filter(o=>o.kind==='plot')
 state.simulation.inventory.wheat=57
 for(const plot of plots)state.simulation.cropJobs[plot.id]={crop:'wheat',readyAt:0}
 const reserved=simulateFarm(state,plots[0].id,{type:'beginHarvest'},1).state
 expect(reserved).not.toBe(state)
 expect(farmStorageUsage(reserved.simulation)).toBe(60)
 expect(simulateFarm(reserved,plots[1].id,{type:'beginHarvest'},1).state).toBe(reserved)
 const collected=simulateFarm(reserved,plots[0].id,{type:'harvest'},3001).state
 expect(collected.simulation.inventory.wheat).toBe(60)
 expect(collected.simulation.cropJobs[plots[1].id]).toBeDefined()
})
it('keeps inventory and capacity visible during expansion',()=>{
 const state=expanding(),object=state.objects.find(o=>o.kind==='warehouse')!
 render(<FarmWarehouse simulation={state.simulation} state={state} object={object} now={1} onAction={()=>{}} onClose={()=>{}}/>)
 expect(screen.getByText('기존 용량 60개까지 계속 이용할 수 있어요.')).toBeTruthy()
 expect(document.querySelector('.farm-warehouse-grid')?.textContent).toContain('×12')
 expect(screen.getByText('12 / 60개 · 확장 중')).toBeTruthy()
 expect(screen.queryByText('완료될 때까지 건물 기능을 사용할 수 없어요.')).toBeNull()
})
it('continues deliveries while the warehouse expands',()=>{
 const state=expanding(),store=state.objects.find(o=>o.kind==='store')!
 state.simulation.inventory.wholeWheatPorridge=2
 const sold=simulateFarm(state,store.id,{type:'marketSell',good:'wholeWheatPorridge',quantity:1},1).state
 expect(sold).not.toBe(state)
 expect(sold.simulation.inventory.wholeWheatPorridge).toBe(1)
 expect(sold.gold).toBeGreaterThan(state.gold)
})
