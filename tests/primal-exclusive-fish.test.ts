// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const sql=readFileSync('supabase/migrations/20261017052918_primal_exclusive_fish.sql','utf8')
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('limits the primal fish pool to 20 natives across all four rarities',async()=>{
 const fish=(await db.query("select s.id,s.native_region_id from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where h.region_id='primal' and s.kind='fish'")).rows
 expect(fish).toHaveLength(20)
 expect(fish.every((s:{native_region_id:string})=>s.native_region_id==='primal')).toBe(true)
 for(const rarity of ['common','rare','epic','mythic']){
  const picked=(await db.query("select s.native_region_id from app_private.pick_regional_collectible('primal',$1,false,9999) p join public.collectible_species s on s.id=p.species_id",[rarity])).rows
  expect(picked).toEqual([{native_region_id:'primal'}])
 }
})
it('preserves existing holdings, other regions and decorations when excluding shared fish',async()=>{
 const uid='00000000-0000-0000-0000-000000052918'
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_collectibles(user_id,species_id) values($1,'silverblade-swordfish')",[uid])
 const before=(await db.query("select * from public.collectible_habitats where region_id<>'primal' or species_id in(select id from public.collectible_species where kind<>'fish') order by species_id,region_id")).rows
 await db.exec("insert into public.collectible_habitats values('silverblade-swordfish','primal')")
 await db.exec(sql)
 expect((await db.query("select * from public.collectible_habitats where region_id<>'primal' or species_id in(select id from public.collectible_species where kind<>'fish') order by species_id,region_id")).rows).toEqual(before)
 expect((await db.query('select species_id from public.player_collectibles where user_id=$1',[uid])).rows).toEqual([{species_id:'silverblade-swordfish'}])
 expect((await db.query("select 1 from public.collectible_habitats where species_id='silverblade-swordfish' and region_id='primal'")).rows).toHaveLength(0)
})
