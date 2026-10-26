import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import catalog from '../supabase/catalog/catalog.json'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
const root='assets/storage-upload/new/20261026-154418/'
const read=(p:string)=>JSON.parse(readFileSync(root+p,'utf8').replace(/^\uFEFF/,''))
it('makes the three requested oily fish common catches in every current sea at the requested prices',()=>{
 const prices:Record<string,number>={'shared-oily-horse-mackerel':10,'shared-oily-spanish-mackerel':15,'shared-oily-eel':19}
 for(const [id,price] of Object.entries(prices)){
  const s=catalog.collectible_species.find(s=>s.id===id)!
  expect(s).toMatchObject({kind:'fish',rarity:'common',sell_price:price,native_region_id:null,movement_type:'swim',flip_with_direction:true,travel_direction:'both'})
  expect(catalog.collectible_habitats.filter(h=>h.species_id===id).map(h=>h.region_id).sort()).toEqual(catalog.regions.map(r=>r.id).sort())
  expect(Number(s.swim_y_min)).toBeLessThan(Number(s.swim_y_max))
 }
})
it('keeps the four genuine swim poses inside safe cells with measured stable head anchors',()=>{
 const entries=read('manifest.json').entries,reports=read('registration.json')
 expect(reports).toHaveLength(3)
 for(const r of reports){
  expect(r.audit.extent).toBeLessThan(.86);expect(r.audit.samples).toBeGreaterThan(20)
  for(const b of r.rawAudit.bounds)expect(Math.min(b[0],b[1],r.rawAudit.cell-b[0]-b[2],r.rawAudit.cell-b[1]-b[3])).toBeGreaterThanOrEqual(4)
  const e=entries.find((e:any)=>e.id===r.id)
  for(let frame=0;frame<4;frame++){
   const [dx,dy]=r.audit.shifts[frame],layout=swimFrameLayout(e.storage_path,frame)
   expect(Math.max(Math.abs(dx),Math.abs(dy))).toBeLessThanOrEqual(2)
   expect(layout.originX).toBeCloseTo(.5+dx/r.audit.cell)
   expect(layout.originY).toBeCloseTo(.5+dy/r.audit.cell)
  }
 }
})
