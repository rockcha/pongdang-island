import {afterEach,expect,it} from 'vitest'
import {cleanup,render,screen} from '@testing-library/react'
import {initialTopview} from '@/features/farm/topview-model'
import {simulateFarm} from '@/features/farm/farm-simulation'
import {FarmBuildingProducts} from '@/features/farm/building-products'
afterEach(cleanup)
it('rounds odd quantities up in time and runs different products only in separate buildings',()=>{
 let state=initialTopview();state.objects.push({id:100,kind:'kitchen',x:5,y:8,level:2},{id:101,kind:'kitchen',x:7,y:8})
 state.simulation.inventory.wheat=30;state.simulation.inventory.carrot=6
 state=simulateFarm(state,100,{type:'craft',recipe:'wholeWheatPorridge',quantity:3},0).state
 expect(state.simulation.processingJobs[100]).toMatchObject({quantity:3,readyAt:1200000})
 expect(state.simulation.inventory.wheat).toBe(21)
 const second={type:'craft' as const,recipe:'roastedCarrot' as const,quantity:2}
 expect(simulateFarm(state,100,second,0).state).toBe(state)
 state=simulateFarm(state,101,second,0).state
 expect(state.simulation.processingJobs[101]).toMatchObject({recipe:'roastedCarrot',quantity:2,readyAt:600000})
 expect(state.simulation.processingJobs[100].recipe).toBe('wholeWheatPorridge')
})
it.each(['kitchen','mill'] as const)('unlocks consecutive production per paid %s upgrade and rejects busy upgrades',kind=>{
 let state=initialTopview();state.objects.push({id:100,kind,x:5,y:8});state.simulation.inventory.wheat=30
 const action=kind==='mill'?{type:'mill' as const,quantity:4}:{type:'craft' as const,recipe:'wholeWheatPorridge' as const,quantity:4}
 expect(simulateFarm(state,100,action,0).state).toBe(state)
 const gold=state.gold
 state=simulateFarm(state,100,{type:'upgrade'},0).state
 expect(state.gold).toBe(gold-3000)
 expect(simulateFarm(state,100,action,1).state).toBe(state)
 expect(simulateFarm(state,100,{type:'cancelUpgrade'},1).state.gold).toBe(gold)
 expect(simulateFarm(state,100,{type:'completeUpgrade'},299999).state).toBe(state)
 state=simulateFarm(state,100,{type:'completeUpgrade'},300000).state
 expect(state.objects.find(o=>o.id===100)?.level).toBe(2)
 const stored=simulateFarm(state,100,{type:'storeBuilding'},300000).state
 expect(stored.storedLevels?.[kind]).toEqual([2])
 state=simulateFarm(state,100,action,300000).state
 expect(state.simulation.inventory.wheat).toBe(18)
 expect(simulateFarm(state,100,{type:'upgrade'},300001).state).toBe(state)
})
it('shows livestock instead of their produce in the building shop',()=>{
 render(<FarmBuildingProducts kind="barn"/>)
 expect(screen.getByRole('img',{name:'젖소'})).toBeTruthy()
 expect(screen.getByRole('img',{name:'양'})).toBeTruthy()
 expect(screen.queryByRole('img',{name:'우유'})).toBeNull()
})
