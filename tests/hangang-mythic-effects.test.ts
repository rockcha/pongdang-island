import {expect,it} from 'vitest'
import {hangangMythicIds,hangangMythicPaths,hasHangangMythicEffect} from '@/features/aquarium/hangang-mythic-effects'
it('keeps four distinct effects bounded and repeats the six-second swim cycle',()=>{
 const signatures=new Set<string>()
 for(const id of hangangMythicIds){
  expect(hasHangangMythicEffect(id)).toBe(true)
  signatures.add(JSON.stringify(hangangMythicPaths(id,5)))
  expect(hangangMythicPaths(id,5)).toEqual(hangangMythicPaths(id,11))
  expect(hangangMythicPaths(id,5,0,true)).toEqual([])
  for(let t=0;t<6;t+=.1)for(const stroke of hangangMythicPaths(id,t)){
   expect(stroke.alpha).toBeGreaterThan(0);expect(stroke.alpha).toBeLessThanOrEqual(1)
   for(const point of stroke.points)for(const value of point){expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(0);expect(value).toBeLessThanOrEqual(1)}
  }
 }
 expect(signatures.size).toBe(4)
 expect(hangangMythicPaths('ordinary-fish',5)).toEqual([])
})
