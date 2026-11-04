// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
let uid:string
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
beforeEach(async()=>{
 await db.exec('begin')
 uid=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'날씨테스터')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec(`select app_private.get_gold_wallet();
  insert into public.player_navigation(user_id,region_id) values(auth.uid(),'pongdang') on conflict(user_id) do update set region_id='pongdang';
  update public.player_wallets set inventory=jsonb_build_object('bait',20) where user_id=auth.uid();`)
})
afterEach(async()=>{await db.exec('rollback')})
async function rejected(action:()=>Promise<unknown>,message:string){
 await db.exec('savepoint expected_weather_rejection')
 try{await expect(action()).rejects.toThrow(message)}finally{await db.exec('rollback to savepoint expected_weather_rejection;release savepoint expected_weather_rejection')}
}
it('shares a completed weather catch once while rejecting pending, foreign and ordinary common catches',async()=>{
 await db.exec(`create or replace function app_private.fishing_weather_at(p_at timestamptz) returns jsonb language sql security definer set search_path='' as $$select '{"kind":"rain"}'::jsonb$$;
  create or replace function app_private.pick_weather_collectible(p_kind text,p_at timestamptz,p_roll double precision default null) returns text language sql set search_path='' as $$select id from public.collectible_species where weather_type=p_kind order by id limit 1$$;`)
 const op=crypto.randomUUID()
 await db.query("select public.prepare_discovery_fishing('pongdang','bait',$1,false)",[op])
 await rejected(()=>db.query("select public.publish_fishing_showcase($1,'pending')",[op]),'CATCH_NOT_SHAREABLE')
 await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '1 minute' where operation_id=$1",[op])
 await db.query('select public.finish_fishing($1,true)',[op])
 const first=(await db.query("select public.publish_fishing_showcase($1,'weather') id",[op])).rows[0].id
 expect((await db.query("select public.publish_fishing_showcase($1,'retry') id",[op])).rows[0].id).toBe(first)
 const post=(await db.query('select * from public.fishing_showcase_posts where id=$1',[first])).rows[0]
 expect(post.rarity).toBe('common');expect(post.species.weather_type).toBe('rain')
 const other=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[other])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other])
 await rejected(()=>db.query("select public.publish_fishing_showcase($1,'foreign')",[op]),'CATCH_NOT_SHAREABLE')
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec(`create or replace function app_private.fishing_weather_at(p_at timestamptz) returns jsonb language sql security definer set search_path='' as $$select null::jsonb$$;
  update app_private.fishing_bait_balance_profiles set common_bp=10000,rare_bp=0,epic_bp=0,mythic_bp=0 where id='bait';`)
 const ordinary=crypto.randomUUID()
 await db.query("select public.prepare_discovery_fishing('pongdang','bait',$1,false)",[ordinary])
 await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '1 minute' where operation_id=$1",[ordinary])
 await db.query('select public.finish_fishing($1,true)',[ordinary])
 await rejected(()=>db.query("select public.publish_fishing_showcase($1,'ordinary common')",[ordinary]),'CATCH_NOT_SHAREABLE')
})
async function schedule(at='2026-11-04T03:00:00Z') {
 return (await db.query('select app_private.fishing_weather_schedule($1) s',[at])).rows[0].s
}
it('keeps four non-overlapping 30-minute windows and four distinct kinds stable for one KST day',async()=>{
 const a=await schedule(),b=await schedule('2026-11-04T14:59:59Z')
 expect(a.day).toBe('2026-11-04')
 expect(a.periods).toEqual(b.periods)
 expect(a.periods).toHaveLength(4)
 expect(new Set(a.periods.map(p=>p.kind)).size).toBe(4)
 for(const p of a.periods)expect(['rain','snow','dust','meteor','blossom']).toContain(p.kind)
 for(const [i,p] of a.periods.entries()){
  expect(Date.parse(p.endsAt)-Date.parse(p.startsAt)).toBe(30*60_000)
  const offset=Date.parse(p.startsAt)-Date.parse('2026-11-03T15:00:00Z')
  expect(offset).toBeGreaterThanOrEqual(i*6*3600_000)
  expect(offset+30*60_000).toBeLessThanOrEqual((i+1)*6*3600_000)
 }
 expect((await schedule('2026-11-04T15:00:00Z')).day).toBe('2026-11-05')
 expect((await db.query('select count(*)::int n from app_private.fishing_weather_days where user_id=$1',[uid])).rows[0].n).toBe(1)
})
it('includes the start and excludes the end of a period',async()=>{
 const s=await schedule()
 const p=s.periods[0]
 expect((await db.query('select app_private.fishing_weather_at($1) p',[p.startsAt])).rows[0].p.kind).toBe(p.kind)
 expect((await db.query('select app_private.fishing_weather_at($1) p',[p.endsAt])).rows[0].p).toBeNull()
})
it('exposes the schedule through fishing_state and leaves empty weather pools on normal fishing',async()=>{
 await db.exec('update public.collectible_species set weather_type=null where weather_type is not null')
 const state=(await db.query('select public.fishing_state() s')).rows[0].s
 expect(state.weather.periods).toHaveLength(4)
 for(const kind of ['rain','snow','dust','meteor','blossom'])expect((await db.query('select app_private.pick_weather_collectible($1,clock_timestamp(),0) s',[kind])).rows[0].s).toBeNull()
 const id=crypto.randomUUID()
 const p=(await db.query("select public.prepare_discovery_fishing('pongdang','bait',$1,false) p",[id])).rows[0].p
 expect(p.species).toBeTruthy()
 const replay=(await db.query("select public.prepare_discovery_fishing('pongdang','bait',$1,false) p",[id])).rows[0].p
 expect(replay.species.id).toBe(p.species.id)
 expect((await db.query("select (inventory->>'bait')::int n from public.player_wallets where user_id=$1",[uid])).rows[0].n).toBe(19)
})
it('isolates schedules by account and blocks direct player writes and weather overrides',async()=>{
 await schedule()
 const other=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[other])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other])
 await schedule()
 expect((await db.query('select count(*)::int n from app_private.fishing_weather_days')).rows[0].n).toBe(2)
 expect((await db.query("select has_table_privilege('authenticated','app_private.fishing_weather_days','UPDATE') p")).rows[0].p).toBe(false)
 expect((await db.query("select has_function_privilege('authenticated','app_private.fishing_weather_schedule(timestamptz)','EXECUTE') p")).rows[0].p).toBe(false)
 expect((await db.query("select has_function_privilege('anon','app_private.pick_weather_collectible(text,timestamptz,double precision)','EXECUTE') p")).rows[0].p).toBe(false)
})
it('uses an exact 3% independent weather draw and excludes weather creatures from ordinary pools',async()=>{
 await db.exec('update public.collectible_species set weather_type=null where weather_type is not null')
 const id=(await db.query("select id from public.collectible_species where kind='fish' limit 1")).rows[0].id
 await db.query("update public.collectible_species set weather_type='rain' where id=$1",[id])
 for(const roll of [0,.029999])expect((await db.query("select app_private.pick_weather_collectible('rain',clock_timestamp(),$1) id",[roll])).rows[0].id).toBe(id)
 for(const roll of [.03,.999999])expect((await db.query("select app_private.pick_weather_collectible('rain',clock_timestamp(),$1) id",[roll])).rows[0].id).toBeNull()
 expect((await db.query('select app_private.collectible_available_at($1,clock_timestamp()) p',[id])).rows[0].p).toBe(false)
 // Force only the weather draw inside a rolled-back fixture. Actual reservation,
 // grade bypass, finishing and ownership rules remain the production functions.
 await db.exec(`create or replace function app_private.pick_weather_collectible(p_kind text,p_at timestamptz,p_roll double precision default null)
  returns text language sql set search_path='' as $$select id from public.collectible_species where weather_type=p_kind limit 1$$;
  create or replace function app_private.fishing_weather_at(p_at timestamptz) returns jsonb language sql security definer set search_path='' as $$select '{"kind":"rain"}'::jsonb$$;`)
 const op=crypto.randomUUID()
 const p=(await db.query("select public.prepare_discovery_fishing('pongdang','bait',$1,false) p",[op])).rows[0].p
 expect(p.species.id).toBe(id)
 expect(p.species.weather_type).toBe('rain')
 expect((await db.query('select bait_snapshot->\'weather\' w from app_private.prepared_fishing_casts where operation_id=$1',[op])).rows[0].w.kind).toBe('rain')
})
it('registers exactly two swimming Pongi per weather with requested prices and only weather access',async()=>{
 for(const kind of ['rain','snow','dust','meteor','blossom']){
  const rows=(await db.query('select id,sell_price,movement_type,swim_y_min,swim_y_max,flip_with_direction,travel_direction from public.collectible_species where weather_type=$1',[kind])).rows
  expect(rows).toHaveLength(2)
  for(const s of rows){
   expect(s.id.startsWith('weather-pongi-')).toBe(true)
   expect(s.sell_price).toBeGreaterThanOrEqual(2000);expect(s.sell_price).toBeLessThanOrEqual(2500)
   expect(s.movement_type).toBe('swim');expect(Number(s.swim_y_min)).toBeLessThan(Number(s.swim_y_max))
   expect(s.flip_with_direction).toBe(true);expect(s.travel_direction).toBe('both')
   expect((await db.query('select app_private.collectible_available_at($1,clock_timestamp()) p',[s.id])).rows[0].p).toBe(false)
  }
  const picked=(await db.query('select app_private.pick_weather_collectible($1,clock_timestamp(),0) id',[kind])).rows[0].id
  expect(rows.map(s=>s.id)).toContain(picked)
 }
})
