// @vitest-environment node
import {expect,it} from 'vitest'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {mythicSwimAsset} from '@/features/aquarium/mythic-swim'
const root='assets/storage-upload/new/20261102-091000/'
const read=(p:string)=>JSON.parse(fs.readFileSync(root+p,'utf8').replace(/^\uFEFF/,''))
it('preserves unclipped original poses, actual alpha and independently measured rigid faces',()=>{
 for(const p of ['audit.json','final-audit.json']){
  const results=read(p).results
  expect(results).toHaveLength(10)
  for(const r of results){expect(r.missing).toBeFalsy();expect(r.warnings,r.id).toEqual([])}
 }
 const originals=read('individual-pose-audit.json')
 expect(originals).toHaveLength(8)
 for(const pose of originals)expect(pose.margin/pose.width).toBeGreaterThanOrEqual(.08)
 for(const n of [4,8])for(const s of read(`final-registration-${n}.json`))for(const f of s.frames){
  expect([f.dx,f.dy],s.storage_path+' '+f.frame).toEqual([0,0]);expect(f.rmse).toBeLessThan(60)
 }
 // Drum movement relative to the registered face stays below one display pixel.
 for(const f of read('red-secondary-registration.json').frames){expect(Math.abs(f.dx)).toBeLessThanOrEqual(3);expect(Math.abs(f.dy)).toBeLessThanOrEqual(3);expect(f.rmse).toBeLessThan(60)}
})
it('ships eight physically distinct poses with exact compatibility pixels and no double correction',async()=>{
 for(const i of read('manifest.json').items.filter(i=>i.frames===8)){
  const asset=mythicSwimAsset(i.compatibility_path,'mythic')!
  expect(asset).toBeTruthy()
  expect(asset.url).toContain('_swim8_v2_sprite.png')
  const sheet=await sharp(root+i.sprite_sheet_path).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const compat=await sharp(root+i.compatibility_path).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  const cell=sheet.info.width/4,hashes=new Set<string>()
  expect(fs.readFileSync('public'+asset.url).equals(fs.readFileSync(root+i.sprite_sheet_path))).toBe(true)
  for(let f=0;f<8;f++){
   const frame=Buffer.alloc(cell*cell*4)
   for(let y=0;y<cell;y++){
    const begin=((Math.floor(f/4)*cell+y)*sheet.info.width+f%4*cell)*4
    sheet.data.copy(frame,y*cell*4,begin,begin+cell*4)
    if(f<4){const other=((Math.floor(f/2)*cell+y)*compat.info.width+f%2*cell)*4;expect(compat.data.subarray(other,other+cell*4).equals(frame.subarray(y*cell*4,(y+1)*cell*4))).toBe(true)}
   }
   hashes.add(createHash('sha256').update(frame).digest('hex'))
  }
  expect(hashes.size).toBe(8)
 }
 for(const r of read('registration.json'))expect(r.rgbaPreserved).toBe(true)
})
