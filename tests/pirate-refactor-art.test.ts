// @vitest-environment node
import {it,expect} from 'vitest'
import fs from 'node:fs'
import {mythicSwimAsset,mythicSwimFrame,mythicSwimLayout} from '../src/features/aquarium/mythic-swim'
import catalog from '../supabase/catalog/catalog.json'
const root='assets/storage-upload/new/20261027-090400'
const read=(file:string)=>JSON.parse(fs.readFileSync(file,'utf8'))
it('uses versioned pirate images and preserves both historical mythic aliases',()=>{
 const items=read(root+'/manifest.json').items
 expect(items).toHaveLength(9)
 for(const i of items){
  const species=catalog.collectible_species.find(s=>s.id===i.id)!
  expect(species.thumbnail_path).toMatch(/_v2_thumbnail\.png$/)
  expect(species.sprite_sheet_path).toMatch(/_v2_sprite\.png$/)
  expect(species.sell_price).toBe(i.previous.sell_price)
  if(i.frames!==8)continue
  for(const version of [1,2]){
   const asset=mythicSwimAsset(`fish/mythic/${i.id}_swim8_v${version}_sprite.png`,'mythic')!
   expect(asset.url).toBe(`/aquarium/swim/${i.id}_swim8_v2_sprite.png`)
   expect(fs.existsSync('public'+asset.url)).toBe(true)
   expect([...new Set(Array.from({length:600},(_,n)=>mythicSwimFrame(asset.path,n/100,0)))].sort()).toEqual([0,1,2,3,4,5,6,7])
   expect(new Set(Array.from({length:8},(_,frame)=>mythicSwimLayout(asset.path,frame)!.scale)).size).toBe(1)
   expect(mythicSwimFrame(asset.path,4.6,0,true)).toBe(0)
  }
 }
 expect(items.find((i:any)=>i.id==='plunder-bloodsail').name).toBe('탐욕의 황금손')
 expect(items.find((i:any)=>i.id==='plunder-barca').name).toBe('저주받은 황금함대')
})
it('passes original alpha margins and measures every pose with opaque rigid anatomy patches',()=>{
 const audit=read(root+'/audit.json'),reports=read(root+'/registration.json')
 expect(audit.results).toHaveLength(18)
 for(const r of audit.results){expect(r.warnings).toEqual([]);expect(r.missing).toBeFalsy()}
 expect(reports).toHaveLength(9)
 for(const report of reports){
  expect(report.anchorRegistration.frames).toHaveLength(report.storage_path.includes('swim8')?8:4)
  expect(Math.max(...report.anchorRegistration.frames.map((f:any)=>f.rmse))).toBeLessThan(60)
  expect(report.anchorRegistration.patch[2]*report.anchorRegistration.patch[3]).toBeGreaterThan(400)
 }
})
