import {expect,it} from 'vitest'
import {initialTopview,topviewItems} from '@/features/farm/topview-model'
import {dailyFarmOrders,farmOrderDay,farmOrderKey} from '@/features/farm/daily-orders'
import {farmAnimalHousing,farmBuildingStorageError,farmPlacementError,simulateFarm} from '@/features/farm/farm-simulation'
const now=Date.parse('2026-11-04T14:59:59Z')
it('keeps five unique daily orders of 5–10 items per store, with Korean midnight rollover and separate building boards',()=>{
 const state=initialTopview(),store=state.objects.find(o=>o.kind==='store')!,other={...store,id:100}
 const orders=dailyFarmOrders(store,now)
 expect(orders).toHaveLength(5);expect(new Set(orders.map(o=>o.good)).size).toBe(5)
 for(const order of orders)expect(order.quantity>=5&&order.quantity<=10).toBe(true)
 expect(dailyFarmOrders(store,now-60000)).toEqual(orders)
 expect(dailyFarmOrders(other,now)).not.toEqual(orders)
 expect(farmOrderDay(now)).toBe('2026-11-04');expect(farmOrderDay(now+1000)).toBe('2026-11-05')
 expect(dailyFarmOrders(store,now+1000)).not.toEqual(orders)
})
it('tracks partial deliveries per board, rejects excess, missing and stale orders, and refreshes after midnight',()=>{
 const state=initialTopview(),store=state.objects.find(o=>o.kind==='store')!,order=dailyFarmOrders(store,now)[0],day=farmOrderDay(now)
 state.simulation.inventory[order.good]=100
 const first=simulateFarm(state,store.id,{type:'sell',good:order.good,quantity:2,orderDay:day},now).state
 expect(first.simulation.orderDeliveries[farmOrderKey(store,now)]?.[order.good]).toBe(2)
 expect(simulateFarm(first,store.id,{type:'sell',good:order.good,quantity:order.quantity,orderDay:day},now).state).toBe(first)
 const completed=simulateFarm(first,store.id,{type:'sell',good:order.good,quantity:order.quantity-2,orderDay:day},now).state
 expect(simulateFarm(completed,store.id,{type:'sell',good:order.good,quantity:1,orderDay:day},now).state).toBe(completed)
 expect(simulateFarm(first,store.id,{type:'sell',good:order.good,quantity:1,orderDay:day},now+1000).state).toBe(first)
 const tomorrow=dailyFarmOrders(store,now+1000)[0];first.simulation.inventory[tomorrow.good]=100
 expect(simulateFarm(first,store.id,{type:'sell',good:tomorrow.good,quantity:1,orderDay:farmOrderDay(now+1000)},now+1000).state).not.toBe(first)
})
it('preserves the daily board identity and delivery record when a store is stored and placed again',()=>{
 const state=initialTopview(),store=state.objects.find(o=>o.kind==='store')!,order=dailyFarmOrders(store,now)[0]
 state.simulation.inventory[order.good]=100
 const delivered=simulateFarm(state,store.id,{type:'sell',good:order.good,quantity:1,orderDay:farmOrderDay(now)},now).state
 const stored=simulateFarm(delivered,store.id,{type:'storeBuilding'},now).state
 const placed={...store,id:100,orderKey:stored.storedOrderKeys?.store?.[0]??undefined}
 expect(farmOrderKey(placed,now)).toBe(farmOrderKey(store,now))
 expect(dailyFarmOrders(placed,now)).toEqual(dailyFarmOrders(store,now))
 expect(stored.simulation.orderDeliveries[farmOrderKey(placed,now)]?.[order.good]).toBe(1)
})
it('runs two mills and two bakeries independently, with two identical products per building and no duplicate collection',()=>{
 let state=initialTopview();state.objects.push({id:50,kind:'mill',x:4,y:7},{id:51,kind:'bakery',x:7,y:7})
 Object.assign(state.simulation.inventory,{flour:10,egg:10})
 expect(simulateFarm(state,21,{type:'mill',quantity:3},now).state).toBe(state)
 expect(simulateFarm(state,25,{type:'craft',recipe:'eggCookies',quantity:3},now).state).toBe(state)
 for(const id of [21,50])state=simulateFarm(state,id,{type:'mill',quantity:2},now).state
 for(const id of [25,51])state=simulateFarm(state,id,{type:'craft',recipe:'eggCookies',quantity:2},now).state
 expect(Object.keys(state.simulation.millJobs)).toHaveLength(2);expect(Object.keys(state.simulation.processingJobs)).toHaveLength(2)
 state=simulateFarm(state,21,{type:'collectFlour'},now+10000).state
 expect(state.simulation.millJobs[50]).toBeTruthy();expect(state.simulation.millJobs[21]).toBeUndefined()
 expect(simulateFarm(state,21,{type:'collectFlour'},now+10000).state).toBe(state)
 expect(farmBuildingStorageError(state,21)).toBeNull();expect(farmBuildingStorageError(state,50)).not.toBeNull()
 expect('livestock' in topviewItems).toBe(false)
})
it('counts placed, stored and pending cows and chickens against their own houses, never borrowing the other species capacity',()=>{
 const state=initialTopview();state.stored.push('chicken')
 expect(farmAnimalHousing(state,'chicken')).toMatchObject({total:2,capacity:2})
 expect(simulateFarm(state,18,{type:'animal',animal:'chicken'},now).state).toBe(state)
 const cow=simulateFarm(state,3,{type:'animal',animal:'cow'},now).state
 expect(farmAnimalHousing(cow,'cow')).toMatchObject({total:2,pending:1,capacity:2})
 expect(farmBuildingStorageError(cow,3)).not.toBeNull()
 const claimed=simulateFarm(cow,3,{type:'completeAnimalPurchase'},now+10000).state
 expect(farmAnimalHousing(claimed,'cow')).toMatchObject({stored:1,total:2,capacity:2})
 expect(farmPlacementError(claimed,'cow',{fromStorage:true})).toBeNull()
 const expanded={...claimed,objects:[...claimed.objects,{id:70,kind:'barn' as const,x:4,y:7}]}
 expect(farmAnimalHousing(expanded,'cow').capacity).toBe(4)
 expect(simulateFarm(expanded,70,{type:'animal',animal:'cow'},now+10000).state).not.toBe(expanded)
})
