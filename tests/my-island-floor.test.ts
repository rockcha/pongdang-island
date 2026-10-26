import {expect,it} from 'vitest'
import {buyFloor,canPlace,defaultState,paintFloor,parseState} from '@/features/my-island/island-model'
it('buys per-cell floor tiles and never creates land or changes facility placement',()=>{
 const start=defaultState(),bought=buyFloor(start,'dirt')!
 expect(bought.coins).toBe(start.coins-10)
 const painted=paintFloor(bought,{x:19,y:12},'dirt')!
 expect(painted.paving).toEqual([{x:19,y:12,type:'dirt'}])
 expect(painted.land).toEqual(start.land)
 expect(painted.layout).toEqual(start.layout)
 expect(painted.tileStock.dirt).toBe(0)
 expect(canPlace(start.layout,{id:'mail',x:16,y:20},start.land)).toBe(canPlace(painted.layout,{id:'mail',x:16,y:20},painted.land))
 expect(paintFloor(bought,{x:0,y:0},'dirt')).toBeNull()
 expect(paintFloor(bought,{x:40,y:15},'dirt')).toBeNull()
 expect(buyFloor({...start,coins:9},'dirt')).toBeNull()
 expect(paintFloor(start,{x:12,y:12},'dirt')).toBeNull()
})
it('recovers replaced floors and grass restoration without duplicating stock',()=>{
 let state=buyFloor(buyFloor(defaultState(),'dirt')!,'stone')!
 state=paintFloor(state,{x:12,y:12},'dirt')!
 state=paintFloor(state,{x:12,y:12},'stone')!
 expect(state.tileStock).toMatchObject({dirt:1,stone:0})
 expect(paintFloor(state,{x:12,y:12},'stone')).toBeNull()
 const restored=paintFloor(state,{x:12,y:12},'grass')!
 expect(restored.paving).toEqual([])
 expect(restored.tileStock.stone).toBe(1)
 expect(paintFloor(restored,{x:12,y:12},'grass')).toBeNull()
 expect(parseState(state)).toEqual(state)
})
it('loads old saves and rejects invalid or duplicate surface data',()=>{
 const old=defaultState();const {paving,tileStock,...legacy}=old
 expect(paving).toEqual([]);expect(tileStock).toEqual({})
 expect(parseState(legacy)).toMatchObject({paving:[],tileStock:{}})
 expect(parseState({...old,tileStock:{dirt:-2,stone:2.5,wood:2},paving:[{x:12,y:12,type:'dirt'},{x:12,y:12,type:'stone'},{x:0,y:0,type:'wood'},{x:20,y:20,type:'invalid'}]})).toMatchObject({tileStock:{wood:2},paving:[{x:12,y:12,type:'dirt'}]})
})
