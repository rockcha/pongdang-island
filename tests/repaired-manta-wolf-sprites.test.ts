// @vitest-environment node
import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
const root='assets/storage-upload/new/20261021-001529/'
const read=(name:string)=>JSON.parse(readFileSync(root+name,'utf8').replace(/^\uFEFF/,''))
it('keeps repaired swim poses inside four cells and aligns their rigid heads without old offsets',()=>{
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 const registration=read('registration.json'),audit=read('sprite-audit.json')
 expect(registration).toHaveLength(2)
 for(const r of registration){
  expect(catalog.collectible_species.some(s=>s.sprite_sheet_path===r.storage_path)).toBe(true)
  const sheet=audit.sprites.find(s=>s.file.endsWith(r.storage_path))
  const png=readFileSync(root+r.storage_path)
  expect(png.readUInt32BE(16)).toBe(png.readUInt32BE(20))
  expect(sheet.frames).toHaveLength(4)
  for(const f of sheet.frames){
   expect(Math.min(f.x,f.y,sheet.cellWidth-f.x-f.width,sheet.cellHeight-f.y-f.height)).toBeGreaterThan(8)
   expect(Math.max(f.widthRatio,f.heightRatio)).toBeLessThanOrEqual(.9)
   const head=r.frames[f.frame]
   expect(Math.abs(head.dx)+Math.abs(head.dy)).toBeLessThanOrEqual(2)
   expect(swimFrameLayout(r.storage_path,f.frame)).toEqual({originX:.5,originY:.5,scale:1})
  }
 }
})
