// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('draws the configured grade across every possible roll',async()=>{
 const rows=(await db.query("select app_private.resolve_regional_fishing('bait_magnet','pongdang',i)::text rarity,count(*)::int n from generate_series(0,9999) i group by 1 order by 1")).rows
 expect(rows).toEqual([{rarity:'common',n:8320},{rarity:'epic',n:150},{rarity:'mythic',n:30},{rarity:'rare',n:1500}])
 expect((await db.query("select app_private.fishing_success_chance_bp('bait_magnet') n")).rows[0].n).toBe(7000)
})
it('keeps direct and expedition draws strictly within the chosen decoration grade',async()=>{
 for(const grade of ['common','rare','epic','mythic']){
  const rows=(await db.query("with draws as materialized(select (app_private.pick_regional_collectible('pongdang',$1::public.game_rarity,true,0)).species_id id from generate_series(1,30)) select distinct s.kind,s.rarity::text rarity from draws d join public.collectible_species s on s.id=d.id",[grade])).rows
  expect(rows).toEqual([{kind:'decoration',rarity:grade}])
  await db.exec('begin')
  try{
   await db.query("update public.fishing_baits set common_bp=case when $1='common' then 10000 else 0 end,rare_bp=case when $1='rare' then 10000 else 0 end,epic_bp=case when $1='epic' then 10000 else 0 end,mythic_bp=case when $1='mythic' then 10000 else 0 end where id='bait_magnet'",[grade])
   const expedition=(await db.query("with draws as materialized(select app_private.expedition_pick('pongdang','bait_magnet',false) id from generate_series(1,30)) select distinct s.kind,s.rarity::text rarity from draws d join public.collectible_species s on s.id=d.id")).rows
   expect(expedition).toEqual([{kind:'decoration',rarity:grade}])
  }finally{await db.exec('rollback')}
 }
})
