// @vitest-environment node
import {expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import catalog from '../supabase/catalog/catalog.json'
import {readFileSync} from 'node:fs'
import {swimFrameLayout} from '@/features/aquarium/swim-frame-layout'
const expected=[['nyamnyam-eggroll-medaka','common',30],['nyamnyam-sausage-puffer','common',33],['nyamnyam-omurice-goldfish','rare',220],['nyamnyam-pancake-flounder','rare',240]] as const
it('registers the requested prices, native habitat and intentional swimming ranges',()=>{
 for(const [id,rarity,price] of expected){
  const s=catalog.collectible_species.find(s=>s.id===id)!
  expect(s).toMatchObject({kind:'fish',rarity,sell_price:price,native_region_id:'nyamnyam',movement_type:'swim',travel_direction:'both',flip_with_direction:true})
  expect(catalog.collectible_habitats.filter(h=>h.species_id===id)).toEqual([{species_id:id,region_id:'nyamnyam'}])
  expect(Number(s.swim_y_min)).toBeLessThan(Number(s.swim_y_max))
 }
 expect(Number(catalog.collectible_species.find(s=>s.id==='nyamnyam-pancake-flounder')!.swim_y_min)).toBeGreaterThan(.6)
})
it('makes all four species available in real server regional draws',async()=>{
 const db=await createLocalDatabase()
 try{
  await replayMigrations(db)
  for(const rarity of ['common','rare']){
   await db.exec('select setseed(.414)')
   const rows=(await db.query("select distinct q.species_id from generate_series(1,1200)i cross join lateral app_private.pick_regional_collectible('nyamnyam',$1::public.game_rarity,false,i)q",[rarity])).rows
   for(const [id,grade] of expected)if(grade===rarity)expect(rows.map(r=>r.species_id)).toContain(id)
  }
 }finally{await db.close()}
},60000)
it('keeps all exported swim frames inside their cells with measured stable head anchors',()=>{
 const root='assets/storage-upload/new/20261026-192400/'
 const read=(path:string)=>JSON.parse(readFileSync(root+path,'utf8').replace(/^\uFEFF/,''))
 const matches=read('final-anchor-matches.json'),bounds=read('final-bounds.json').sprites
 expect(matches).toHaveLength(4)
 for(const a of matches){
  for(const f of a.frames){expect(f.rmse).toBeLessThan(35);expect([f.dx,f.dy]).toEqual([0,0]);expect(swimFrameLayout(a.storage_path,f.frame)).toMatchObject({originX:.5,originY:.5})}
  const b=bounds.find(b=>b.file.endsWith(a.storage_path))
  for(const f of b.frames)expect(Math.min(f.x,f.y,b.cellWidth-f.x-f.width,b.cellHeight-f.y-f.height)).toBeGreaterThanOrEqual(5)
 }
})
