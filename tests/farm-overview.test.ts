import {expect,it} from 'vitest'
import {farmOverview,farmProductionTasks} from '@/features/farm/farm-overview-model'
import {developedFarmFixture} from './helpers/developed-farm-fixture'
import {CROP_FRESH_MS,farmStorageUsage} from '@/features/farm/farm-simulation'
import {warehouseCapacity} from '@/features/farm/building-upgrades'
import {dailyFarmOrders,farmOrderKey} from '@/features/farm/daily-orders'
import {farmRecipes} from '@/features/farm/food-catalog'
import type {FarmTool} from '@/features/farm/topview-model'

function initialTopview(){
 const state=developedFarmFixture()
 state.objects.push({id:20,kind:'lab',x:4,y:4},{id:22,kind:'processed',x:12,y:13},{id:25,kind:'mediumBakery',x:4,y:5})
 for(const [i,kind] of [...new Set(Object.values(farmRecipes).map(recipe=>recipe.building))].entries())if(!state.objects.some(o=>o.kind===kind))state.objects.push({id:1000+i,kind,x:4,y:4})
 return state
}
const now=Date.parse('2026-11-04T14:59:59Z')
it('aggregates independent facilities and sorts ready work ahead of work in progress without changing farm state',()=>{
 const state=initialTopview()
 state.objects.push({id:50,kind:'mill',x:4,y:7},{id:51,kind:'warehouse',x:6,y:7})
 state.simulation.millJobs={21:{quantity:2,startedAt:now-10000,readyAt:now},50:{quantity:1,startedAt:now,readyAt:now+10000}}
 state.simulation.animalJobs[4]=now+5000
 state.simulation.processingJobs[25]={recipe:'cake',quantity:2,startedAt:now-10000,readyAt:now}
 state.simulation.researchJob={crop:'potato',labId:20,startedAt:now,readyAt:now+3000}
 state.simulation.animalPurchaseJobs[18]={animal:'chicken',startedAt:now,readyAt:now+10000}
 state.simulation.upgradeJobs[26]={startedAt:now,readyAt:now+10000,fromLevel:1}
 const before=JSON.stringify(state),overview=farmOverview(state,now)
 expect(overview).toMatchObject({ready:2,working:5,attention:0})
 expect(overview.tasks.slice(0,2).map(task=>task.objectId)).toEqual([21,25])
 expect(overview.tasks.find(task=>task.objectId===50)).toMatchObject({good:'flour',quantity:1,status:'working'})
 expect(farmOverview(state,now+10000).working).toBe(0)
 expect(JSON.stringify(state)).toBe(before)
})
it('distinguishes mature, rotten and already harvesting crops and ignores jobs for absent facilities',()=>{
 const state=initialTopview()
 state.simulation.cropJobs={10:{crop:'wheat',readyAt:now},11:{crop:'potato',readyAt:now-CROP_FRESH_MS},12:{crop:'carrot',readyAt:now-CROP_FRESH_MS,harvestingAt:now},99:{crop:'corn',readyAt:now}}
 expect(farmOverview(state,now)).toMatchObject({ready:1,attention:1,working:1})
 expect(farmProductionTasks(state,now).find(task=>task.objectId===12)).toMatchObject({status:'working',readyAt:now+3000})
 expect(farmProductionTasks(state,now+3000).find(task=>task.objectId===12)?.status).toBe('ready')
})
it('computes remaining orders and shortages per store from partial deliveries and current stock, and rolls over at Korean midnight',()=>{
 const state=initialTopview(),store=state.objects.find(object=>object.kind==='store')!
 state.objects.push({...store,id:50,x:5,y:7})
 const order=dailyFarmOrders(store,now,state)[0]
 state.simulation.inventory[order.good]=2
 state.simulation.orderDeliveries[farmOrderKey(store,now)]={[order.good]:1}
 const overview=farmOverview(state,now),item=overview.orders[0].items.find(item=>item.good===order.good)!
 expect(item).toMatchObject({remaining:order.quantity-1,owned:2,deliverable:2,missing:order.quantity-3})
 const other=overview.orders.find(order=>order.object.id===50)!
 expect(other.items.every(item=>item.remaining===item.quantity)).toBe(true)
 expect(other.items.every(item=>item.owned===state.simulation.inventory[item.good])).toBe(true)
 const tomorrow=farmOverview(state,now+1000).orders[0]
 expect(tomorrow.items.every(item=>item.remaining===item.quantity)).toBe(true)
 state.simulation.inventory[order.good]=100
 expect(farmOverview(state,now).orders[0].items.find(item=>item.good===order.good)).toMatchObject({missing:0,deliverable:order.quantity-1})
})
it('handles empty farms and completed daily orders',()=>{
 const state=initialTopview(),store=state.objects.find(object=>object.kind==='store')!
 state.simulation.orderDeliveries[farmOrderKey(store,now)]=Object.fromEntries(dailyFarmOrders(store,now,state).map(order=>[order.good,order.quantity]))
 expect(farmOverview(state,now).orders[0].complete).toBe(true)
 expect(farmOverview({...state,objects:[]},now)).toMatchObject({tasks:[],orders:[],ready:0,working:0,attention:0})
})
it('shows crafting ingredients only for the unfilled quantity after subtracting existing finished products',()=>{
 const state=initialTopview();state.simulation.unlockedCrops.push('strawberry','sugarcane');
 for(const [index,kind] of (['mill','dairy','mediumBakery','barn','coop'] as FarmTool[]).entries())state.objects.push({id:100+index,kind,x:4,y:4})
 Object.assign(state.simulation.inventory,{cake:1,flour:2,egg:1,cream:1})
 const processed=state.objects.find(object=>object.kind==='processed')!
 let at=now
 for(let day=0;day<30&&!dailyFarmOrders(processed,at,state).some(order=>order.good==='cake');day++)at+=86400000
 expect(dailyFarmOrders(processed,at,state).some(order=>order.good==='cake')).toBe(true)
 const cake=farmOverview(state,at).orders.find(order=>order.object.kind==='processed')!.items.find(item=>item.good==='cake')!
 const needed=cake.quantity-1
 for(const good of ['flour','egg'] as const){
  const perCake=farmRecipes.cake.ingredients.find(item=>item.good===good)!.quantity
  const required=needed*perCake
  expect(cake.ingredients.find(item=>item.good===good)).toMatchObject({required,missing:Math.max(0,required-state.simulation.inventory[good])})
 }
 state.simulation.inventory.cake=100
 expect(farmOverview(state,at).orders.find(order=>order.object.kind==='processed')!.items.find(item=>item.good==='cake')!.ingredients).toEqual([])
})
it('does not advertise ready products as collectible while the warehouse is unavailable or full',()=>{
 const state=initialTopview()
 state.simulation.animalJobs[4]=now
 state.simulation.upgradeJobs[26]={startedAt:now,readyAt:now+10000,fromLevel:1}
 expect(farmOverview(state,now)).toMatchObject({ready:1,blocked:0})
 expect(farmOverview(state,now).orders.every(order=>order.warehouseReady)).toBe(true)
 const objects=state.objects
 state.objects=objects.filter(object=>object.kind!=='warehouse')
 expect(farmOverview(state,now)).toMatchObject({ready:0,blocked:1})
 expect(farmOverview(state,now).orders.every(order=>!order.warehouseReady)).toBe(true)
 state.objects=objects
 state.simulation.upgradeJobs={}
 state.simulation.inventory.wheat=0
 state.simulation.inventory.wheat=warehouseCapacity(state)-farmStorageUsage(state.simulation)
 expect(farmOverview(state,now)).toMatchObject({ready:0,blocked:1})
 state.simulation.inventory.wheat-=2;state.simulation.inventory.milk=0
 expect(farmOverview(state,now)).toMatchObject({ready:1,blocked:0})
})
it('counts the rice needed for remaining omurice orders after subtracting finished food stock',()=>{
 const state=initialTopview(),store=state.objects.find(object=>object.kind==='processed')!
 state.simulation.unlockedCrops.push('paddy','sugarcane','tomato')
 state.simulation.inventory.omurice=1;state.simulation.inventory.rice=1
 const at=Array.from({length:90},(_,day)=>now+day*86400000).find(at=>dailyFarmOrders(store,at,state).some(order=>order.good==='omurice'))!
 expect(at).toBeDefined()
 const pudding=farmOverview(state,at).orders.find(order=>order.object.id===store.id)!.items.find(item=>item.good==='omurice')!
 const rawNeeded=(pudding.quantity-1)*farmRecipes.omurice.ingredients.find(item=>item.good==='rice')!.quantity
 expect(pudding.ingredients.find(item=>item.good==='rice')).toEqual({good:'rice',required:rawNeeded,missing:rawNeeded-1})
})
