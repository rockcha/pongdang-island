import {expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {farmLimits,farmPlacementError,simulateFarm} from '@/features/farm/farm-simulation'
it('unlocks potato seeds once through research and purchases the requested quantity',()=>{
 const start=initialTopview()
 expect(simulateFarm(start,2,{type:'seed',good:'potatoSeed',quantity:2},0).state).toBe(start)
 const researched=simulateFarm(start,20,{type:'research'},0).state
 expect(researched.gold).toBe(start.gold-300)
 expect(simulateFarm(researched,20,{type:'research'},0).state).toBe(researched)
 const bought=simulateFarm(researched,2,{type:'seed',good:'potatoSeed',quantity:2},0).state
 expect(bought.simulation.inventory.potatoSeed).toBe(2)
 expect(bought.gold).toBe(start.gold-340)
})
it('only sells eligible stock at its corresponding store with exact quantities',()=>{
 const state=initialTopview()
 const sold=simulateFarm(state,2,{type:'sell',good:'wheat',quantity:4},0).state
 expect(sold.gold).toBe(state.gold+100)
 expect(sold.simulation.inventory.wheat).toBe(8)
 for(const action of [{type:'sell',good:'wheat',quantity:13},{type:'sell',good:'wheat',quantity:-1},{type:'sell',good:'wheat',quantity:1.5},{type:'sell',good:'flour',quantity:1}] as const)expect(simulateFarm(state,2,action,0).state).toBe(state)
 expect(simulateFarm(state,22,{type:'sell',good:'wheat',quantity:1},0).state).toBe(state)
})
it('mills a batch in exactly ten seconds and never claims it twice',()=>{
 const start=initialTopview(),milling=simulateFarm(start,21,{type:'mill',quantity:3},100).state
 expect(milling.simulation.inventory.wheat).toBe(9)
 expect(simulateFarm(milling,21,{type:'collectFlour'},10099).state).toBe(milling)
 expect(simulateFarm(milling,21,{type:'mill',quantity:1},10100).state).toBe(milling)
 const finished=simulateFarm(milling,21,{type:'collectFlour'},10100).state
 expect(finished.simulation.inventory.flour).toBe(3)
 expect(simulateFarm(finished,21,{type:'collectFlour'},10100).state).toBe(finished)
 const sold=simulateFarm(finished,22,{type:'sell',good:'flour',quantity:3},10101).state
 expect(sold.gold).toBe(start.gold+120)
 expect(sold.simulation.inventory.flour).toBe(0)
})
it('consumes one seed and only grants the harvest after maturity once',()=>{
 const start=initialTopview(),planted=simulateFarm(start,10,{type:'plant',crop:'wheat'},0).state
 expect(planted.simulation.inventory.wheatSeed).toBe(3)
 expect(simulateFarm(planted,10,{type:'plant',crop:'wheat'},0).state).toBe(planted)
 expect(simulateFarm(planted,10,{type:'harvest'},9999).state).toBe(planted)
 const harvested=simulateFarm(planted,10,{type:'harvest'},10000).state
 expect(harvested.simulation.inventory.wheat).toBe(15)
 expect(simulateFarm(harvested,10,{type:'harvest'},10000).state).toBe(harvested)
})
it('starts at four plots and two animals, adding four and two per management building',()=>{
 const state=initialTopview(),base={...state,objects:state.objects.filter(o=>!['office','livestock'].includes(o.kind))}
 expect(farmLimits(base)).toMatchObject({plots:4,animals:2})
 expect(farmLimits(state)).toMatchObject({plots:8,animals:4})
 expect(farmPlacementError(base,'plot')).toContain('한도')
 expect(farmPlacementError(base,'cow')).toContain('한도')
 expect(farmLimits({...state,objects:[...state.objects,{id:99,kind:'office',x:0,y:0},{id:100,kind:'livestock',x:0,y:0}]})).toMatchObject({plots:12,animals:6})
})
it('buys animals at their correct facilities and counts stored animals against capacity',()=>{
 const state=initialTopview()
 expect(simulateFarm(state,18,{type:'animal',animal:'cow'},0).state).toBe(state)
 const bought=simulateFarm(state,18,{type:'animal',animal:'chicken'},0)
 expect(bought.place).toBe('chicken');expect(bought.state.gold).toBe(state.gold-300)
 expect(bought.state.stored).toEqual(['chicken'])
 const second=simulateFarm(bought.state,3,{type:'animal',animal:'cow'},0).state
 expect(simulateFarm(second,18,{type:'animal',animal:'chicken'},0).state).toBe(second)
 const fed=simulateFarm(state,4,{type:'feed'},0).state
 const milk=simulateFarm(fed,4,{type:'collectAnimal'},10000).state
 expect(milk.simulation.inventory.milk).toBe(1)
 expect(simulateFarm(milk,4,{type:'collectAnimal'},10000).state).toBe(milk)
})
