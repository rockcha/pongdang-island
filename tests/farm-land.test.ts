import {expect,it} from 'vitest'
import {initialTopview} from '@/features/farm/topview-model'
import {applyLandStroke,buyLandStock,landLine} from '@/features/farm/land-tools'

it('buys inventory once without altering the island and rejects invalid or unaffordable batches',()=>{
 const state=initialTopview(),bought=buyLandStock(state,10)
 expect(bought.gold).toBe(14000);expect(bought.landStock).toBe(10);expect(bought.land).toBe(state.land)
 for(const quantity of [0,-1,1.5,1001,Number.MAX_SAFE_INTEGER,NaN])expect(buyLandStock(state,quantity)).toBe(state)
 const poor={...state,gold:99};expect(buyLandStock(poor,1)).toBe(poor)
})
it('places disconnected sea cells in stroke order and stops at available stock',()=>{
 const state=buyLandStock(initialTopview(),3),cells=[{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:3,y:4}]
 const result=applyLandStroke(state,'place',cells)
 expect(result.changed).toEqual([{x:0,y:4},{x:1,y:4},{x:2,y:4}])
 expect(result.state.landStock).toBe(0);expect(result.state.gold).toBe(state.gold)
 expect(result.blocked).toEqual([{cell:{x:3,y:4},reason:'out-of-stock'}])
 expect(applyLandStroke(result.state,'place',[{x:0,y:4}]).state).toBe(result.state)
 expect(applyLandStroke(state,'place',[{x:0,y:0}]).state.land).toContain('0,0')
})
it('interpolates fast diagonal drags as a four-connected line without holes',()=>{
 const line=landLine({x:3,y:4},{x:1,y:2})
 expect(line).toHaveLength(5)
 for(let i=1;i<line.length;i++)expect(Math.abs(line[i].x-line[i-1].x)+Math.abs(line[i].y-line[i-1].y)).toBe(1)
 const result=applyLandStroke(buyLandStock(initialTopview(),5),'place',line)
 expect(result.changed).toHaveLength(5);expect(result.state.landStock).toBe(0)
 expect(landLine({x:-10000,y:0},{x:1,y:1})).toEqual([])
})
it('returns empty land to inventory and removes its path while protecting every cell under objects',()=>{
 const state=initialTopview()
 const blocked=applyLandStroke(state,'recover',[{x:8,y:12},{x:10,y:11},{x:14,y:13}])
 expect(blocked.state).toBe(state);expect(blocked.blocked.every(b=>b.reason==='occupied')).toBe(true)
 const result=applyLandStroke(state,'recover',[{x:6,y:9},{x:6,y:9}])
 expect(result.state.landStock).toBe(1);expect(result.state.paths).not.toContain('6,9');expect(result.state.gold).toBe(state.gold)
})
it('recovers detached islands and separating cells while preserving the last land cell',()=>{
 const base={...initialTopview(),objects:[],paths:['1,0'],land:['0,0','1,0','2,0']}
 expect(applyLandStroke(base,'recover',[{x:1,y:0}]).state.land).toEqual(['0,0','2,0'])
 const branch=applyLandStroke(base,'recover',[{x:1,y:0},{x:2,y:0}])
 expect(branch.state.land).toEqual(['0,0']);expect(branch.state.landStock).toBe(2);expect(branch.state.paths).toEqual([])
 const all=applyLandStroke(base,'recover',[{x:0,y:0},{x:1,y:0},{x:2,y:0}])
 expect(all.state.land).toHaveLength(1);expect(all.state.landStock).toBe(2);expect(all.blocked[0].reason).toBe('last-land')
})

it('protects sea decorations, map bounds, and remaining stock on detached placement',()=>{
 const base={...initialTopview(),landStock:3}
 const result=applyLandStroke(base,'place',[{x:5,y:9},{x:-1,y:0},{x:0,y:0},{x:0,y:0}])
 expect(result.changed).toEqual([{x:0,y:0}])
 expect(result.state.landStock).toBe(2)
 expect(result.blocked.map(b=>b.reason).sort()).toEqual(['occupied','outside'])
 const recovered=applyLandStroke(result.state,'recover',[{x:0,y:0}])
 expect(recovered.state.land).toEqual(base.land)
 expect(recovered.state.landStock).toBe(3)
})
