import {expect,it} from 'vitest'
import {defaultState,buyFloor,paintFloor} from '@/features/my-island/island-model'
import {extendLandStroke,planLandStroke} from '@/features/my-island/island-land-placement'

it('fills fast pointer movement gaps and does not consume stock twice when revisiting cells',()=>{
 const state={...defaultState(),landStock:10}
 const cells=extendLandStroke(extendLandStroke(extendLandStroke([],{x:0,y:0}),{x:4,y:0}),{x:0,y:0})
 expect(cells).toHaveLength(5)
 const result=planLandStroke(state,cells)
 expect(result.count).toBe(5);expect(result.state.landStock).toBe(5)
 expect(state.landStock).toBe(10)
})
it('returns removed land and flooring to stock, skips occupied cells and never counts a tile twice',()=>{
 const tiled=paintFloor(buyFloor(defaultState(),'brick')!,{x:8,y:8},'brick')!
 const state={...tiled,owned:[...tiled.owned,'wood-fence~protected'],layout:[...tiled.layout,{id:'wood-fence~protected',x:9,y:8}]}
 const result=planLandStroke(state,[{x:8,y:8},{x:8,y:8},{x:9,y:8},{x:10,y:8},{x:0,y:0}],'remove')
 expect(result.slots.map(s=>s.allowed)).toEqual([true,false,false,true,false])
 expect(result.count).toBe(2);expect(result.state.landStock).toBe(state.landStock+2)
 expect(result.state.tileStock.brick).toBe((state.tileStock.brick??0)+1)
 expect(result.state.paving).not.toContainEqual({x:8,y:8,type:'brick'})
 expect(result.state.layout).toEqual(state.layout);expect(result.state.coins).toBe(state.coins)
 expect(state.removedLand).not.toContainEqual({x:8,y:8})
})
it('skips existing land, stops at available stock and never changes coins or structures',()=>{
 const state={...defaultState(),landStock:2}
 const result=planLandStroke(state,[{x:8,y:8},...extendLandStroke([],{x:0,y:0}),{x:1,y:0},{x:2,y:0}])
 expect(result.slots.map(s=>s.allowed)).toEqual([false,true,true,false])
 expect(result.count).toBe(2);expect(result.state.landStock).toBe(0)
 expect(result.state.coins).toBe(state.coins);expect(result.state.layout).toEqual(state.layout)
})
