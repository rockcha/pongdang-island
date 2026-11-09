// @vitest-environment node
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {expect,it} from 'vitest'
import {weatherCreatures} from '@/features/fishing/weather-creatures'
import {weatherDecorationArtUrl} from '@/features/aquarium/weather-decoration-animation'
import {sharedDecorationFrame} from '@/features/aquarium/shared-decoration-animation'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
import {InhabitantMotion} from '@/features/aquarium/inhabitant-motion'
import type {OwnedCollectible} from '@/features/collection/api'
const batch='assets/storage-upload/new/20261109-173320'
const decorations=weatherCreatures.filter(s=>s.id.startsWith('weather-deco-'))
it('has one 1200-gold decoration for each weather and preserves the fairies',()=>{
 expect(decorations).toHaveLength(5)
 expect(new Set(decorations.map(s=>s.weather_type)).size).toBe(5)
 expect(weatherCreatures.filter(s=>s.id.startsWith('weather-spirit-'))).toHaveLength(5)
 for(const s of decorations)expect(s).toMatchObject({kind:'decoration',rarity:'epic',movement_type:'fixed',speed:0,swim_y_min:null,swim_y_max:null,sell_price:1200,flip_with_direction:false})
 expect(weatherDecorationArtUrl('decorations/epic/unknown_v1_sprite.png')).toBeNull()
})
it.each(decorations)('keeps $id stationary while its reviewed four-frame sheet animates',async s=>{
 const url=weatherDecorationArtUrl(s.sprite_sheet_path!)!,thumb=weatherDecorationArtUrl(s.thumbnail_path)!
 expect(url).toBeTruthy();expect(thumb).toBeTruthy()
 expect(fs.readFileSync('public'+url)).toEqual(fs.readFileSync(`${batch}/${s.sprite_sheet_path}`))
 const pixels=await sharp('public'+url).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 const {data,info}=pixels,cell=info.width/2
 expect(info.width).toBe(info.height)
 const hashes=[]
 for(let f=0;f<4;f++){
  const hash=createHash('sha256')
  for(let y=0;y<cell;y++){
   const start=((Math.floor(f/2)*cell+y)*info.width+f%2*cell)*4
   hash.update(data.subarray(start,start+cell*4))
  }
  hashes.push(hash.digest('hex'))
 }
 expect(new Set(hashes).size).toBe(4)
 expect(new Set(Array.from({length:60},(_,i)=>sharedDecorationFrame(s.id,i/10)))).toEqual(new Set([0,1,2,3]))
 const read=(name:string)=>JSON.parse(fs.readFileSync(`${batch}/${name}`,'utf8').replace(/^\uFEFF/,''))
 for(const name of ['audit.json','final-audit.json']){
  const record=read(name).results.find(r=>r.id===s.id&&r.type==='sprite')
  expect(record.warnings).toEqual([])
  for(const f of record.frames)expect(f.margin).toBeGreaterThanOrEqual(record.cell*.07)
 }
 const final=read('registered-final-4.json').find(r=>r.storage_path===s.sprite_sheet_path)
 for(const f of final.frames){expect(f.dx).toBe(0);expect(f.dy).toBe(0);expect(f.rmse).toBeLessThan(20)}
 const owned:OwnedCollectible={id:s.id,species_id:s.id,species:s,tank_id:'preview',animation_seed:0,position_x:.4,position_y:.6,acquired_at:''}
 const motion=new InhabitantMotion(owned,0),initial={...motion.update(0,0,900,500)}
 for(const time of [0,.5,1,2,3,6,12]){
  const pose=motion.update(time,.1,900,500)
  expect([pose.x,pose.y,pose.angle,pose.direction]).toEqual([initial.x,initial.y,initial.angle,initial.direction])
  expect(sharedDecorationFrame(s.id,time,true)).toBe(0)
  expect(sharedDecorationFrame(s.id,time,false,true)).toBe(0)
  expect(swimFrameLayout(s.sprite_sheet_path!,sharedDecorationFrame(s.id,time)!)).toEqual(swimFrameLayout(s.sprite_sheet_path!,0))
 }
})
