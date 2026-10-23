import {expect,it} from 'vitest'
import {hasHalloweenSpirits,halloweenSpirits,halloweenMythicFrame} from '@/features/aquarium/halloween-spirits'

const id='halloween-dullahan-seahorse'
it('orbits continuously through sheet changes with companions on opposite sides',()=>{
 for(const time of [0,.25,3,4,5.999,6,8]){
  const poses=halloweenSpirits(id,time,17),next=halloweenSpirits(id,time+.001,17)
  expect(poses).toHaveLength(2)
  expect(poses[0].x+poses[1].x).toBeCloseTo(0)
  expect(poses[0].y+poses[1].y).toBeCloseTo(-.28)
  for(let i=0;i<2;i++){
   expect(Math.hypot(next[i].x-poses[i].x,next[i].y-poses[i].y)).toBeLessThan(.001)
   expect(poses[i].size).toBe(.22)
  }
 }
 const start=halloweenSpirits(id,0,17),end=halloweenSpirits(id,8,17)
 start.forEach((pose,i)=>{expect(pose.x).toBeCloseTo(end[i].x);expect(pose.y).toBeCloseTo(end[i].y)})
})
it('freezes companion motion and excludes other collectibles',()=>{
 expect(halloweenSpirits(id,1,19,true)).toEqual(halloweenSpirits(id,100,19,true))
 expect(hasHalloweenSpirits('halloween-ghost-puffer')).toBe(false)
 expect(halloweenSpirits('ordinary-fish',5,0)).toEqual([])
})
it('enters and exits the additional action through neutral poses',()=>{
 const path=`fish/mythic/${id}_swim8_sprite.png`
 const frames=Array.from({length:24},(_,i)=>halloweenMythicFrame(path,(i+.5)/4,0))
 expect(new Set(frames)).toEqual(new Set([0,1,2,3,4,5,6,7]))
 expect(frames[11]).toBe(0);expect(frames[12]).toBe(4)
 expect(frames[15]).toBe(7);expect(frames[16]).toBe(0)
 expect(frames.at(-1)).toBe(frames[0])
 expect(halloweenMythicFrame('other',5,0)).toBeNull()
})
