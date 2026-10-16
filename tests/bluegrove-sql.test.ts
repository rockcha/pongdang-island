// @vitest-environment node
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations,readCatalog} from '../scripts/db/local.mjs'

let db:Awaited<ReturnType<typeof createLocalDatabase>>
const uid='00000000-0000-0000-0000-000000000773'
const migration=readFileSync('supabase/migrations/20261016155535_bluegrove_region_catalog.sql','utf8')
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
},60000)
afterAll(async()=>{await db.close()})

it('matches the catalog and supplies fish in every rarity plus decoration catches',async()=>{
 expect(await readCatalog(db)).toEqual(JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')))
 for(const rarity of ['common','rare','epic','mythic']){
  const result=await db.query('select * from app_private.pick_regional_collectible($1,$2,false,9999)',['bluegrove',rarity])
  expect(result.rows).toHaveLength(1)
 }
 expect((await db.query("select * from app_private.pick_regional_collectible('bluegrove','common',true,9999)")).rows).toHaveLength(1)
})
it('offers the common map through the existing map roll and enforces travel locks',async()=>{
 await db.exec('set role authenticated')
 try{await expect(db.query("select public.travel_region('bluegrove')")).rejects.toThrow('REGION_LOCKED')}
 finally{await db.exec('reset role')}
 await db.query("insert into public.player_map_fragments(user_id,region_id) select $1,id from public.regions where requires_map_fragment and id<>'bluegrove'",[uid])
 expect((await db.query("select * from app_private.pick_regional_collectible('pongdang','common',false,0)")).rows).toEqual([{species_id:'map-bluegrove',map_region_id:'bluegrove'}])
 await db.query("insert into public.player_map_fragments(user_id,region_id) values($1,'bluegrove')",[uid])
 await db.exec('set role authenticated')
 try{expect((await db.query("select public.travel_region('bluegrove') as value")).rows[0].value.currentRegion).toBe('bluegrove')}
 finally{await db.exec('reset role')}
})
it('preserves native habitat assignments when the target database differs from the local catalog',async()=>{
 await db.query("delete from public.collectible_habitats where species_id='pongi-statue' and region_id<>'pongdang'")
 await db.query("update public.collectible_species set native_region_id='pongdang' where id='pongi-statue'")
 await db.exec(migration)
 expect((await db.query("select region_id from public.collectible_habitats where species_id='pongi-statue'")).rows).toEqual([{region_id:'pongdang'}])
 expect((await db.query("select native_region_id from public.collectible_species where id='pongi-statue'")).rows[0].native_region_id).toBe('pongdang')
})
it('buys and equips the region rod once and preserves ownership on migration replay',async()=>{
 await db.query('select public.fishing_rod_state()')
 await db.query('update public.player_wallets set gold=5000 where user_id=$1',[uid])
 const operation=crypto.randomUUID()
 await db.exec('set role authenticated')
 try{
  const bought=await db.query("select public.trade_fishing_rod('bluegrove','buy',$1) as value",[operation])
  expect(bought.rows[0].value).toMatchObject({gold:3500,delta:-1500})
  await db.query("select public.trade_fishing_rod('bluegrove','buy',$1)",[operation])
  await db.query("select public.equip_fishing_rod('bluegrove')")
 }finally{await db.exec('reset role')}
 await db.exec(migration)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(3500)
 expect((await db.query('select equipped_rod_id from public.player_rod_loadouts where user_id=$1',[uid])).rows[0].equipped_rod_id).toBe('bluegrove')
})
