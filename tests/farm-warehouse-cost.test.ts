import {expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {upgradeBuilding,warehouseCapacity} from '@/features/farm/building-upgrades'

it('charges 3000 per warehouse expansion, rejects insufficient gold, and refunds only once',()=>{
 const state=initialTopview(),id=state.objects.find(o=>o.kind==='warehouse')!.id
 expect(warehouseCapacity(state)).toBe(40)
 const poor={...state,gold:2999}
 expect(upgradeBuilding(poor,id,{type:'upgrade'},0).state).toBe(poor)
 const started=upgradeBuilding({...state,gold:3000},id,{type:'upgrade'},0).state
 expect(started.gold).toBe(0)
 const canceled=upgradeBuilding(started,id,{type:'cancelUpgrade'},1)
 expect(canceled.state.gold).toBe(3000)
 expect(canceled.message).toContain('3,000골드')
 expect(upgradeBuilding(canceled.state,id,{type:'cancelUpgrade'},2).state).toBe(canceled.state)
 const completed=upgradeBuilding(started,id,{type:'completeUpgrade'},300000).state
 expect(warehouseCapacity(completed)).toBe(80)
 expect(completed.gold).toBe(0)
})
