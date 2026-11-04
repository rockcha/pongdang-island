// @vitest-environment node
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {expect,it} from 'vitest'
import {weatherCreatures,weatherPracticePool} from '@/features/fishing/weather-creatures'
import {weatherKinds} from '@/features/fishing/weather'
const root='assets/storage-upload/new/20261104-170551'
it('keeps the operator pool derived from the catalog and has two creatures per weather',()=>{
 const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
 expect(weatherCreatures).toHaveLength(10)
 for(const kind of weatherKinds){
  expect(weatherPracticePool(kind)).toHaveLength(2)
  for(const s of weatherPracticePool(kind)){
   const original=catalog.collectible_species.find(r=>r.id===s.id)
   expect(s).toEqual({...original,swim_y_min:Number(original.swim_y_min),swim_y_max:Number(original.swim_y_max),speed:Number(original.speed)})
   expect(s.sell_price).toBeGreaterThanOrEqual(2000);expect(s.sell_price).toBeLessThanOrEqual(2500)
  }
 }
})
it('has transparent thumbnails and four distinct square animation frames with stable head anchors',async()=>{
 const anchors=JSON.parse(fs.readFileSync(`${root}/anchors-final.json`,'utf8').replace(/^\uFEFF/,''))
 for(const s of weatherCreatures){
  const thumb=await sharp(`${root}/${s.thumbnail_path}`).metadata()
  expect(thumb.hasAlpha).toBe(true);expect(thumb.width).toBe(thumb.height)
  const sprite=await sharp(`${root}/${s.sprite_sheet_path}`).metadata(),cell=sprite.width!/2
  expect(sprite.hasAlpha).toBe(true);expect(sprite.height).toBe(sprite.width)
  const hashes=[]
  for(let frame=0;frame<4;frame++){
   const pixels=await sharp(`${root}/${s.sprite_sheet_path}`).extract({left:frame%2*cell,top:Math.floor(frame/2)*cell,width:cell,height:cell}).raw().toBuffer()
   hashes.push(createHash('sha256').update(pixels).digest('hex'))
  }
  expect(new Set(hashes).size).toBe(4)
  const anchor=anchors.find(a=>a.storage_path===s.sprite_sheet_path)
  expect(anchor.frames).toHaveLength(4)
  for(const frame of anchor.frames){expect(frame.dx).toBe(0);expect(frame.dy).toBe(0);expect(frame.rmse).toBeLessThan(15)}
 }
})
