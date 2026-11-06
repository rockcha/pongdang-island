import {expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm} from '@/features/farm/farm-simulation'
import {farmRecipes,isFinishedFood} from '@/features/farm/food-catalog'

const setup=()=>{const state=initialTopview();return {...state,objects:[...state.objects,{id:99,kind:'apiary' as const,x:8,y:8}]}}
it('produces at most two honey after one hour and collects only once',()=>{
 const initial=setup()
 expect(simulateFarm(initial,99,{type:'craft',recipe:'honey',quantity:3},0).state).toBe(initial)
 const started=simulateFarm(initial,99,{type:'craft',recipe:'honey',quantity:2},0).state
 expect(started.simulation.inventory).toEqual(initial.simulation.inventory)
 expect(started.simulation.processingJobs[99].readyAt).toBe(3600000)
 expect(simulateFarm(started,99,{type:'collectCraft'},3599999).state).toBe(started)
 expect(simulateFarm(started,99,{type:'craft',recipe:'honey',quantity:1},1000).state).toBe(started)
 const collected=simulateFarm(started,99,{type:'collectCraft'},3600000).state
 expect(collected.simulation.inventory.honey).toBe(2)
 expect(simulateFarm(collected,99,{type:'collectCraft'},3600001).state).toBe(collected)
 expect(simulateFarm(collected,99,{type:'craft',recipe:'honey',quantity:2},3600001).state.simulation.processingJobs[99]).toBeTruthy()
})
it.each(['honeyMilk','honeyCookies','honeyCake'] as const)('consumes ingredients once and delivers finished %s',id=>{
 const state=setup(),recipe=farmRecipes[id]
 state.objects.push({id:100,kind:recipe.building,x:10,y:8})
 for(const ingredient of recipe.ingredients)state.simulation.inventory[ingredient.good]=ingredient.quantity
 const started=simulateFarm(state,100,{type:'craft',recipe:id,quantity:1},0).state
 for(const ingredient of recipe.ingredients)expect(started.simulation.inventory[ingredient.good]).toBe(0)
 const done=simulateFarm(started,100,{type:'collectCraft'},recipe.seconds*1000).state
 expect(done.simulation.inventory[id]).toBe(1)
 expect(isFinishedFood(id)).toBe(true)
 expect(isFinishedFood('honey')).toBe(false)
})
it('keeps honey ready for harvest when the warehouse is full',()=>{
 const started=simulateFarm(setup(),99,{type:'craft',recipe:'honey',quantity:2},0).state
 started.simulation.inventory.wheat=10000
 expect(simulateFarm(started,99,{type:'collectCraft'},3600000).state).toBe(started)
 expect(started.simulation.processingJobs[99].quantity).toBe(2)
 started.simulation.inventory.wheat=0
 expect(simulateFarm(started,99,{type:'collectCraft'},3600001).state.simulation.inventory.honey).toBe(2)
})
