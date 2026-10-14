import { expect, it } from 'vitest'
import { InhabitantMotion } from '../src/features/aquarium/inhabitant-motion'
import type { OwnedCollectible } from '../src/features/collection/api'

function item(kind='fish'): OwnedCollectible {
  return { id: kind, species_id: kind, tank_id: 'tank', animation_seed: 0, position_x: null, position_y: null, acquired_at: '',
    species: { id: kind, kind, name: kind, description: '', swim_y_min: .2, swim_y_max: .7, speed: .05, size: 72, rarity: 'common', sprite_sheet_path: 'fish.png', thumbnail_path: 'thumb.png', sell_price: 10 } } as OwnedCollectible
}
it('continues swimming from a dragged position and restores persisted placement',()=>{
 const fish=new InhabitantMotion(item())
 fish.update(2,.1,400,600)
 const position=fish.place(200,470,2,400,600)
 expect(fish.update(2,0,400,600).x).toBeCloseTo(200)
 expect(fish.pose.y).toBeCloseTo(470)
 expect(Math.abs(fish.update(2.01,.01,400,600).x-200)).toBeLessThan(1)
 const restored=new InhabitantMotion({...item(),position_x:position.x,position_y:position.y})
 expect(restored.update(0,0,400,600).x).toBeCloseTo(200)
 expect(restored.pose.y).toBeCloseTo(470)
})
it('keeps the escape displacement when normal swimming resumes',()=>{
  const fish=new InhabitantMotion(item()), baseline=new InhabitantMotion(item())
  const start=fish.update(0,0,400,600)
  fish.flee(start.x+start.size/2-30,start.y+start.size/2,0,120)
  const after=fish.update(.7,.1,400,600), normal=baseline.update(.7,.1,400,600)
  const displacement=after.x-normal.x
  expect(displacement).toBeGreaterThan(10)
  expect(displacement).toBeLessThanOrEqual(40)
  const drifting=fish.update(1.5,.1,400,600)
  expect(drifting.x).toBeGreaterThan(after.x)
  expect(drifting.direction).toBe(1)
  const resumed=fish.update(1.81,.1,400,600)
  expect(resumed.direction).toBe(1)
  expect(Math.abs(resumed.x-drifting.x)).toBeLessThan(10)
})
it('ignores far taps and structures; preserves structure placement and reduced motion',()=>{
  for(const kind of ['fish','structure']){
    const entity=new InhabitantMotion(item(kind)), baseline=new InhabitantMotion(item(kind))
    const pose=entity.update(0,0,400,600)
    entity.flee(kind==='fish'?-1000:pose.x+36,pose.y+36,0,120)
    expect(entity.update(1,.1,400,600)).toEqual(baseline.update(1,.1,400,600))
  }
  const fish=new InhabitantMotion(item())
  expect(fish.update(10,.1,400,600,true)).toEqual(fish.update(20,.1,400,600,true))
  expect(fish.pose.frame).toBe(0)
})
it('pushes nearby trash without changing its rotation or pulling it back',()=>{
 const trash=new InhabitantMotion(item('trash'))
 const pose=trash.update(0,0,400,600)
 trash.flee(pose.x+6,pose.y+36,0,120)
 const after=trash.update(.7,.1,400,600)
 expect(after.x).toBeGreaterThan(pose.x+10)
 expect(after.angle).toBeCloseTo(.7*25)
 expect(trash.update(1.5,.1,400,600).x).toBeGreaterThan(after.x)
})
