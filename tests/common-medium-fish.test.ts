import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import catalog from '../supabase/catalog/catalog.json'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
import {speciesFacing} from '@/features/aquarium/movement-settings'
const root='assets/storage-upload/new/20261023-150100/'
const read=(file:string)=>JSON.parse(readFileSync(root+file,'utf8').replace(/^\uFEFF/,''))
it('keeps four medium fish common to every region, with complete safe animation cells and bounded head alignment',()=>{
 const manifest=read('manifest.json'),audit=read('sprite-audit.json')
 expect(manifest.items).toHaveLength(4)
 expect(manifest.items.reduce((sum:number,s:any)=>sum+s.sell_price,0)/4).toBe(55)
 for(const item of manifest.items){
  const species=catalog.collectible_species.find(s=>s.id===item.id)!
  expect(species).toMatchObject({kind:'fish',rarity:'common',native_region_id:null,movement_type:'swim',flip_with_direction:true})
  expect(species.sell_price).toBeGreaterThanOrEqual(50);expect(species.sell_price).toBeLessThanOrEqual(60)
  expect(speciesFacing(species as any)).toBe('right')
  expect(catalog.collectible_habitats.filter(h=>h.species_id===item.id)).toHaveLength(catalog.regions.length)
  const sheet=audit.sprites.find((s:any)=>s.id===item.id)
  expect(sheet.safe).toBe(true);expect(sheet.frames).toHaveLength(4)
  for(let frame=0;frame<4;frame++){
   const layout=swimFrameLayout(species.sprite_sheet_path!,frame)
   expect(Number.isFinite(layout.originX+layout.originY+layout.scale)).toBe(true)
   expect(Math.abs(layout.originY-.5)).toBeLessThan(.2)
  }
 }
})
