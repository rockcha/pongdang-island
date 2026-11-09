// @vitest-environment node
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {expect,it} from 'vitest'
import {weatherCreatures,weatherPracticePool} from '@/features/fishing/weather-creatures'
import {weatherKinds} from '@/features/fishing/weather'
import {mythicSwimAsset,mythicSheetColumns,mythicSwimFrame} from '@/features/aquarium/mythic-swim'
const root='assets/storage-upload/new/20261104-170551'
function frameHashes(pixels:{data:Buffer;info:{width:number;height:number;channels:number}},columns:number){
 const {data,info}=pixels,cell=info.width/columns,hashes=[]
 for(let frame=0;frame<columns*2;frame++){
  const hash=createHash('sha256'),left=frame%columns*cell,top=Math.floor(frame/columns)*cell
  for(let y=0;y<cell;y++){
   const start=((top+y)*info.width+left)*info.channels
   hash.update(data.subarray(start,start+cell*info.channels))
  }
  hashes.push(hash.digest('hex'))
 }
 return hashes
}
it('keeps the operator pool derived from the catalog with Pongi, fairies and decorations',()=>{
 const catalog=JSON.parse(fs.readFileSync('supabase/catalog/catalog.json','utf8'))
 expect(weatherCreatures).toHaveLength(20)
 for(const kind of weatherKinds){
  expect(weatherPracticePool(kind)).toHaveLength(4)
  for(const s of weatherPracticePool(kind)){
   const original=catalog.collectible_species.find(r=>r.id===s.id)
   expect(s).toEqual({...original,swim_y_min:original.swim_y_min===null?null:Number(original.swim_y_min),swim_y_max:original.swim_y_max===null?null:Number(original.swim_y_max),speed:Number(original.speed)})
   if(s.kind==='decoration')expect(s.sell_price).toBe(1200)
   else{expect(s.sell_price).toBeGreaterThanOrEqual(2000);expect(s.sell_price).toBeLessThanOrEqual(2500)}
  }
 }
})
it.each(weatherCreatures.filter(s=>s.id.startsWith('weather-spirit-')))('connects $id to eight distinct aligned poses with safe original margins',async s=>{
 const batch='assets/storage-upload/new/20261109-170000'
 const read=(name:string)=>JSON.parse(fs.readFileSync(`${batch}/${name}`,'utf8').replace(/^\uFEFF/,''))
 const originals=read('audit.json').results,finals=read('final-audit.json').results,registration=read('registration.json')
  expect(s.sell_price).toBe(2500)
  for(const audit of [originals,finals]){
   const sprite=audit.find(r=>r.id===s.id&&r.type==='sprite')
   expect(sprite.warnings).toEqual([])
   expect(sprite.frames).toHaveLength(8)
   for(const frame of sprite.frames)expect(frame.margin).toBeGreaterThanOrEqual(sprite.cell*.08)
  }
  const record=registration.find(r=>r.id===s.id)
  expect(record.rgbaPreserved).toBe(true)
  expect(record.frames.every(f=>f.rmse<30)).toBe(true)
  const asset=mythicSwimAsset(s.sprite_sheet_path!,s.rarity)!
  expect(asset).toBeTruthy();expect(mythicSheetColumns(asset.path)).toBe(4)
  expect(fs.readFileSync('public'+asset.url)).toEqual(fs.readFileSync(`${batch}/${s.sprite_sheet_path}`))
  const metadata=await sharp('public'+asset.url).metadata(),cell=metadata.width!/4
  expect(metadata.hasAlpha).toBe(true);expect(metadata.height).toBe(cell*2)
  const hashes=frameHashes(await sharp('public'+asset.url).ensureAlpha().raw().toBuffer({resolveWithObject:true}),4)
  expect(new Set(hashes).size).toBe(8)
  expect(new Set(Array.from({length:120},(_,i)=>mythicSwimFrame(asset.path,i/20,0)))).toEqual(new Set([0,1,2,3,4,5,6,7]))
  expect(mythicSwimFrame(asset.path,5,0,true)).toBe(0)
})
it.each(weatherCreatures.filter(s=>s.id.startsWith('weather-pongi-')))('keeps $id transparent with four distinct frames and stable head anchors',async s=>{
 const anchors=JSON.parse(fs.readFileSync(`${root}/anchors-final.json`,'utf8').replace(/^\uFEFF/,''))
  const thumb=await sharp(`${root}/${s.thumbnail_path}`).metadata()
  expect(thumb.hasAlpha).toBe(true);expect(thumb.width).toBe(thumb.height)
  const sprite=await sharp(`${root}/${s.sprite_sheet_path}`).metadata(),cell=sprite.width!/2
  expect(sprite.hasAlpha).toBe(true);expect(sprite.height).toBe(sprite.width)
  const hashes=frameHashes(await sharp(`${root}/${s.sprite_sheet_path}`).ensureAlpha().raw().toBuffer({resolveWithObject:true}),2)
  expect(new Set(hashes).size).toBe(4)
  const anchor=anchors.find(a=>a.storage_path===s.sprite_sheet_path)
  expect(anchor.frames).toHaveLength(4)
  for(const frame of anchor.frames){expect(frame.dx).toBe(0);expect(frame.dy).toBe(0);expect(frame.rmse).toBeLessThan(15)}
})
