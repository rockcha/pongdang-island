import {expect,it} from 'vitest'
import {hangangMythicIds,hangangMythicPaths,hasHangangMythicEffect,hunminLetterForms} from '@/features/aquarium/hangang-mythic-effects'
import {hangangMythicFrame,redCheerBeatTimes} from '@/features/aquarium/hangang-mythic-motion'
it('keeps five distinct effects bounded and repeats the six-second swim cycle',()=>{
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
 expect(signatures.size).toBe(5)
 expect(hangangMythicPaths('ordinary-fish',5)).toEqual([])
})
it('writes actual historical letter forms in large contrasting strokes beside the hands',()=>{
 for(const letter of ['ㆍ','ㅡ','ㅣ','ㆁ','ㅿ','ㆆ','가','나','다'])expect(hunminLetterForms[letter]?.length).toBeGreaterThan(0)
 const strokes=hangangMythicPaths('hangang-hunmin-spirit',4.8)
 for(const color of [0x172e2a,0xffd88d,0x65d6c5])expect(strokes.some(s=>s.color===color)).toBe(true)
 expect(strokes.some(s=>s.width>=.01)).toBe(true)
 expect(strokes.flatMap(s=>s.points).every(([x,y])=>x>.5&&y>.3&&y<.65)).toBe(true)
})
it('keeps the world and shield behind bodies and synchronizes all three drum beats with contact',()=>{
 for(const id of ['hangang-mago-creator','hangang-immortal-turtle-ship','hangang-ungnyeo-mother'])expect(hangangMythicPaths(id,4.8).some(p=>p.layer==='back')).toBe(true)
 for(const time of redCheerBeatTimes){expect(hangangMythicFrame('hangang-red-cheer-incarnation',time)).toBe(5);expect(hangangMythicPaths('hangang-red-cheer-incarnation',time+.01).some(p=>p.closed)).toBe(true)}
 expect(hangangMythicFrame('hangang-red-cheer-incarnation',5.95)).toBe(0)
})
