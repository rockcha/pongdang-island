// @vitest-environment node
import {expect,it} from 'vitest'
import {defaultState,type IslandState} from '@/features/my-island/island-model'
import {storedDecorationIds,planDecorationPlacement,applyDecorationPlacement} from '@/features/my-island/island-batch-placement'
const stock=(type:string,count:number):IslandState=>({...defaultState(),owned:Array.from({length:count},(_,i)=>`${type}~${i}`),layout:[]})
it('snaps a fence line to its dominant axis and caps it at available instances',()=>{
 const state=stock('wood-fence',3),before=structuredClone(state)
 const plan=planDecorationPlacement(state,'wood-fence',{x:8,y:8},{x:16,y:10})
 expect(plan.placements.map(p=>[p.x,p.y])).toEqual([[8,8],[9,8],[10,8]])
 expect(plan.remaining).toBe(0);expect(new Set(plan.placements.map(p=>p.id)).size).toBe(3)
 expect(state).toEqual(before)
 const vertical=planDecorationPlacement(state,'wood-fence',{x:10,y:10},{x:9,y:8})
 expect(vertical.placements.map(p=>[p.x,p.y,p.rotation])).toEqual([[10,10,90],[10,9,90],[10,8,90]])
})
it('skips occupied or water cells without consuming stock or duplicating IDs',()=>{
 const state=stock('stone-wall',3);state.layout=[{id:'tree~obstacle',x:9,y:8}];state.owned.push('tree~obstacle')
 const result=applyDecorationPlacement(state,'stone-wall',{x:8,y:8},{x:12,y:8})!
 expect(result.plan.placements.map(p=>p.x)).toEqual([8,10,11])
 expect(result.plan.slots.find(s=>s.cell.x===9)?.allowed).toBe(false)
 expect(storedDecorationIds(result.state,'stone-wall')).toEqual([])
 expect(result.state.coins).toBe(state.coins);expect(result.state.owned).toEqual(state.owned)
 expect(result.state.layout[0]).toEqual(state.layout[0])
 const coastal=planDecorationPlacement(stock('wood-fence',4),'wood-fence',{x:4,y:8},{x:9,y:8})
 expect(coastal.slots.slice(0,2).every(s=>!s.allowed)).toBe(true)
 expect(coastal.placements.map(p=>p.x)).toEqual([6,7,8,9])
})
it('places other decorations one at a time, prevents overlaps and respects water restrictions',()=>{
 const state=stock('picnic-table',2)
 const first=applyDecorationPlacement(state,'picnic-table',{x:8,y:8},{x:10,y:8})!
 expect(first.plan.placements).toHaveLength(1)
 expect(first.plan.placements[0]).toMatchObject({x:10,y:8})
 expect(applyDecorationPlacement(first.state,'picnic-table',{x:10,y:8},{x:10,y:8})).toBeNull()
 expect(storedDecorationIds(first.state,'picnic-table')).toHaveLength(1)
 const water=stock('water-lily',1)
 expect(applyDecorationPlacement(water,'water-lily',{x:8,y:8},{x:8,y:8})).toBeNull()
 expect(applyDecorationPlacement(water,'water-lily',{x:2,y:8},{x:2,y:8})?.plan.placements).toHaveLength(1)
})
it('preserves per-instance sign text and ignores duplicate inventory entries',()=>{
 const state=stock('wood-arrow-sign',1);state.signLabels={[state.owned[0]]:'바닷길'};state.owned.push(state.owned[0])
 const plan=planDecorationPlacement(state,'wood-arrow-sign',{x:8,y:8},{x:8,y:8})
 expect(plan.placements).toHaveLength(1);expect(plan.placements[0].label).toBe('바닷길')
 expect(plan.remaining).toBe(0)
 expect(planDecorationPlacement(state,'wood-arrow-sign',{x:8.5,y:8},{x:8,y:8}).placements).toEqual([])
})
