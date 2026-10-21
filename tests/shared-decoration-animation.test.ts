import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {sharedDecorationFrame} from '@/features/aquarium/shared-decoration-animation'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'

const ids=['surface-seeking-beanstalk','upward-sinking-waterfall']
it('plays all three new decoration sheets and keeps their registered anchors stable',()=>{
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 const root='assets/storage-upload/new/20261021-134600'
 const registration=JSON.parse(readFileSync(root+'/anchor-registration.json','utf8').replace(/^\uFEFF/,''))
 for(const id of ['parasol-sponge-tree','waterwheel-cascade-tower','levitating-stone-spire']){
  const species=catalog.collectible_species.find(s=>s.id===id)
  const png=readFileSync(root+'/'+species.sprite_sheet_path)
  expect(png.readUInt32BE(16)).toBe(1024)
  expect(png.readUInt32BE(20)).toBe(1024)
  expect(new Set(Array.from({length:48},(_,i)=>sharedDecorationFrame(id,i/8))).size).toBe(4)
  expect(sharedDecorationFrame(id,1,true)).toBe(0)
  expect(sharedDecorationFrame(id,1,false,true)).toBe(0)
  const reg=registration.find(r=>r.storage_path===species.sprite_sheet_path)
  const poses=reg.frames.map(f=>{const l=swimFrameLayout(species.sprite_sheet_path,f.frame);return [(reg.patch[0]+f.dx-l.originX*512)*l.scale,(reg.patch[1]+f.dy-l.originY*512)*l.scale]})
  for(const p of poses){expect(p[0]).toBeCloseTo(poses[0][0]);expect(p[1]).toBeCloseTo(poses[0][1])}
 }
})
it('plays foliage and rising water at distinct rates while reduced motion and editing stay still',()=>{
 expect(sharedDecorationFrame(ids[0],.9)).toBe(1)
 expect(sharedDecorationFrame(ids[1],.9)).toBe(2)
 for(const id of ids){
  for(const time of [0,.4,.9,1.4,3,6]){
   expect(sharedDecorationFrame(id,time,true)).toBe(0)
   expect(sharedDecorationFrame(id,time,false,true)).toBe(0)
  }
  expect(sharedDecorationFrame(id,-1)).toBe(0)
 }
 expect(sharedDecorationFrame('unrelated-decoration',1)).toBeNull()
})
it('registers both as inexpensive epic decorations with real four-frame sheets and fixed body anchors',()=>{
 const catalog=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 const root='assets/storage-upload/new/20261021-123316'
 const registration=JSON.parse(readFileSync(root+'/anchor-registration.json','utf8').replace(/^\uFEFF/,''))
 for(const id of ids){
  const species=catalog.collectible_species.find(s=>s.id===id)
  expect(species).toMatchObject({kind:'decoration',rarity:'epic',movement_type:'fixed',speed:'0'})
  expect(species.sell_price).toBeGreaterThanOrEqual(500)
  expect(species.sell_price).toBeLessThanOrEqual(650)
  const png=readFileSync(root+'/'+species.sprite_sheet_path)
  expect(png.readUInt32BE(16)).toBe(png.readUInt32BE(20))
  const reg=registration.find(r=>r.storage_path===species.sprite_sheet_path)
  expect(reg.frames).toHaveLength(4)
  const poses=reg.frames.map(f=>{const l=swimFrameLayout(species.sprite_sheet_path,f.frame);return [(reg.patch[0]+f.dx-l.originX*512)*l.scale,(reg.patch[1]+f.dy-l.originY*512)*l.scale,l.scale]})
  for(const p of poses){expect(p[0]).toBeCloseTo(poses[0][0]);expect(p[1]).toBeCloseTo(poses[0][1]);expect(p[2]).toBe(poses[0][2])}
 }
})
