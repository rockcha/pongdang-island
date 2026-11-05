import {expect,it} from 'vitest'
import {initialTopview,topviewItems} from '@/features/farm/topview-model'
import {dailyFarmOrders,farmOrderDay,farmOrderKey} from '@/features/farm/daily-orders'
import {farmAnimalHousing,farmBuildingStorageError,farmPlacementError,simulateFarm} from '@/features/farm/farm-simulation'
import {canProduceOrderGood} from '@/features/farm/daily-orders'
import {finishedFoods} from '@/features/farm/food-catalog'
import {cropKinds} from '@/features/farm/crop-catalog'
const now=Date.parse('2026-11-04T14:59:59Z')
it('requires the entire production chain before ordering a product and includes every new product after unlocking it',()=>{
 const state=initialTopview(),store=state.objects.find(object=>object.kind==='processed')!
 expect(canProduceOrderGood(state,'cornFlour')).toBe(false)
 expect(canProduceOrderGood(state,'cornBread')).toBe(false)
 expect(canProduceOrderGood(state,'cheese')).toBe(true)
 state.simulation.unlockedCrops=[...cropKinds]
 state.simulation.unlockedAnimals=['cow','chicken','duck','goat'];state.objects.push({id:100,kind:'duck',x:7,y:7},{id:101,kind:'goat',x:8,y:7})
 const seen=new Set<string>()
 for(let day=0;day<60;day++)for(const order of dailyFarmOrders(store,now+day*86400000,state))seen.add(order.good)
 for(const good of finishedFoods)expect(seen.has(good)).toBe(true)
 state.objects=state.objects.filter(object=>object.kind!=='mill')
 expect(canProduceOrderGood(state,'cornBread')).toBe(false)
 expect(canProduceOrderGood(state,'potatoBread')).toBe(false)
 state.objects=state.objects.filter(object=>!['cow','barn'].includes(object.kind))
 expect(canProduceOrderGood(state,'cheese')).toBe(false)
})
it('preserves delivered orders and their quantities when the production chain changes, then allows only eligible new orders',()=>{
 let state=initialTopview();state.simulation.unlockedCrops=[...cropKinds]
 const store=state.objects.find(object=>object.kind==='processed')!,order=dailyFarmOrders(store,now,state)[0]
 state.simulation.inventory[order.good]=order.quantity
 state=simulateFarm(state,store.id,{type:'sell',good:order.good,quantity:1,orderDay:farmOrderDay(now)},now).state
 state.objects=state.objects.filter(object=>!['bakery','dairy','mill'].includes(object.kind))
 expect(dailyFarmOrders(store,now,state)).toEqual([order])
 const finished=simulateFarm(state,store.id,{type:'sell',good:order.good,quantity:order.quantity-1,orderDay:farmOrderDay(now)},now)
 expect(finished.state).not.toBe(state)
 expect(dailyFarmOrders(store,now+86400000,finished.state)).toEqual([])
})
it('keeps five unique daily orders of 5–10 items per store, with Korean midnight rollover and separate building boards',()=>{
 const state=initialTopview();state.simulation.unlockedCrops=[...cropKinds];const store=state.objects.find(o=>o.kind==='store')!,other={...store,id:100}
 const orders=dailyFarmOrders(store,now,state)
 expect(orders).toHaveLength(5);expect(new Set(orders.map(o=>o.good)).size).toBe(5)
 for(const order of orders)expect(order.quantity>=5&&order.quantity<=10).toBe(true)
 expect(dailyFarmOrders(store,now-60000,state)).toEqual(orders)
 expect(dailyFarmOrders(other,now,state)).not.toEqual(orders)
 expect(farmOrderDay(now)).toBe('2026-11-04');expect(farmOrderDay(now+1000)).toBe('2026-11-05')
 expect(dailyFarmOrders(store,now+1000,state)).not.toEqual(orders)
})
it('tracks partial deliveries per board, rejects excess, missing and stale orders, and refreshes after midnight',()=>{
 const state=initialTopview(),store=state.objects.find(o=>o.kind==='store')!,order=dailyFarmOrders(store,now,state)[0],day=farmOrderDay(now)
 state.simulation.inventory[order.good]=100
 const first=simulateFarm(state,store.id,{type:'sell',good:order.good,quantity:2,orderDay:day},now).state
 expect(first.simulation.orderDeliveries[farmOrderKey(store,now)]?.[order.good]).toBe(2)
 expect(simulateFarm(first,store.id,{type:'sell',good:order.good,quantity:order.quantity,orderDay:day},now).state).toBe(first)
 const completed=simulateFarm(first,store.id,{type:'sell',good:order.good,quantity:order.quantity-2,orderDay:day},now).state
 expect(simulateFarm(completed,store.id,{type:'sell',good:order.good,quantity:1,orderDay:day},now).state).toBe(completed)
 expect(simulateFarm(first,store.id,{type:'sell',good:order.good,quantity:1,orderDay:day},now+1000).state).toBe(first)
 const tomorrow=dailyFarmOrders(store,now+1000,state)[0];first.simulation.inventory[tomorrow.good]=100
 expect(simulateFarm(first,store.id,{type:'sell',good:tomorrow.good,quantity:1,orderDay:farmOrderDay(now+1000)},now+1000).state).not.toBe(first)
})
it('preserves the daily board identity and delivery record when a store is stored and placed again',()=>{
 const state=initialTopview(),store=state.objects.find(o=>o.kind==='store')!,order=dailyFarmOrders(store,now,state)[0]
 state.simulation.inventory[order.good]=100
 const delivered=simulateFarm(state,store.id,{type:'sell',good:order.good,quantity:1,orderDay:farmOrderDay(now)},now).state
 const stored=simulateFarm(delivered,store.id,{type:'storeBuilding'},now).state
 const placed={...store,id:100,orderKey:stored.storedOrderKeys?.store?.[0]??undefined}
 expect(farmOrderKey(placed,now)).toBe(farmOrderKey(store,now))
 expect(dailyFarmOrders(placed,now,stored)).toEqual(dailyFarmOrders(store,now,state))
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
it('shares global slots across houses and expands them only through livestock office upgrades',()=>{
 const state=initialTopview();state.stored.push('chicken')
 expect(farmAnimalHousing(state,'chicken')).toMatchObject({total:3,capacity:4})
 const cow=simulateFarm(state,3,{type:'animal',animal:'cow'},now).state
 expect(farmAnimalHousing(cow,'cow')).toMatchObject({total:4,pending:1,capacity:4})
 expect(simulateFarm(cow,18,{type:'animal',animal:'chicken'},now).state).toBe(cow)
 expect(farmBuildingStorageError(cow,3)).not.toBeNull()
 const claimed=simulateFarm(cow,3,{type:'completeAnimalPurchase'},now+10000).state
 expect(farmAnimalHousing(claimed,'cow')).toMatchObject({stored:2,total:4,capacity:4})
 expect(farmPlacementError(claimed,'cow',{fromStorage:true})).toBeNull()
 const expanded={...claimed,objects:[...claimed.objects,{id:70,kind:'barn' as const,x:4,y:9}]}
 expect(farmAnimalHousing(expanded,'cow').capacity).toBe(4)
 expect(simulateFarm(expanded,70,{type:'animal',animal:'cow'},now+10000).state).toBe(expanded)
 const upgrading=simulateFarm(expanded,27,{type:'upgrade'},now+10000).state
 const complete=simulateFarm(upgrading,27,{type:'completeUpgrade'},now+20000).state
 expect(farmAnimalHousing(complete,'cow').capacity).toBe(6)
 expect(simulateFarm(complete,70,{type:'animal',animal:'cow'},now+20000).state).not.toBe(complete)
})
