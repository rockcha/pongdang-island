// @vitest-environment node
import {expect,it} from 'vitest'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {spriteAnchorConsensus} from '../scripts/lib/sprite-anchor-consensus.mjs'
import {mythicSwimAsset,mythicSwimFrame,mythicSwimLayout} from '@/features/aquarium/mythic-swim'
const root='assets/storage-upload/new/20261030-094918/',read=(p:string)=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''))
const canonical='fish/mythic/pharaoh-gold-wing-horus_swim8_sprite.png'
it('requires independent rigid anchors and rejects a moving wing match',()=>{
 const before=read('registration.json')[0].probes
 expect(spriteAnchorConsensus(before)[7]).toMatchObject({dx:63,dy:-73})
 expect(()=>spriteAnchorConsensus(before.slice(0,1))).toThrow('three')
 const bad=structuredClone(before);bad[1].frames[7].dx=0
 expect(()=>spriteAnchorConsensus(bad)).toThrow('disagree')
})
it('resolves historical Horus aliases to the current aligned awakening sheet',()=>{
 const batch='assets/storage-upload/new/20261030-101406/',m=JSON.parse(fs.readFileSync(batch+'manifest.json','utf8')),asset=mythicSwimAsset('fish/mythic/pharaoh-gold-wing-horus_compat_v1_sprite.png','mythic')!
 expect(asset.url).toBe('/aquarium/swim/pharaoh-gold-wing-horus_swim8_v3_sprite.png')
 const bytes=fs.readFileSync('public'+asset.url),digest=createHash('sha256').update(bytes).digest('hex')
 expect(digest).toBe(m.assets.find(a=>a.id==='pharaoh-gold-wing-horus'&&a.role==='swim8').sha256)
 const probes=JSON.parse(fs.readFileSync(batch+'final-registration.json','utf8').replace(/^\uFEFF/,''))
 for(const probe of probes.filter(p=>p.storage_path==='pharaoh-gold-wing-horus'))for(const f of probe.frames){expect(Math.max(Math.abs(f.dx),Math.abs(f.dy)),probe.storage_path+' '+f.frame).toBeLessThanOrEqual(4);expect(f.rmse).toBeLessThan(35)}
})
it('preserves every visible RGBA pixel without per-frame scaling or fading',async()=>{
 const before=await sharp(root+'sources/horus-v1-aligned.source').ensureAlpha().raw().toBuffer({resolveWithObject:true}),after=await sharp(root+'fish/mythic/pharaoh-gold-wing-horus_swim8_v2_sprite.png').ensureAlpha().raw().toBuffer()
 const cell=before.info.width/4,shifts=read('registration.json')[0].frames
 let same=true,count=0
 for(const f of shifts)for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
  const ox=f.frame%4*cell,oy=Math.floor(f.frame/4)*cell,s=((oy+y)*before.info.width+ox+x)*4;if(!before.data[s+3])continue
  const d=((oy+y-f.dy)*before.info.width+ox+x-f.dx)*4;count++
  if(!before.data.subarray(s,s+4).equals(after.subarray(d,d+4)))same=false
 }
 expect(count).toBeGreaterThan(100000);expect(same).toBe(true)
})
it('uses intermediate wing poses to recover into a six-second loop with stable body scale',()=>{
 const sampled=Array.from({length:120},(_,n)=>mythicSwimFrame(canonical,n/20,0))
 expect(new Set(sampled)).toEqual(new Set([0,1,2,3,4,5,6,7]))
 expect(mythicSwimFrame(canonical,4,0)).toBe(4)
 expect(mythicSwimFrame(canonical,5.99,0)).toBe(0)
 expect(mythicSwimFrame(canonical,6,0)).toBe(0)
 for(let n=0;n<120;n++){expect(mythicSwimFrame(canonical,n/20+6,0)).toBe(sampled[n]);expect(mythicSwimFrame(canonical,n/20,0,true)).toBe(0)}
 const layouts=Array.from({length:8},(_,n)=>mythicSwimLayout(canonical,n)!)
 expect(new Set(layouts.map(l=>l.scale)).size).toBe(1)
 expect(layouts.every(l=>l.originX===.5&&l.originY===.5)).toBe(true)
})
