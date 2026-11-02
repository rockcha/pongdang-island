import {expect,it} from 'vitest'
import {hangangMythicIds,hangangMythicPaths,hasHangangMythicEffect,hunminLetterForms,hunminPhrase,hunminEffectPeriod} from '@/features/aquarium/hangang-mythic-effects'
import {hangangMythicFrame,redCheerBeatTimes} from '@/features/aquarium/hangang-mythic-motion'
it('keeps the slower effects bounded, periodic and disabled under reduced motion',()=>{
 const signatures=new Set<string>()
 for(const id of hangangMythicIds){
  expect(hasHangangMythicEffect(id)).toBe(true)
  signatures.add(JSON.stringify(hangangMythicPaths(id,5)))
  const period=id.includes('hunmin')?hunminEffectPeriod*4:id.includes('red-cheer')?6:12
  expect(hangangMythicPaths(id,5)).toEqual(hangangMythicPaths(id,5+period))
  expect(hangangMythicPaths(id,5,0,true)).toEqual([])
  for(let t=0;t<52;t+=.4)for(const s of hangangMythicPaths(id,t)){
   expect(s.alpha>0&&s.alpha<=1).toBe(true)
   expect([...s.points,...(s.mesh?.flat()??[])].every(p=>p.every(v=>Number.isFinite(v)&&v>=0&&v<=1)),id+' '+t).toBe(true)
  }
 }
 expect(signatures.size).toBe(5)
 expect(hangangMythicPaths('ordinary-fish',5)).toEqual([])
})
it('uses actual serif glyph meshes and holds each clear letter with two-second quiet intervals',()=>{
 for(const letter of ['ㆍ','ㅡ','ㅣ','ㆁ','ㅿ','ㆆ','가','나','다'])expect(hunminLetterForms[letter]?.triangles.length).toBeGreaterThan(0)
 for(const t of [10,11,12,13])expect(hunminPhrase(t)).toEqual({letters:['가'],alpha:1})
 for(const t of [7.5,8,14.5,15,28.5,29,49.5,50])expect(hunminPhrase(t)).toBeNull()
 expect(hunminPhrase(32)?.letters).toEqual(['ㆁ'])
 expect(hunminPhrase(39)?.letters).toEqual(['ㅿ'])
 expect(hunminPhrase(46)?.letters).toEqual(['ㆆ'])
 expect(hunminPhrase(10+hunminEffectPeriod)).toEqual(hunminPhrase(10))
 const glyphs=hangangMythicPaths('hangang-hunmin-spirit',11).filter(s=>s.mesh)
 expect(glyphs.length).toBeGreaterThan(0)
 expect(glyphs.every(s=>s.glyphCenter&&s.mesh!.flat().every(([x,y])=>x>.7&&x<.88&&y>.4&&y<.56))).toBe(true)
})
it('keeps magic close to hands and replaces the ship-wide shield with a short mouth flame',()=>{
 for(const id of ['hangang-mago-creator','hangang-ungnyeo-mother']){
  const paths=hangangMythicPaths(id,5)
  expect(paths.length).toBeGreaterThan(0)
  expect(paths.every(s=>s.layer==='front'&&s.points.every(([x,y])=>x>.55&&x<.9&&y>.3&&y<.6))).toBe(true)
 }
 expect(hangangMythicPaths('hangang-immortal-turtle-ship',1)).toEqual([])
 const flame=hangangMythicPaths('hangang-immortal-turtle-ship',5.2)
 expect(flame.some(s=>s.fill&&s.color===0xffefbd)).toBe(true)
 expect(flame.every(s=>s.points.every(([x,y])=>x>.71&&x<.86&&y>.57&&y<.65))).toBe(true)
 for(const time of redCheerBeatTimes){expect(hangangMythicFrame('hangang-red-cheer-incarnation',time)).toBe(5);expect(hangangMythicPaths('hangang-red-cheer-incarnation',time+.01).some(p=>p.closed)).toBe(true)}
})
