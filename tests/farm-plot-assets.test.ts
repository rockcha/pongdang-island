// @vitest-environment node
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {expect,it} from 'vitest'
import manifest from '../assets/storage-upload/new/20261105-002745/manifest.json'
import {farmPlotImages} from '@/features/farm/plot-art-assets'

it('uses an opaque 512px square soil image with no tapered or transparent edges',async()=>{
 const {data,info}=await sharp('public'+farmPlotImages.empty).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 expect([info.width,info.height]).toEqual([512,512])
 for(let index=3;index<data.length;index+=4)if(data[index]!==255)throw Error('Soil must cover every pixel of the square')
})
it('centers the visible foreground on both axes and keeps every crop isolated on transparent padding',async()=>{
 for(const item of manifest.items.filter(item=>item.layer==='crop')){
  const {data,info}=await sharp('public/'+item.thumbnail_path).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  expect([info.width,info.height]).toEqual([512,512])
  let left=512,top=512,right=-1,bottom=-1,transparent=0
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
   const alpha=data[(y*512+x)*4+3]
   if(alpha===0)transparent++
   if(alpha<manifest.composition.registrationAlphaThreshold)continue
   left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y)
  }
  expect((left+right+1)/2,item.id+' horizontal center').toBe(256)
  expect((top+bottom+1)/2,item.id+' vertical center').toBe(256)
  expect(Math.min(left,top,511-right,511-bottom),item.id+' margin').toBeGreaterThan(48)
  expect(transparent,item.id+' transparent background').toBeGreaterThan(512*512*.5)
 }
})
it('publishes the prepared layer bytes and preserves their manifest hashes',()=>{
 const batch='assets/storage-upload/new/20261105-002745/'
 for(const item of manifest.items){
  const bytes=fs.readFileSync('public/'+item.thumbnail_path)
  expect(createHash('sha256').update(bytes).digest('hex'),item.id).toBe(item.sha256)
  expect(bytes.equals(fs.readFileSync(batch+item.thumbnail_path)),item.id+' prepared copy').toBe(true)
  expect(Object.values(farmPlotImages)).toContain('/'+item.thumbnail_path)
 }
})
