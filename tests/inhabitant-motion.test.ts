import { expect, it } from 'vitest'
import { InhabitantMotion } from '../src/features/aquarium/inhabitant-motion'
import type { OwnedCollectible } from '../src/features/collection/api'

function item(kind='fish'): OwnedCollectible {
  return { id: kind, species_id: kind, tank_id: 'tank', animation_seed: 0, position_x: null, position_y: null, acquired_at: '',
    species: { id: kind, kind, name: kind, description: '', swim_y_min: .2, swim_y_max: .7, speed: .05, size: 72, rarity: 'common', sprite_sheet_path: 'fish.png', thumbnail_path: 'thumb.png', sell_price: 10 } } as OwnedCollectible
}
it('anchors fixed living species at their habitat depth and preserves manual placement',()=>{
 const sponge=item()
 sponge.species={...sponge.species,movement_type:'fixed',swim_y_min:.88,swim_y_max:.94,size:54}
 const motion=new InhabitantMotion(sponge)
 const first=motion.update(0,0,400,600)
 expect(first.y).toBeCloseTo(.91*(600-54))
 expect(motion.update(20,.1,400,600)).toEqual(first)
 const placed=new InhabitantMotion({...sponge,position_x:.4,position_y:.6})
 expect(placed.update(0,0,400,600).y).toBeCloseTo(.6*(600-54))
})
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
it('restarts the route from a drop independently of the old route phase and stale snapshots',()=>{
 const original={...item(),position_x:.3,position_y:.5}
 const fish=new InhabitantMotion(original)
 fish.update(70,.1,400,600)
 fish.place(315,300,70,400,600)
 fish.setItem(original,70,400,600)
 expect(fish.update(70,0,400,600).x).toBeCloseTo(315)
 const positions=Array.from({length:80},(_,i)=>fish.update(70+i*.1,.1,400,600).x)
 expect(positions.at(-1)).toBeLessThan(315)
 expect(positions.every((x,i)=>i===0||x<=positions[i-1]+.0001)).toBe(true)
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
it('ignores far taps and decorations; preserves decoration placement and reduced motion',()=>{
  for(const kind of ['fish','decoration']){
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
it('restores decoration rotation and scale and keeps rotated edges within mobile glass',()=>{
 for(const scale of [.5,1,2])for(const rotation of [0,45,90,225])for(const position of [0,.5,1]){
  const decoration={...item('decoration'),rotation,scale,position_x:position,position_y:position}
  const motion=new InhabitantMotion(decoration)
  const pose=motion.update(0,0,320,560)
  expect(pose.size).toBeCloseTo(72*scale)
  expect(pose.angle).toBe(rotation)
  const radians=rotation*Math.PI/180
  const half=pose.size*(Math.abs(Math.cos(radians))+Math.abs(Math.sin(radians)))/2
  const cx=pose.x+pose.size/2,cy=pose.y+pose.size/2
  expect(cx-half).toBeGreaterThanOrEqual(-.000001)
  expect(cx+half).toBeLessThanOrEqual(320.000001)
  expect(cy-half).toBeGreaterThanOrEqual(-.000001)
  expect(cy+half).toBeLessThanOrEqual(560.000001)
  expect(motion.update(50,.1,320,560,true)).toEqual(pose)
  const placed=motion.place(pose.x,pose.y,0,320,560)
  expect(placed.x).toBeCloseTo(position)
  expect(placed.y).toBeCloseTo(position)
 }
})
it('keeps normalized decoration coordinates when changing its size, angle and position together',()=>{
 const initial={...item('decoration'),rotation:0,scale:1,position_x:.2,position_y:.3}
 const motion=new InhabitantMotion(initial)
 motion.update(0,0,320,560)
 const edited={...initial,rotation:45,scale:2,position_x:.8,position_y:.1}
 motion.setItem(edited,1,320,560)
 expect(motion.item).toMatchObject({position_x:.8,position_y:.1,rotation:45,scale:2})
 expect(motion.update(1,0,320,560)).toEqual(new InhabitantMotion(edited).update(1,0,320,560))
})

it('holds a newly selected swimmer without recursive initialization and resumes after deselection',()=>{
 const selected={...item(),editing:true,position_x:.4,position_y:.5}
 const motion=new InhabitantMotion(selected)
 const first={...motion.update(10,.016,400,600)}
 expect(first.x).toBeCloseTo(.4*(400-72))
 expect(first.y).toBeCloseTo(.5*(600-72))
 expect(motion.update(11,.016,400,600)).toEqual(first)
 motion.setItem({...selected,editing:false},11,400,600)
 const resumed=motion.update(11,0,400,600)
 expect(resumed.x).toBeCloseTo(first.x)
 expect(resumed.y).toBeCloseTo(first.y)
 expect(Number.isFinite(motion.update(12,.016,400,600).x)).toBe(true)
})
