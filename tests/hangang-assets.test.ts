// @vitest-environment node
import {expect,it} from 'vitest'
import fs from 'node:fs'
import sharp from 'sharp'
import {mythicSwimAsset,mythicSwimFrame} from '@/features/aquarium/mythic-swim'
const root='assets/storage-upload/new/20261102-033000/'
const read=(p:string)=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''))
it('keeps all original and final frames clear of edges with real alpha',()=>{
 const audit=read('raw-sprite-audit.json').assets
 expect(audit).toHaveLength(39)
 for(const s of audit){expect(s.valid,s.id).toBe(true);expect(s.frames.length).toBe(s.id.includes('immortal-turtle-ship')||s.id.includes('hunmin-spirit')||s.id.includes('ungnyeo-mother')||s.id.includes('red-cheer-incarnation')?8:4)}
 for(const p of ['audit.json','final-audit.json']){const a=read(p).results;expect(a).toHaveLength(123);expect(a.every(r=>!r.missing&&!r.warnings.length)).toBe(true)}
})
it('preserves original pixels with baked anchors and no runtime double correction',()=>{
 const records=read('registration.json')
 expect(records).toHaveLength(39)
 for(const r of records)expect(r.rgbaPreserved,r.id).toBe(true)
 for(const n of [4,8])for(const s of read(`final-registration-${n}.json`))for(const f of s.frames){expect([f.dx,f.dy],s.storage_path+' '+f.frame).toEqual([0,0]);expect(f.rmse).toBeLessThan(60)}
})
it('keeps a lossless four-pose compatibility sheet and resolves eight distinct six-second mythical poses',async()=>{
 // The original release remains reproducible after newer catalog art replaces it.
 for(const s of read('manifest.json').items.filter(s=>s.rarity==='mythic')){
  const compatibilityPath=`fish/mythic/${s.id}_compat_v1_sprite.png`
  const asset=mythicSwimAsset(compatibilityPath,'mythic')!
  expect(asset).not.toBeNull()
  expect(new Set(Array.from({length:120},(_,n)=>mythicSwimFrame(asset.path,n/20,0)))).toEqual(new Set([0,1,2,3,4,5,6,7]))
  expect(mythicSwimFrame(asset.path,5,0,true)).toBe(0)
  const compatibility=root+compatibilityPath,enhanced=`public/aquarium/swim/${s.id}_swim8_v1_sprite.png`,m=await sharp(compatibility).metadata(),cell=m.width!/2
  expect(m.width).toBe(m.height)
  for(let frame=0;frame<4;frame++){
   const a=await sharp(compatibility).extract({left:frame%2*cell,top:Math.floor(frame/2)*cell,width:cell,height:cell}).ensureAlpha().raw().toBuffer()
   const b=await sharp(enhanced).extract({left:frame*cell,top:0,width:cell,height:cell}).ensureAlpha().raw().toBuffer()
   expect(a.equals(b),s.id+' '+frame).toBe(true)
  }
 }
})
