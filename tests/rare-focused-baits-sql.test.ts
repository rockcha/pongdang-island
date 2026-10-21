// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
const specs=[
 ['bait_goblin_bell_cherry',165,7000,[0,9000,1000,0]],
 ['bait_aurora_clockwork_bug',210,7500,[2400,7500,0,100]],
 ['bait_mermaid_whisper_candy',150,9000,[3500,6500,0,0]],
] as const
const uid='00000000-0000-0000-0000-000000006803'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec("select app_private.get_gold_wallet();insert into public.player_navigation(user_id,region_id) values(auth.uid(),'pongdang');update public.player_wallets set gold=100000")
},60000)
afterAll(async()=>await db?.close())
it('charges approved prices once and preserves fixed manual and trap success rates',async()=>{
 for(const [id,price,chance] of specs){
  const op=crypto.randomUUID()
  await db.exec('set role authenticated')
  try{for(let i=0;i<2;i++)await db.query('select public.buy_fishing_bait($1,$2)',[id,op])}finally{await db.exec('reset role')}
  expect((await db.query('select delta from public.gold_transactions where operation_id=$1',[op])).rows).toEqual([{delta:-price}])
  expect((await db.query('select app_private.manual_fishing_success_chance_bp($1) manual,app_private.expedition_success_chance_bp($1,9999) trap',[id])).rows[0]).toEqual({manual:chance,trap:chance})
 }
})
it('resolves all grade rolls exactly and exposes matching odds',async()=>{
 for(const [id,,,counts] of specs){
  const rows=(await db.query("select app_private.resolve_regional_fishing($1,'pongdang',n) rarity,count(*)::int n from generate_series(0,9999)n group by rarity",[id])).rows
  for(const [i,rarity] of ['common','rare','epic','mythic'].entries())expect(rows.find(r=>r.rarity===rarity)?.n??0).toBe(counts[i])
  const odds=(await db.query("select app_private.regional_bait_odds($1,'pongdang') odds",[id])).rows[0].odds
  expect([odds.common_bp,odds.rare_bp,odds.epic_bp,odds.mythic_bp]).toEqual([...counts])
 }
},30000)
it('keeps trap and manual catches fish-only in supported grades',async()=>{
 for(const [id,,,counts] of specs){
  const draws=(await db.query("with draws as materialized(select app_private.expedition_pick('pongdang',$1,true) id from generate_series(1,50)) select s.kind,s.rarity from draws d join public.collectible_species s on s.id=d.id",[id])).rows
  expect(draws).toHaveLength(50)
  for(const row of draws){expect(row.kind).toBe('fish');expect(counts[['common','rare','epic','mythic'].indexOf(row.rarity)]).toBeGreaterThan(0)}
  const op=crypto.randomUUID()
  await db.exec('set role authenticated')
  try{
   const first=(await db.query("select public.prepare_fishing('pongdang',$1,$2) p",[id,op])).rows[0].p
   expect((await db.query("select public.prepare_fishing('pongdang',$1,$2) p",[id,op])).rows[0].p).toEqual(first)
   if(first.eligible){expect(first.species.kind).toBe('fish');expect(counts[['common','rare','epic','mythic'].indexOf(first.rarity)]).toBeGreaterThan(0)}
   await db.query('select public.finish_fishing($1,false)',[op])
  }finally{await db.exec('reset role')}
 }
})
