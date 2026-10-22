import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'

const root='assets/storage-upload/new/20261022-101350/'
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''))
const manifest=read(root+'manifest.json')
const catalog=read('supabase/catalog/catalog.json')

it('makes all ten materials common across every region without making trash swim',()=>{
 expect(manifest.entries).toHaveLength(10)
 for(const entry of manifest.entries){
  const species=catalog.collectible_species.find((s:any)=>s.id===entry.id)
  expect(species.rarity).toBe('common')
  expect(species.native_region_id).toBeNull()
  expect(species.sell_price).toBe(entry.sell_price)
  expect(species.movement_type).toBe(entry.kind==='fish'?'swim':'fixed')
  expect(Boolean(species.sprite_sheet_path)).toBe(entry.kind==='fish')
  const regions=catalog.collectible_habitats.filter((h:any)=>h.species_id===entry.id).map((h:any)=>h.region_id).sort()
  expect(regions).toEqual(catalog.regions.map((r:any)=>r.id).sort())
 }
})

it('keeps all twenty swim poses inside their cells and supplies rigid head registration',()=>{
 const reports=read(root+'registration.json')
 expect(reports).toHaveLength(5)
 for(const report of reports){
  const entry=manifest.entries.find((e:any)=>e.id===report.id)
  expect(report.audit.bounds).toHaveLength(4)
  expect(report.audit.extent).toBeLessThanOrEqual(.86)
  expect(report.audit.samples).toBeGreaterThan(20)
  for(const [x,y,w,h] of report.rawAudit.bounds){
   const cell=report.rawAudit.cell
   expect(Math.min(x,y,cell-x-w,cell-y-h),report.id).toBeGreaterThanOrEqual(4)
  }
  for(let frame=0;frame<4;frame++){
   const layout=swimFrameLayout(entry.storage_path,frame)
   const [dx,dy]=report.audit.shifts[frame]
   // The alignment is baked into the PNG so deployed clients without this
   // runtime layout map still keep the head within two source pixels.
   expect(Math.max(Math.abs(dx),Math.abs(dy))).toBeLessThanOrEqual(2)
   expect(layout.originX).toBeCloseTo(.5+dx/report.audit.cell)
   expect(layout.originY).toBeCloseTo(.5+dy/report.audit.cell)
   expect(layout.scale).toBe(1)
  }
 }
})
