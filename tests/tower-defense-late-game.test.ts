// @vitest-environment node
import fs from 'node:fs'
import sharp from 'sharp'
import {expect,it} from 'vitest'
import {createDefense,beginDefense,configureStartingWave,startWave,build,upgrade,specialize,specializationCost,damageOf,intervalOf,cellAt,MAX_WAVES,WAVES,MONSTERS,healthScale} from '@/features/arcade/tower-defense-engine'
import {DEFENSE_ART} from '@/features/arcade/tower-defense-assets'
it('has bounded elite-only late waves and a distinct ground/flying boss at forty/fifty',()=>{
 expect(MAX_WAVES).toBe(50)
 for(const wave of WAVES.slice(30)){
  expect(Object.values(wave.counts).reduce((a,b)=>a+b,0)).toBeLessThanOrEqual(64)
  expect(['crab','swift','swarm','splitter','mini','airJelly'].some(k=>k in wave.counts)).toBe(false)
 }
 expect(WAVES[39].counts.ironKing).toBe(1);expect(MONSTERS.ironKing.layer).toBe('ground')
 expect(WAVES[49].counts.eclipseDragon).toBe(1);expect(MONSTERS.eclipseDragon.layer).toBe('air')
 expect(healthScale(50)/healthScale(30)).toBeCloseTo(2.3)
 for(let wave=31;wave<=50;wave++)expect(healthScale(wave)).toBeGreaterThan(healthScale(wave-1))
})
it('opens paid, irreversible specialization after thirty and preserves real sale investment',()=>{
 const s=createDefense(42);beginDefense(s);s.gold=10000
 const cell=cellAt(5,8);build(s,cell,'missile');for(let i=0;i<3;i++)upgrade(s,cell)
 const b=s.buildings[0],before=s.gold,spent=b.spent,damage=damageOf(b),interval=intervalOf(b)
 expect(specialize(s,cell,'power')).toBe(false)
 s.wave=30;s.phase='combat';expect(specialize(s,cell,'power')).toBe(false)
 s.phase='build';expect(specialize(s,cell,'power')).toBe(true)
 expect(damageOf(b)).toBeCloseTo(damage*1.3);expect(intervalOf(b)).toBe(interval)
 expect(s.gold).toBe(before-specializationCost(b));expect(b.spent).toBe(spent+specializationCost(b))
 expect(specialize(s,cell,'rapid')).toBe(false)
})
it('allows practicing the final stage with preparation income and unlocked specialization',()=>{
 const s=createDefense();beginDefense(s);expect(configureStartingWave(s,50)).toBe(true)
 expect(s.gold).toBeGreaterThan(10000)
 build(s,cellAt(5,8),'sniper');for(let i=0;i<3;i++)upgrade(s,cellAt(5,8))
 const b=s.buildings[0],base=intervalOf(b);expect(specialize(s,b.cell,'rapid')).toBe(true);expect(intervalOf(b)).toBeCloseTo(base*.8)
 expect(startWave(s)).toBe(true);expect(s.wave).toBe(50);expect(s.plan.filter(k=>k==='eclipseDragon')).toHaveLength(1)
})
it('preserves the original eighteen enemy rows and safely appends six animated elites',async()=>{
 const old=await sharp('public/arcade/tower-defense/enemies-v7-sprite.png').ensureAlpha().raw().toBuffer()
 const {data,info}=await sharp('public'+DEFENSE_ART.enemies).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 expect([info.width,info.height]).toEqual([1024,24*256]);expect(data.subarray(0,old.length).equals(old)).toBe(true)
 for(let frame=72;frame<96;frame++){
  let opaque=0,edge=0
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const alpha=data[((Math.floor(frame/4)*256+y)*1024+(frame%4)*256+x)*4+3]
   if(alpha>128)opaque++;if(x<4||x>251||y<4||y>251)edge=Math.max(edge,alpha)
  }
  expect(opaque).toBeGreaterThan(1000);expect(edge).toBe(0)
 }
 expect(fs.existsSync('public/arcade/tower-defense/late-art-manifest.json')).toBe(true)
})
