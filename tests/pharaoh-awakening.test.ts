// @vitest-environment node
import fs from 'node:fs'
import sharp from 'sharp'
import {expect,it,vi} from 'vitest'
import {mythicSwimAsset,mythicSwimFrame,mythicSwimLayout} from '@/features/aquarium/mythic-swim'
import {pharaohGoldenPaths,pharaohAwakeningLight} from '@/features/aquarium/pharaoh-golden-effects'
import {PharaohGoldenRenderer} from '@/features/aquarium/pharaoh-golden-renderer'
const batch='assets/storage-upload/new/20261030-101406/',read=(p:string)=>JSON.parse(fs.readFileSync(batch+p,'utf8').replace(/^\uFEFF/,'')),registrations=read('registration.json')
it('retains safe source margins and aligns three independent rigid anchors for every creature',()=>{
 expect(registrations).toHaveLength(4)
 for(const r of registrations){expect(r.probes).toHaveLength(3);expect(r.rawAudit.bounds.every(b=>b.minMargin>=.08)).toBe(true)}
 for(const p of read('final-registration.json'))for(const f of p.frames){expect(Math.max(Math.abs(f.dx),Math.abs(f.dy))).toBeLessThanOrEqual(4);expect(f.rmse).toBeLessThan(40)}
})
it('preserves every nontransparent source pixel while translating whole frames with common padding',async()=>{
 for(const r of registrations){
  const source=await sharp(batch+r.normalized_source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),final=await sharp(batch+r.storage_path).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  let valid=true,count=0
  for(const f of r.frames)for(let y=0;y<r.sourceCell;y++)for(let x=0;x<r.sourceCell;x++){
   const s=((Math.floor(f.frame/4)*r.sourceCell+y)*source.info.width+f.frame%4*r.sourceCell+x)*4;if(!source.data[s+3])continue
   const d=((Math.floor(f.frame/4)*r.cell+y+r.padding-f.dy)*final.info.width+f.frame%4*r.cell+x+r.padding-f.dx)*4
   count++;if(!source.data.subarray(s,s+4).equals(final.data.subarray(d,d+4)))valid=false
  }
  expect(count).toBeGreaterThan(10000);expect(valid,r.id).toBe(true)
 }
})
it('uses all eight poses, a neutral recovery and a fixed scale in both renderers',()=>{
 for(const r of registrations){
  const asset=mythicSwimAsset(read('manifest.json').assets.find(a=>a.id===r.id&&a.role==='compat').path,'mythic')!
  expect(asset).toBeTruthy()
  expect(new Set(Array.from({length:360},(_,n)=>mythicSwimFrame(asset.path,n/60,0)))).toEqual(new Set([0,1,2,3,4,5,6,7]))
  expect(mythicSwimFrame(asset.path,5.99,0)).toBe(0);expect(mythicSwimFrame(asset.path,6,0)).toBe(0)
  const current=mythicSwimLayout(asset.path,0)!
  expect(current.scale).toBeGreaterThan(0)
  for(let frame=0;frame<8;frame++)expect(mythicSwimLayout(asset.path,frame)).toEqual({originX:.5,originY:.5,scale:current.scale})
  expect(mythicSwimFrame(asset.path,5,0,true)).toBe(0)
 }
})
it('confines peak light to the two-second awakening and freezes ambient engravings in reduced motion',()=>{
 expect(pharaohAwakeningLight(3.99)).toBe(0);expect(pharaohAwakeningLight(5)).toBe(1)
 expect(pharaohAwakeningLight(5.999)).toBeLessThan(.001);expect(pharaohAwakeningLight(6)).toBe(0)
 for(const r of registrations){
  expect(pharaohGoldenPaths(r.id,5,0,true)).toEqual(pharaohGoldenPaths(r.id,0,0,true))
  const energy=(time:number)=>pharaohGoldenPaths(r.id,time).reduce((sum,p)=>sum+p.alpha,0)
  expect(energy(5)).toBeGreaterThan(energy(1))
  for(let n=0;n<120;n++){
   const paths=pharaohGoldenPaths(r.id,n/20)
   expect(paths.length).toBeLessThan(30)
   for(const p of paths){expect(p.alpha).toBeGreaterThan(0);expect(p.alpha).toBeLessThanOrEqual(1);for(const [x,y]of p.points){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(1);expect(y).toBeGreaterThan(0);expect(y).toBeLessThan(1)}}
  }
 }
 expect(pharaohGoldenPaths('other',5)).toEqual([])
})
it('reuses the Phaser layer, mirrors engravings with the creature and destroys it on removal',()=>{
 const graphics:any={};for(const name of ['clear','lineStyle','fillStyle','beginPath','lineTo','moveTo','closePath','fillPath','strokePath','setPosition','setRotation','setScale','setDepth','setAlpha','setVisible','destroy'])graphics[name]=vi.fn(()=>graphics)
 const scene:any={add:{graphics:vi.fn(()=>graphics)}},renderer=new PharaohGoldenRenderer(scene),body:any={flipX:false,originX:.5,originY:.5,x:100,y:120,displayWidth:200,displayHeight:200,depth:1,alpha:1,visible:true,rotation:.2}
 renderer.draw('pharaoh-obelisk-colossus',5,0,false,body);const x=graphics.moveTo.mock.calls[0][0]
 renderer.draw('pharaoh-obelisk-colossus',5.001,0,false,body);expect(graphics.clear).toHaveBeenCalledTimes(1)
 body.flipX=true;renderer.draw('pharaoh-obelisk-colossus',5.001,0,false,body);expect(graphics.clear).toHaveBeenCalledTimes(2)
 expect(graphics.moveTo.mock.calls.findLast(c=>Math.abs(c[0]+x)<.0001)).toBeTruthy()
 renderer.destroy();expect(scene.add.graphics).toHaveBeenCalledTimes(1);expect(graphics.destroy).toHaveBeenCalledOnce()
})
