// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {readFileSync} from 'node:fs'
const items=JSON.parse(readFileSync('assets/storage-upload/new/20261103-151800/manifest.json','utf8')).items
let db:any
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('makes all six shared collectibles available in every existing region with valid cheap prices and movement',async()=>{
 const ids=items.map((i:{id:string})=>i.id)
 const rows=(await db.query('select s.id,s.kind,s.rarity,s.is_native,s.native_region_id,s.sell_price,s.movement_type,count(h.region_id)::integer habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=any($1) group by s.id order by s.id',[ids])).rows
 expect(rows).toHaveLength(6)
 const regionCount=(await db.query('select count(*)::integer count from public.regions')).rows[0].count
 for(const row of rows){expect(row.habitats).toBe(regionCount);expect(row.is_native).toBe(false);expect(row.native_region_id).toBeNull();expect(row.sell_price).toBeGreaterThan(0);expect(row.movement_type).toBe(row.kind==='trash'?'fixed':'swim')}
 const rareFish=rows.filter((r:any)=>r.kind==='fish'&&r.rarity==='rare'),toys=rows.filter((r:any)=>r.kind==='trash')
 expect(Math.max(...toys.map((r:any)=>r.sell_price))).toBeLessThan(Math.min(...rareFish.map((r:any)=>r.sell_price)))
 const uid=crypto.randomUUID()
 await db.exec('begin')
 try{
  await db.query('insert into auth.users(id) values($1)',[uid]);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);await db.exec('set local role authenticated')
  const state=(await db.query('select public.collection_state() s')).rows[0].s
  for(const id of ids)expect(state.catalog.some((s:any)=>s.id===id)).toBe(true)
 }finally{await db.exec('rollback;reset role')}
})
