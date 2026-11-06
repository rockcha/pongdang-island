import {expect,it} from 'vitest'
import {initialTopview,topviewItems} from '@/features/farm/topview-model'
import {hasWaterwheelBonus,waterwheelBonusMinutes} from '@/features/farm/waterwheel'
import {simulateFarm} from '@/features/farm/farm-simulation'
it('charges 3000 per level, uses the strongest neighbor, and stops at level ten',()=>{
 let state=initialTopview();const source={id:100,kind:'mill' as const,x:4,y:4}
 state.objects.push(source,{id:101,kind:'waterwheel',x:6,y:4},{id:102,kind:'waterwheel',x:4,y:5,level:3})
 expect(waterwheelBonusMinutes(state,source)).toBe(3)
 const gold=state.gold
 state=simulateFarm(state,101,{type:'upgrade'},0).state
 expect(state.gold).toBe(gold-3000)
 state=simulateFarm(state,101,{type:'completeUpgrade'},300000).state
 expect(state.objects.find(o=>o.id===101)?.level).toBe(2)
 state.objects.find(o=>o.id===101)!.level=10
 expect(waterwheelBonusMinutes(state,source)).toBe(10)
 expect(simulateFarm(state,101,{type:'upgrade'},300001).state).toBe(state)
 state.simulation.inventory.wheat=6
 expect(simulateFarm(state,100,{type:'mill',quantity:2},0).state.simulation.millJobs[100].readyAt).toBe(1000)
 expect(simulateFarm(state,101,{type:'storeBuilding'},300001).state.storedLevels?.waterwheel).toEqual([10])
})
it('uses side adjacency, excludes unfinished wheels and does not stack',()=>{
 const state=initialTopview(),source={id:100,kind:'kitchen' as const,x:4,y:4,level:2}
 state.objects.push(source,{id:101,kind:'waterwheel',x:6,y:4},{id:102,kind:'waterwheel',x:4,y:5})
 expect(topviewItems.waterwheel).toMatchObject({price:5000,w:2,h:2})
 expect(hasWaterwheelBonus(state,source)).toBe(true)
 state.simulation.inventory.wheat=18
 const start=simulateFarm(state,100,{type:'craft',recipe:'wholeWheatPorridge',quantity:4},0).state
 expect(start.simulation.processingJobs[100].readyAt).toBe(1140000)
 expect(simulateFarm(start,100,{type:'collectCraft'},1139999).state).toBe(start)
 expect(simulateFarm(start,100,{type:'collectCraft'},1140000).state.simulation.inventory.wholeWheatPorridge).toBe(4)
 state.objects=state.objects.filter(o=>o.id!==102)
 state.objects.find(o=>o.id===101)!.constructionReadyAt=10
 expect(hasWaterwheelBonus(state,source)).toBe(false)
 delete state.objects.find(o=>o.id===101)!.constructionReadyAt
 state.objects.find(o=>o.id===101)!.y=5
 expect(hasWaterwheelBonus(state,source)).toBe(false)
})
it('reduces milling and meat processing, never to zero',()=>{
 const state=initialTopview();state.objects.push({id:100,kind:'mill',x:4,y:4},{id:101,kind:'waterwheel',x:6,y:4})
 state.simulation.inventory.wheat=6
 expect(simulateFarm(state,100,{type:'mill',quantity:2},0).state.simulation.millJobs[100].readyAt).toBe(540000)
 state.objects.find(o=>o.id===100)!.kind='butcher';state.stored=['chicken']
 expect(simulateFarm(state,100,{type:'butcher',animal:'chicken',quantity:1},0).state.simulation.butcherJobs?.[100].readyAt).toBe(1000)
})
