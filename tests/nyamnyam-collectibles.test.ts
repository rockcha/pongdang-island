import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {mythicSwimAsset,mythicSwimFrame,mythicSheetColumns} from '@/features/aquarium/mythic-swim'

const root='assets/storage-upload/new/20261023-034400/'
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''))

it('registers the requested 48 inhabitants with exact fish price averages and lower decoration/trash values',()=>{
 const manifest=read(root+'manifest.json'),catalog=read('supabase/catalog/catalog.json')
 expect(manifest.items).toHaveLength(48)
 const species=manifest.items.map((p:any)=>catalog.collectible_species.find((s:any)=>s.id===p.id))
 expect(species.every(Boolean)).toBe(true)
 for(const s of species){
  expect(s.native_region_id).toBe('nyamnyam')
  expect(catalog.collectible_habitats).toContainEqual({species_id:s.id,region_id:'nyamnyam'})
  expect(s.movement_type).toBeTruthy()
  if(s.kind==='decoration')expect([s.swim_y_min,s.swim_y_max]).toEqual([null,null])
  else expect(Number(s.swim_y_min)).toBeLessThan(Number(s.swim_y_max))
 }
 for(const [rarity,average] of Object.entries({common:54,rare:310,epic:887,mythic:2400})){
  const fish=species.filter((s:any)=>s.kind==='fish'&&s.rarity===rarity)
  expect(fish.reduce((sum:number,s:any)=>sum+s.sell_price,0)/fish.length).toBe(average)
  const decorations=species.filter((s:any)=>s.kind==='decoration'&&s.rarity===rarity)
  if(decorations.length)expect(Math.max(...decorations.map((s:any)=>s.sell_price))).toBeLessThan(Math.min(...fish.map((s:any)=>s.sell_price)))
 }
 expect(species.filter((s:any)=>s.kind==='trash')).toHaveLength(4)
 expect(species.filter((s:any)=>s.kind==='decoration')).toHaveLength(14)
 expect(Math.max(...species.filter((s:any)=>s.kind==='trash').map((s:any)=>s.sell_price))).toBeLessThan(32)
 const pot=species.find((s:any)=>s.id==='nyamnyam-millennium-dragon-cauldron')
 expect(pot).toMatchObject({kind:'decoration',rarity:'epic',movement_type:'fixed'})
 expect(pot.sprite_sheet_path).toBeTruthy()
})

it('exports safe four-frame sheets and three distinct eight-pose mythics with a complete six-second action cycle',()=>{
 const manifest=read(root+'manifest.json'),audit=read(root+'sprite-audit.json'),catalog=read('supabase/catalog/catalog.json')
 expect(audit.missing).toEqual([])
 expect(audit.thumbnails).toBe(48)
 expect(audit.sprites).toHaveLength(35)
 for(const sheet of audit.sprites){
  expect(sheet.safe,sheet.id).toBe(true)
  expect(sheet.width/sheet.height).toBe(sheet.columns/2)
 }
 for(const p of manifest.items){
  const thumbnail=readFileSync(root+p.thumbnail_path)
  expect(thumbnail.subarray(1,4).toString()).toBe('PNG')
  if(p.frames!==8)continue
  const s=catalog.collectible_species.find((s:any)=>s.id===p.id),asset=mythicSwimAsset(s.sprite_sheet_path,'mythic')!
  expect(asset,p.id).not.toBeNull()
  expect(mythicSheetColumns(asset.path)).toBe(4)
  const png=readFileSync('public'+asset.url)
  expect(png.readUInt32BE(16)/png.readUInt32BE(20)).toBe(2)
  expect(new Set(Array.from({length:60},(_,i)=>mythicSwimFrame(asset.path,i/10,0)))).toEqual(new Set([0,1,2,3,4,5,6,7]))
  expect(mythicSwimFrame(asset.path,4.6,0,true)).toBe(0)
  const compatibility=readFileSync(root+s.sprite_sheet_path)
  expect(compatibility.readUInt32BE(16)).toBe(compatibility.readUInt32BE(20))
 }
})
