// @vitest-environment node
import {beforeAll,afterAll,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,replayMigrations,readCatalog,canonical} from '../scripts/db/local.mjs'
import {catalogSql} from '../scripts/db/catalog.mjs'
let db
const mythics=['horizon-whale','name-eating-conch','star-swallowing-priest','orpheon-abyssal-hymn','three-faced-oracle-fish']
const natives=['pongi-plush','pongdang-pufferfish','pongdang-octopus','pongdang-seahorse','pongdang-whale']
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('matches catalog source and preserves the five common mythics and their declared habitat metadata',async()=>{
 const source=JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))
 expect(canonical(await readCatalog(db))).toBe(canonical(source))
 for(const id of mythics){
  const {rows}=await db.query('select s.rarity,s.is_native,count(h.region_id)::int as habitats from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where s.id=$1 group by s.id',[id])
  // Habitats are historical metadata; fishing candidates no longer use this table.
  expect(rows).toEqual([{rarity:'mythic',is_native:false,habitats:source.collectible_habitats.filter(h=>h.species_id===id).length}])
 }
})
it('restricts all five island additions to pongdang and permits rare plush trash',async()=>{
 for(const id of natives){expect((await db.query('select region_id from public.collectible_habitats where species_id=$1',[id])).rows).toEqual([{region_id:'pongdang'}])}
 expect((await db.query("select kind,rarity,native_region_id from public.collectible_species where id='pongi-plush'")).rows).toEqual([{kind:'trash',rarity:'rare',native_region_id:'pongdang'}])
 expect((await db.query("select rarity from public.collectible_species where id='pongdang-whale'")).rows).toEqual([{rarity:'epic'}])
})
it('repeated catalog application preserves existing owned plush and wallet',async()=>{
 const uid='00000000-0000-0000-0000-000000009981'
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query('insert into public.player_wallets(user_id,gold) values($1,123)',[uid])
 await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'pongi-plush')",[uid])
 const before=(await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows
 const sql=catalogSql(JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8')))
 await db.exec(sql);await db.exec(sql)
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toEqual(before)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows).toEqual([{gold:123}])
})
