import {expect,it} from 'vitest'
import {applyTileStroke,buyFarmItem,buyFarmTiles} from '@/features/farm/farm-stock'
import {initialTopview} from '@/features/farm/topview-model'
import {applyLandStroke} from '@/features/farm/land-tools'

it('buys objects into storage, respects building ownership, and rejects animals and plots',()=>{
 const before=initialTopview(),bought=buyFarmItem(before,'fence')
 expect(bought.stored).toEqual(['fence']);expect(bought.gold).toBe(before.gold-40)
 expect(buyFarmItem(before,'office')).toBe(before)
 expect(buyFarmItem(before,'cow')).toBe(before)
 expect(buyFarmItem(before,'plot')).toBe(before)
})
it('respects tile stock and skips duplicate, occupied, water and reserved clearing cells without losing tiles',()=>{
 const before=buyFarmTiles(initialTopview(),2),paths=before.paths.length
 const laid=applyTileStroke(before,'place',[{x:0,y:0},{x:9,y:13},{x:8,y:13},{x:8,y:13},{x:8,y:14},{x:8,y:15},{x:7,y:13}],[{x:8,y:14}]).state
 expect(laid.tileStock).toBe(0);expect(laid.paths.length).toBe(paths+2)
 expect(laid.paths).toContain('8,13');expect(laid.paths).toContain('8,15')
 const recovered=applyTileStroke(laid,'recover',[{x:8,y:13},{x:8,y:13},{x:8,y:15}]).state
 expect(recovered.tileStock).toBe(2);expect(recovered.paths.length).toBe(paths)
 expect(recovered.gold).toBe(before.gold)
 expect(applyTileStroke(recovered,'recover',[{x:8,y:13}]).state).toBe(recovered)
})
it('returns tiles when their underlying land is recovered and rejects invalid purchases',()=>{
 const before=initialTopview(),recovered=applyLandStroke(before,'recover',[{x:4,y:11}]).state
 expect(recovered.tileStock).toBe(1);expect(recovered.paths).not.toContain('4,11')
 for(const quantity of [0,-1,1.5,NaN,Infinity,1001])expect(buyFarmTiles(before,quantity)).toBe(before)
 expect(buyFarmTiles({...before,gold:0},1).tileStock).toBe(0)
})
