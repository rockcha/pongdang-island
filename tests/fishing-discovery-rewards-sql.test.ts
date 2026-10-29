// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

let db:Awaited<ReturnType<typeof createLocalDatabase>>
let uid:string
const bait='bait_grubby_magnet'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
beforeEach(async()=>{
 await db.exec('begin')
 uid=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'발견테스터')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec(`select app_private.get_gold_wallet();
  insert into public.player_navigation(user_id,region_id) values(auth.uid(),'pongdang') on conflict(user_id) do update set region_id='pongdang';
  update public.player_wallets set inventory=jsonb_build_object('${bait}',1000,'bait_magnet',1000,'bait_first_greeting',1000) where user_id=auth.uid();
  update public.fishing_map_blueprints set enabled=false;
  insert into public.regions(id,name,description,rarity,sort_order,image_path,requires_map_fragment)
   values('discovery-test','Discovery','Test','rare',999,'test.png',true);
  insert into public.fishing_map_blueprints(region_id,piece_count,thumbnail_path,enabled,rarity)
   values('discovery-test',4,'test.png',true,'rare');
  update public.fishing_relics set enabled=false;
  insert into public.fishing_relics(id,name,description,rarity,thumbnail_path) values('test-relic','Test relic','Test','rare','test.png');
  update app_private.fishing_bait_balance_profiles set common_bp=0,rare_bp=10000,epic_bp=0,mythic_bp=0
   where id in ('${bait}','bait_magnet','bait_first_greeting');`)
})
afterEach(async()=>{await db.exec('rollback')})
// Replace only the random category decision inside a rolled-back fixture; the
// actual prepare/finish, rarity sampler, ownership checks and grants still run.
async function category(value:'map'|'relic'|'ordinary'){
 await db.exec(`create or replace function app_private.fishing_reward_category(p_roll double precision,p_rarity public.game_rarity) returns text
  language sql immutable set search_path='' as $$select '${value}'::text$$`)
}
async function prepare(id=crypto.randomUUID(),bid=bait){
 return (await db.query("select public.prepare_discovery_fishing('pongdang',$1,$2,false) p",[bid,id])).rows[0].p
}
async function finish(id:string,won=true){
 await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '1 minute' where user_id=$1 and operation_id=$2",[uid,id])
 return (await db.query('select public.finish_fishing($1,$2) r',[id,won])).rows[0].r
}
async function rejected(action:()=>Promise<unknown>,message:string){
 await db.exec('savepoint expected_failure')
 try{await expect(action()).rejects.toThrow(message)}
 finally{await db.exec('rollback to savepoint expected_failure;release savepoint expected_failure')}
}

it('uses exact 94/3/3 category boundaries after grade selection',async()=>{
 for(const [roll,expected] of [[0,'ordinary'],[.939999,'ordinary'],[.94,'map'],[.969999,'map'],[.97,'relic'],[.999999,'relic']] as const){
  expect((await db.query('select app_private.fishing_reward_category($1) c',[roll])).rows[0].c).toBe(expected)
 }
 for(const roll of [-.1,1,null])await rejected(()=>db.query('select app_private.fishing_reward_category($1)',[roll]),'INVALID_REWARD_ROLL')
})

it('uses exact grade-specific boundaries and keeps maps at three percent',async()=>{
 for(const [grade,mapStart,relicStart,ordinary,relic] of [
  ['common',.94,.97,9400,300],['rare',.94,.97,9400,300],
  ['epic',.92,.95,9200,500],['mythic',.87,.90,8700,1000],
 ] as const){
  for(const [roll,expected] of [[0,'ordinary'],[mapStart-.000001,'ordinary'],[mapStart,'map'],[relicStart-.000001,'map'],[relicStart,'relic'],[.999999,'relic']] as const){
   expect((await db.query('select app_private.fishing_reward_category($1,$2::public.game_rarity) c',[roll,grade])).rows[0].c).toBe(expected)
  }
  const counts=(await db.query(`select app_private.fishing_reward_category((n+.5)/10000.0,$1::public.game_rarity) category,count(*)::int n
   from generate_series(0,9999) n group by 1`,[grade])).rows
  expect(Object.fromEntries(counts.map(r=>[r.category,r.n]))).toEqual({ordinary,map:300,relic})
 }
 for(const roll of [-.1,1,null])await rejected(()=>db.query("select app_private.fishing_reward_category($1,'epic')",[roll]),'INVALID_REWARD_ROLL')
 await rejected(()=>db.query('select app_private.fishing_reward_category(.5,null)'),'INVALID_REWARD_RARITY')
})

it('passes the bait-selected grade into the real category thresholds',async()=>{
 const definition=(await db.query("select pg_get_functiondef('app_private.fishing_reward_category(double precision,public.game_rarity)'::regprocedure) d")).rows[0].d
 // Pin just the random input. Keep the real grade-specific category decision.
 await db.exec(definition.replace('begin\n','begin\n p_roll:=0.96;\n'))
 for(const grade of ['rare','epic','mythic']){
  await db.exec(`update app_private.fishing_bait_balance_profiles set common_bp=0,rare_bp=${grade==='rare'?10000:0},epic_bp=${grade==='epic'?10000:0},mythic_bp=${grade==='mythic'?10000:0} where id='${bait}';
   update public.fishing_relics set rarity='${grade}' where id='test-relic';`)
  const p=await prepare()
  expect(p.rarity).toBe(grade)
  expect(p.species.kind).toBe(grade==='rare'?'map':'relic')
  await finish(p.operation_id,false)
 }
})

it('adds each equipped discovery relic bonus in percentage points without changing the other category',async()=>{
 await db.query('update public.player_wallets set gold=100000 where user_id=$1',[uid])
 const relics=[['trace-seeking-compass',0,1],['forgotten-era-compass',0,3],['ocean-memory-compass',0,6],
  ['waterway-reading-lens',.5,0],['hidden-route-lens',2,0],['worlds-end-lens',5,0]] as const
 for(const [id,mapBonus,relicBonus] of relics){
  await db.query('update public.fishing_relics set enabled=true where id=$1',[id])
  await db.query('insert into app_private.player_fishing_relics(user_id,relic_id) values($1,$2)',[uid,id])
  await db.query('select public.equip_relic($1,$2,null)',[id,crypto.randomUUID()])
  for(const [grade,baseRelic] of [['common',3],['rare',3],['epic',5],['mythic',10]] as const){
   const counts=(await db.query(`select app_private.fishing_reward_category((n+.5)/2000.0,$1::public.game_rarity) category,count(*)::int n
    from generate_series(0,1999) n group by 1`,[grade])).rows
   expect(Object.fromEntries(counts.map(r=>[r.category,r.n]))).toEqual({
    ordinary:2000-(3+mapBonus+baseRelic+relicBonus)*20,map:(3+mapBonus)*20,relic:(baseRelic+relicBonus)*20,
   })
   const mapStart=(100-3-mapBonus-baseRelic-relicBonus)/100,relicStart=(100-baseRelic-relicBonus)/100
   for(const [roll,expected] of [[mapStart-.000001,'ordinary'],[mapStart,'map'],[relicStart-.000001,'map'],[relicStart,'relic']] as const){
    expect((await db.query('select app_private.fishing_reward_category($1,$2::public.game_rarity) c',[roll,grade])).rows[0].c).toBe(expected)
   }
  }
 }
 // The selected player's equipment cannot change another player's probabilities.
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[crypto.randomUUID()])
 expect((await db.query("select app_private.fishing_reward_category(.93,'rare') c")).rows[0].c).toBe('ordinary')
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec("update public.fishing_relics set enabled=false where id='worlds-end-lens'")
 expect((await db.query("select app_private.fishing_reward_category(.93,'rare') c")).rows[0].c).toBe('ordinary')
})

it('applies the bonus to new direct casts and preserves reservations when equipment changes',async()=>{
 const definition=(await db.query("select pg_get_functiondef('app_private.fishing_reward_category(double precision,public.game_rarity)'::regprocedure) d")).rows[0].d
 await db.exec(definition.replace('begin\n','begin\n p_roll:=0.95;\n'))
 await db.exec("update public.fishing_relics set enabled=true where id='ocean-memory-compass';insert into app_private.player_fishing_relics(user_id,relic_id) values(auth.uid(),'ocean-memory-compass')")
 const first=await prepare()
 expect(first.species.kind).toBe('map')
 await db.query("select public.equip_relic('ocean-memory-compass',$1,0)",[crypto.randomUUID()])
 const replay=await prepare(first.operation_id)
 expect(replay.species).toEqual(first.species)
 await finish(first.operation_id,false)
 const next=await prepare()
 expect(next.species.kind).toBe('relic')
 expect(next.species.id).toBe('relic-test-relic')
 await finish(next.operation_id,false)
 const legacy=(await db.query("select public.prepare_fishing('pongdang',$1,$2,false) p",[bait,crypto.randomUUID()])).rows[0].p
 expect(legacy.species.kind).toBe('trash')
 await rejected(()=>db.exec("update public.fishing_relics set effect_value=7 where id='ocean-memory-compass'"),'relic_effect_shape')
 await rejected(()=>db.exec("update public.fishing_relics set effect_value=1 where id='waterway-reading-lens'"),'relic_effect_shape')
})

it('keeps legacy fishing ordinary and scopes discovery opt-in to the new RPC',async()=>{
 await category('relic')
 const legacy=(await db.query("select public.prepare_fishing('pongdang',$1,$2,false) p",[bait,crypto.randomUUID()])).rows[0].p
 expect(legacy.species.kind).toBe('trash')
 await finish(legacy.operation_id,false)
 const modern=await prepare()
 expect(modern.species.kind).toBe('relic')
 expect((await db.query("select current_setting('pongdang.discovery_rewards',true) v")).rows[0].v).not.toBe('enabled')
 await finish(modern.operation_id,false)
 const next=(await db.query("select public.prepare_fishing('pongdang',$1,$2,false) p",[bait,crypto.randomUUID()])).rows[0].p
 expect(next.species.kind).toBe('trash')
 await db.exec('set role anon')
 await rejected(()=>prepare(),'permission denied')
 await db.exec('reset role')
})

it('finds maps through trash-only and decoration-only baits without inventory, and displays actual collected count',async()=>{
 await category('map')
 for(const bid of [bait,'bait_magnet']){
  const id=crypto.randomUUID(),reserved=await prepare(id,bid)
  expect(reserved.rarity).toBe('rare');expect(reserved.species.kind).toBe('map')
  const replay=await prepare(id,bid)
  expect(replay.species).toEqual(reserved.species)
  const result=await finish(id)
  const expectedCount=bid===bait?1:2
  expect(result.attempt.species.pieceFoundCount).toBe(expectedCount)
  expect(result.attempt.species.name).toBe(`Discovery의 ${reserved.species.pieceNumber}번째 조각 (${expectedCount}/4)`)
  expect(result.attempt.collectible_id).toBeNull()
  const again=(await db.query('select public.finish_fishing($1,true) r',[id])).rows[0].r
  expect(again.replayed).toBe(true);expect(again.attempt).toEqual(result.attempt)
 }
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toHaveLength(0)
 expect((await db.query('select * from app_private.player_fishing_map_pieces where user_id=$1',[uid])).rows).toHaveLength(2)
 for(let count=3;count<=4;count++){
  const p=await prepare(),result=await finish(p.operation_id)
  expect(result.attempt.species.pieceFoundCount).toBe(count)
 }
 expect((await db.query("select * from public.player_map_fragments where user_id=$1 and region_id='discovery-test'",[uid])).rows).toHaveLength(1)
 expect((await prepare()).species.kind).toBe('trash')
 const state=(await db.query('select public.collection_state() s')).rows[0].s
 expect(state.catalog.filter(s=>s.kind==='map'&&s.mapRegionId==='discovery-test'&&s.discovered)).toHaveLength(4)
})

it('does not grant on failure or expiry and awards duplicate copies once per cast with grade XP',async()=>{
 await category('relic')
 const failed=await prepare()
 expect((await finish(failed.operation_id,false)).attempt.species).toBeNull()
 expect((await db.query('select * from app_private.player_fishing_relics')).rows).toHaveLength(0)
 const expired=await prepare()
 await db.query("update app_private.prepared_fishing_casts set expires_at=clock_timestamp()-interval '1 second' where operation_id=$1",[expired.operation_id])
 expect((await finish(expired.operation_id)).failure_reason).toBe('expired')
 expect((await db.query('select * from app_private.player_fishing_relics')).rows).toHaveLength(0)
 const id=crypto.randomUUID(),p=await prepare(id)
 expect(p.species.kind).toBe('relic')
 const result=await finish(id)
 expect(result.attempt.firstDiscovery).toBe(true);expect(result.attempt.collectible_id).toBeNull()
 await finish(id)
 expect((await db.query("select xp from app_private.experience_events where user_id=$1 and source='manual' and source_id=$2",[uid,id])).rows).toEqual([{xp:30}])
 expect((await db.query('select * from app_private.player_fishing_relics where user_id=$1',[uid])).rows).toHaveLength(1)
 const next=await prepare()
 expect(next.species.kind).toBe('relic')
 expect((await finish(next.operation_id)).attempt.firstDiscovery).toBe(false)
 await finish(next.operation_id)
 expect((await db.query('select quantity from app_private.player_fishing_relics where user_id=$1',[uid])).rows).toEqual([{quantity:2}])
 const state=(await db.query('select public.collection_state() s')).rows[0].s
 expect(state.catalog.find(s=>s.id==='relic-test-relic').discovered).toBe(true)
})

it('returns exhausted categories to ordinary catches without switching grade or boosting another category',async()=>{
 await category('map')
 await db.exec("update public.fishing_map_blueprints set rarity='epic' where region_id='discovery-test'")
 const p=await prepare()
 expect(p.rarity).toBe('rare');expect(p.species.kind).toBe('trash')
 await finish(p.operation_id,false)
 await category('relic')
 await db.exec("update public.fishing_relics set rarity='mythic' where id='test-relic'")
 const next=await prepare()
 expect(next.rarity).toBe('rare');expect(next.species.kind).toBe('trash')
})

it('preserves bait grade for all map/relic grades and allows discovery when ordinary candidates are absent',async()=>{
 for(const grade of ['common','rare','epic','mythic']){
  await db.exec(`update app_private.fishing_bait_balance_profiles set common_bp=${grade==='common'?10000:0},rare_bp=${grade==='rare'?10000:0},epic_bp=${grade==='epic'?10000:0},mythic_bp=${grade==='mythic'?10000:0} where id='${bait}';
   update public.fishing_map_blueprints set rarity='${grade}' where region_id='discovery-test';
   update public.fishing_relics set rarity='${grade}' where id='test-relic';`)
  for(const kind of ['map','relic'] as const){
   await category(kind)
   const p=await prepare()
   expect(p.rarity).toBe(grade);expect(p.species.kind).toBe(kind)
   await finish(p.operation_id,false)
  }
 }
})

it('keeps an exhausted undiscovered bait rejection before random selection to prevent free rerolls',async()=>{
 await category('relic')
 await db.exec("insert into public.player_discoveries(user_id,species_id) select auth.uid(),id from public.collectible_species where kind in ('fish','trash','decoration') on conflict do nothing")
 await rejected(()=>prepare(crypto.randomUUID(),'bait_first_greeting'),'ALL_COLLECTIBLES_DISCOVERED')
 expect((await db.query("select inventory->>'bait_first_greeting' n from public.player_wallets where user_id=$1",[uid])).rows[0].n).toBe('1000')
})

it('denies forged discovery writes, cross-account reads, and trading synthetic rewards',async()=>{
 await category('relic')
 const p=await prepare();await finish(p.operation_id)
 await db.exec('set role authenticated')
 await rejected(()=>db.exec("insert into app_private.player_fishing_relics(user_id,relic_id) values(auth.uid(),'test-relic')"),'permission denied')
 await rejected(()=>db.exec("insert into public.fishing_relics(id,name,rarity,thumbnail_path) values('forged','Forged','mythic','x')"),'permission denied')
 await rejected(()=>db.exec("select app_private.fishing_discovery_candidates('rare')"),'permission denied')
 await rejected(()=>db.query("select public.exchange_post('sell','collectible','relic-test-relic',1,'gold','gold',1,$1,'Relic sale')",[crypto.randomUUID()]),'INVALID_EXCHANGE_ASSET')
 await db.exec('reset role')
 const other=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[other])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);await db.exec('set role authenticated')
 expect((await db.query('select * from app_private.player_fishing_relics')).rows).toHaveLength(0)
 await db.exec('reset role;set role anon')
 await rejected(()=>db.exec('select * from public.fishing_relics'),'permission denied')
 await db.exec('reset role')
})
