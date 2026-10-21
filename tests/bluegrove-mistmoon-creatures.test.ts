// @vitest-environment node
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {expect,it} from 'vitest'
import {mythicSwimAsset,mythicSwimFrame,mythicSwimLayout} from '@/features/aquarium/mythic-swim'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
const batch='assets/storage-upload/new/20261021-050000'
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,''))
const manifest=read(`${batch}/manifest.json`),catalog=read('supabase/catalog/catalog.json')
it('registers the requested 17 creatures with regional natives and three global mythics',()=>{
 expect(manifest.species).toHaveLength(17)
 for(const def of manifest.species){
  const species=catalog.collectible_species.find(s=>s.id===def.id)
  expect(species).toMatchObject({kind:def.kind,rarity:def.rarity,native_region_id:def.region})
  expect(species!.sell_price).toBeGreaterThanOrEqual(def.price)
  const habitats=catalog.collectible_habitats.filter(h=>h.species_id===def.id).map(h=>h.region_id).sort()
  expect(habitats).toEqual(def.region?[def.region]:catalog.regions.map(r=>r.id).sort())
 }
 expect(manifest.species.filter(s=>s.region===null)).toHaveLength(3)
 expect(manifest.species.filter(s=>s.kind==='trash').every(s=>s.rarity==='common'&&s.region==='bluegrove')).toBe(true)
})
it('keeps final assets reproducible and every swimming creature facing right',()=>{
 expect(manifest.assets).toHaveLength(32)
 for(const asset of manifest.assets){
  const png=readFileSync(asset.local_path)
  expect(createHash('sha256').update(png).digest('hex'),asset.storage_path).toBe(asset.sha256)
  expect(png.readUInt32BE(16)).toBe(asset.width)
  expect(png.readUInt32BE(20)).toBe(asset.height)
  if(asset.storage_path.startsWith('fish/'))expect(asset.artwork_facing).toBe('right')
 }
})
it('keeps every final swimming pose inside its cell with transparent safety margins',()=>{
 for(const kind of ['normal','rare','epic','mythic'])for(const sheet of read(`${batch}/${kind}-audit.json`).sprites){
  expect(sheet.frames).toHaveLength(kind==='mythic'?8:4)
  for(const frame of sheet.frames){
   expect(frame.alphaPixels,sheet.file).toBeGreaterThan(100)
   expect(Math.min(frame.x,frame.y,sheet.cellWidth-frame.x-frame.width,sheet.cellHeight-frame.y-frame.height),sheet.file).toBeGreaterThan(8)
   expect(Math.max(frame.widthRatio,frame.heightRatio),sheet.file).toBeLessThan(.91)
  }
 }
})
it('anchors all poses to their measured rigid body and retains a constant scale',()=>{
 for(const kind of ['normal','mythic'])for(const captured of read(`${batch}/${kind}-registration.json`)){
  const row=captured.storage_path==='fish/epic/lunea-mirrorscale_sprite.png'
   ?read('assets/storage-upload/new/20261021-103249/registration.json')[0]:captured
  const def=manifest.species.find(s=>row.storage_path.includes(s.id))
  const effective=kind==='mythic'?mythicSwimAsset(row.storage_path,'mythic')!.path:row.storage_path
  const png=readFileSync(row.file),cell=png.readUInt32BE(16)/(kind==='mythic'?4:2)
  const coordinates=row.frames.map(f=>{
   const layout=kind==='mythic'?mythicSwimLayout(effective,f.frame)!:swimFrameLayout(effective,f.frame)
   return [(row.patch[0]+f.dx-layout.originX*cell)*layout.scale,(row.patch[1]+f.dy-layout.originY*cell)*layout.scale,layout.scale]
  })
  for(const position of coordinates)position.forEach((value,i)=>expect(value,def.name).toBeCloseTo(coordinates[0][i]))
  if(kind==='mythic'){
   const asset=mythicSwimAsset(row.storage_path,'mythic')!
   expect(createHash('sha256').update(readFileSync('public'+asset.url)).digest('hex')).toBe(createHash('sha256').update(png).digest('hex'))
   expect(mythicSwimFrame(effective,5,0,true)).toBe(0)
  }
 }
})
