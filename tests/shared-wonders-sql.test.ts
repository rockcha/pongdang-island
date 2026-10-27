// @vitest-environment node
import {it,expect,beforeAll,afterAll} from 'vitest'
import fs from 'node:fs'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
const {root}=JSON.parse(fs.readFileSync('artifacts/shared-wonders-root.json','utf8'))
const items=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')).items
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},180000)
afterAll(async()=>{await db?.close()})
it('registers seven common shared creatures with every current region and no native bonus',async()=>{
 const ids=items.map((i:any)=>i.id)
 const rows=(await db.query('select id,name,native_region_id,is_native,kind::text kind,rarity::text rarity from public.collectible_species where id=any($1::text[])',[ids])).rows
 expect(rows).toHaveLength(7)
 expect(rows.filter(s=>s.kind==='fish')).toHaveLength(7)
 expect(rows.every(s=>s.rarity==='common')).toBe(true)
 expect((await db.query('select count(*)::int n from public.collectible_species where id=any($1::text[])',[JSON.parse(fs.readFileSync(root+'/manifest.json','utf8')).deferredSpeciesIds])).rows[0].n).toBe(0)
 for(const row of rows){
  expect(row.native_region_id).toBeNull();expect(row.is_native).toBe(false)
  const missing=(await db.query('select id from public.regions r where not exists(select 1 from public.collectible_habitats h where h.species_id=$1 and h.region_id=r.id)',[row.id])).rows
  expect(missing).toEqual([])
  expect((await db.query('select app_private.collectible_available_at($1,statement_timestamp()) available',[row.id])).rows[0].available).toBe(true)
  const payload=(await db.query('select app_private.species_payload($1) payload',[row.id])).rows[0].payload
  expect(payload.native_region_id).toBeNull();expect(payload.is_native).toBe(false)
 }
})
it('keeps requested prices and intentional movement boundaries',async()=>{
 const expected=[['shared-banggai-cardinalfish',40],['shared-bobtail-squid',45],['shared-sea-hare',30],['shared-blue-tang',48],['shared-flame-angelfish',50],['shared-royal-gramma',55],['shared-clown-triggerfish',48]]
 for(const [id,price] of expected)expect((await db.query('select sell_price from public.collectible_species where id=$1',[id])).rows[0].sell_price).toBe(price)
 for(const id of ['shared-sea-hare']){
  const s=(await db.query('select movement_type::text movement,swim_y_min from public.collectible_species where id=$1',[id])).rows[0]
  expect(s.movement).toBe('crawl');expect(Number(s.swim_y_min)).toBeGreaterThanOrEqual(.8)
 }
})
