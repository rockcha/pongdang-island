// @vitest-environment node
import {describe,it,expect} from 'vitest'
import fs from 'node:fs'
import sharp from 'sharp'
import {premiumSwimFrame} from '../src/features/aquarium/premium-swim-frame'
import {swimFrameLayout} from '../src/features/aquarium/swim-frame-layout'
const {root}=JSON.parse(fs.readFileSync('artifacts/shared-wonders-root.json','utf8'))
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'))
const registration=JSON.parse(fs.readFileSync(root+'/registration.json','utf8').replace(/^\uFEFF/,''))
describe('shared common release artwork',()=>{
 it.each(manifest.items)('$id has complete transparent four-frame artwork, measured anchors and a continuous reduced-motion-safe loop',async(item:any)=>{
  expect(item.rarity).toBe('common');expect(item.frames).toBe(4)
  const report=registration.find((r:any)=>r.id===item.id)
  expect(report).toBeDefined();expect(report.rawAudit.bounds).toHaveLength(4)
  const image=await sharp(root+'/'+item.sprite_sheet_path).metadata()
  expect(image.hasAlpha).toBe(true);expect(image.width).toBe(image.height)
  const raw=await sharp(root+'/sources/'+item.id+'-sprite.source').metadata()
  for(const b of report.rawAudit.bounds){
   const [x,y,w,h]=b
   expect(Math.min(x,y,raw.width!/2-x-w,raw.height!/2-y-h)).toBeGreaterThanOrEqual(1)
  }
  const {data,info}=await sharp(root+'/'+item.sprite_sheet_path).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const [x,y,w,h]=report.anchorRegistration.patch
  let opaque=0,samples=0
  for(let py=y;py<y+h;py+=3)for(let px=x;px<x+w;px+=3){samples++;if(data[(py*info.width+px)*4+3]>=128)opaque++}
  expect(opaque).toBeGreaterThanOrEqual(20);expect(opaque/samples).toBeGreaterThanOrEqual(.5)
  expect(report.anchorRegistration.frames).toHaveLength(4)
  for(const frame of report.anchorRegistration.frames){
   expect(Number.isFinite(frame.rmse)).toBe(true);expect(frame.rmse).toBeLessThanOrEqual(60)
   const layout=swimFrameLayout(item.sprite_sheet_path,frame.frame)
   expect(layout.scale).toBeCloseTo(report.scale);expect(layout.originX).toBeCloseTo(.5+frame.dx/report.cell);expect(layout.originY).toBeCloseTo(.5+frame.dy/report.cell)
  }
  const cycle=Array.from({length:7},(_,step)=>premiumSwimFrame(item.sprite_sheet_path,step/4,0,99))
  expect(new Set(cycle)).toEqual(new Set([0,1,2,3]))
  for(let step=1;step<cycle.length;step++)expect(Math.abs(cycle[step]-cycle[step-1])).toBe(1)
  for(const time of [0,.25,1,4,100])expect(premiumSwimFrame(item.sprite_sheet_path,time,123,99,true)).toBe(0)
  const generation=JSON.parse(fs.readFileSync(root+'/generation/'+item.id+'-thumbnail.json','utf8'))
  expect(generation.styleReference).toContain('shared-refining-herring_v1_thumbnail.png')
 })
 it('leaves unrelated existing animation selection unchanged',()=>{
  expect(premiumSwimFrame('fish/normal/unrelated_sprite.png',1,0,2)).toBe(2)
 })
})
