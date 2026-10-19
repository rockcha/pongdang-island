import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {expect,it} from 'vitest'
import {mythicSwimAsset,mythicSwimFrame} from '@/features/aquarium/mythic-swim'
const root='assets/storage-upload/new/20261020-050901/'
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''))
const catalog=read('supabase/catalog/catalog.json')
const manifest=read(root+'manifest.json')
it('registers all mascot assets in the native habitat without missing or stale files',()=>{
 const ids=new Set<string>(manifest.assets.map((a:{id:string})=>a.id))
 expect(ids.size).toBe(13)
 for(const id of ids){
  const species=catalog.collectible_species.find((s:{id:string})=>s.id===id)
  expect(species.native_region_id,id).toBe('pongdang')
  expect(catalog.collectible_habitats.filter((h:{species_id:string})=>h.species_id===id)).toEqual([{species_id:id,region_id:'pongdang'}])
  expect(manifest.assets.some((a:{storage_path:string})=>a.storage_path===species.thumbnail_path)).toBe(true)
  if(species.kind==='fish')expect(manifest.assets.some((a:{storage_path:string})=>a.storage_path===species.sprite_sheet_path)).toBe(true)
 }
 for(const a of manifest.assets){
  const bytes=readFileSync(a.local_path)
  expect(createHash('sha256').update(bytes).digest('hex'),a.storage_path).toBe(a.sha256)
 }
})
it('keeps every new sprite pose inside its cell, including fallback and robot action frames',()=>{
 const audit=read(root+'sprite-audit.json')
 expect(audit.sprites).toHaveLength(8)
 for(const sheet of audit.sprites)for(const f of sheet.frames){
  expect(Math.min(f.x,f.y,sheet.cellWidth-f.x-f.width,sheet.cellHeight-f.y-f.height),sheet.file+' '+f.frame).toBeGreaterThan(10)
  expect(Math.max(f.widthRatio,f.heightRatio),sheet.file+' '+f.frame).toBeLessThan(.9)
 }
 const path='fish/mythic/pongi-exploration-robot_sprite.png'
 const asset=mythicSwimAsset(path,'mythic')!
 expect(asset.path).toBe('fish/mythic/pongi-exploration-robot_swim8_sprite.png')
 expect(new Set(Array.from({length:60},(_,i)=>mythicSwimFrame(asset.path,i/10,0))).size).toBe(8)
 expect(mythicSwimFrame(asset.path,5,0,true)).toBe(0)
 const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex')
 expect(hash('public'+asset.url)).toBe(hash(root+asset.path))
})
