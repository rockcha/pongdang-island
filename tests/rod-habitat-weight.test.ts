// @vitest-environment node
import {beforeAll,afterAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const owner='00000000-0000-0000-0000-000000000981',other='00000000-0000-0000-0000-000000000982'
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1),($2)',[owner,other])
 await db.query("insert into public.player_fishing_rods(user_id,rod_id)values($1,'basic'),($1,'coral') on conflict do nothing",[owner])
 await db.query("insert into public.player_rod_loadouts(user_id,equipped_rod_id)values($1,'coral') on conflict(user_id)do update set equipped_rod_id='coral'",[owner])
},60000)
afterAll(async()=>{await db?.close()})
it('boosts only matching primary habitats at home and away',async()=>{
 for(const [primary,current,rod,expected] of [
  ['coral','coral','coral',2.2],['coral','pongdang','coral',.15],
  ['pongdang','pongdang','coral',2],['mistmoon','pongdang','coral',.05],
  [null,'coral','coral',1],['coral','coral',null,2],['coral','pongdang',null,.05],
 ])expect((await db.query('select app_private.rod_habitat_weight($1,$2,$3)::float8 as w',[primary,current,rod])).rows[0].w).toBe(expected)
})
async function samples(uid:string){
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec('select setseed(.314)')
 return (await db.query("select q.species_id,s.native_region_id from generate_series(1,2500)i cross join lateral app_private.pick_regional_collectible('pongdang','rare',false,i)q join public.collectible_species s on s.id=q.species_id")).rows
}
it('reads only the caller owned loadout and increases off-region selections',async()=>{
 const plain=await samples(other),boosted=await samples(owner)
 expect(boosted.filter(s=>s.native_region_id==='coral').length).toBeGreaterThan(plain.filter(s=>s.native_region_id==='coral').length)
 // Another account's rod must not affect the same seeded draw.
 expect(await samples(other)).toEqual(plain)
 await db.query("update public.player_rod_loadouts set equipped_rod_id='basic' where user_id=$1",[owner])
 expect(await samples(owner)).toEqual(plain)
},60000)
it('keeps the helper private and preserves bait rarity probabilities',async()=>{
 const row=(await db.query("select has_function_privilege('authenticated','app_private.rod_habitat_weight(text,text,text)','execute') as allowed,app_private.regional_bait_odds('bait','pongdang') as odds")).rows[0]
 expect(row.allowed).toBe(false)
 await db.query("insert into public.player_fishing_rods(user_id,rod_id) values($1,'plunder') on conflict do nothing",[owner])
 await db.query("update public.player_rod_loadouts set equipped_rod_id='plunder' where user_id=$1",[owner])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner])
 const equipped=(await db.query("select app_private.regional_bait_odds('bait','pongdang') odds")).rows[0].odds
 expect(equipped).toEqual(row.odds)
 expect(row.odds.common_bp+row.odds.rare_bp+row.odds.epic_bp+row.odds.mythic_bp).toBe(10000)
})
