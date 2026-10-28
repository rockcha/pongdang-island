import {expect,it} from 'vitest'
import {defaultState,facilities,footprint} from '@/features/my-island/island-model'
import {planDecorationRemoval} from '@/features/my-island/island-batch-placement'

it('stores each touched decoration once while preserving buildings, ownership, terrain and coins',()=>{
 const base=defaultState(),building=facilities.find(f=>f.category!=='decoration')!
 const state={...base,owned:['wood-fence~a','wood-fence~b',building.id],layout:[{id:'wood-fence~a',x:8,y:8},{id:'wood-fence~b',x:9,y:8},{id:building.id,x:10,y:8}]}
 const result=planDecorationRemoval(state,[{x:8,y:8},{x:8,y:8},{x:9,y:8},{x:10,y:8}])
 expect(result.count).toBe(2)
 expect(result.state).toEqual({...state,layout:[{id:building.id,x:10,y:8}]})
 expect(state.layout).toHaveLength(3)
})
it('matches the rotated footprint of a large decoration and retains custom sign labels',()=>{
 const f=facilities.find(f=>f.category==='decoration'&&f.rotatable&&(f.w>1||f.h>1))!
 expect(f).toBeTruthy()
 const placement={id:f.id+'~large',x:10,y:10,rotation:90},bounds=footprint(placement)
 const state={...defaultState(),owned:[placement.id],layout:[placement],signLabels:{[placement.id]:'우리 섬'}}
 const result=planDecorationRemoval(state,[{x:10+bounds.w-1,y:10+bounds.h-1}])
 expect(result.count).toBe(1);expect(result.state).toEqual({...state,layout:[]})
 expect(planDecorationRemoval(state,[{x:0,y:0}]).state).toBe(state)
})
