// @vitest-environment node
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
const items=JSON.parse(readFileSync('assets/storage-upload/new/20261104-200313/manifest.json','utf8')).items
let db:any
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('makes all 31 fixed decorations available in every region without weather or native weighting',async()=>{
 const ids=items.map((item:{id:string})=>item.id)
 const rows=(await db.query("select s.*,app_private.collectible_available_at(s.id,clock_timestamp()) available,(select count(*)::integer from public.collectible_habitats h where h.species_id=s.id) habitats from public.collectible_species s where s.id=any($1)",[ids])).rows
 expect(rows).toHaveLength(31)
 const regions=(await db.query('select count(*)::integer count from public.regions')).rows[0].count
 for(const row of rows){expect(row.kind).toBe('decoration');expect(row.movement_type).toBe('fixed');expect(Number(row.speed)).toBe(0);expect(row.swim_y_min).toBeNull();expect(row.swim_y_max).toBeNull();expect(row.sprite_sheet_path).toBeNull();expect(row.native_region_id).toBeNull();expect(row.weather_type).toBeNull();expect(row.is_native).toBe(false);expect(row.flip_with_direction).toBe(false);expect(row.travel_direction).toBe('both');expect(row.available).toBe(true);expect(row.habitats).toBe(regions)}
 for(const [rarity,count,average] of [['common',13,40],['rare',10,150],['epic',8,800]] as const){const group=rows.filter((row:any)=>row.rarity===rarity);expect(group).toHaveLength(count);expect(group.reduce((sum:number,row:any)=>sum+row.sell_price,0)).toBe(count*average)}
})
it('includes every new decoration in the ordinary collection contract',async()=>{
 await db.exec('begin')
 try{
  const uid=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[uid]);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);await db.exec('set local role authenticated')
  const state=(await db.query('select public.collection_state() state')).rows[0].state
  for(const item of items)expect(state.catalog.some((row:any)=>row.id===item.id)).toBe(true)
 }finally{await db.exec('rollback;reset role')}
})
