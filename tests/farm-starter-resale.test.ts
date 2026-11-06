import {expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {isResellableFarmKind,resellFarmObject,resellStoredFarmItem} from '@/features/farm/resale'

it.each(['office','livestockOffice'] as const)('prevents selling starter and additional %s buildings',kind=>{
 const initial=initialTopview()
 const state={...initial,stored:[kind],objects:[...initial.objects,{id:100,kind,x:15,y:8}]}
 expect(isResellableFarmKind(kind)).toBe(false)
 for(const object of state.objects.filter(o=>o.kind===kind)){
  const result=resellFarmObject(state,object.id)
  expect(result.state).toBe(state)
  expect(result.receipt).toBeUndefined()
  expect(result.message).toContain('판매할 수 없어요')
 }
 expect(resellStoredFarmItem(state,kind).state).toBe(state)
 expect(isResellableFarmKind('mill')).toBe(true)
})
