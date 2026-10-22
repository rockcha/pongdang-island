// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,replayMigrations,migrationFiles} from '../scripts/db/local.mjs'
const migration='20261022064959_independent_harbor_catch_rules.sql'
const user='00000000-0000-0000-0000-000000008431'
let db:any,oldSnapshot:any,legacyId:string
beforeAll(async()=>{
 db=await createLocalDatabase()
 for(const file of migrationFiles().filter(f=>f<migration))await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
 await db.exec('update app_private.fishing_maintenance set released_at=starts_at')
 await db.query('insert into auth.users(id) values($1)',[user])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'규칙검증')",[user])
 await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,100000,'{\"fuel\":100}') on conflict(user_id) do update set gold=100000,inventory=excluded.inventory",[user])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])
 await db.query("select public.harbor_action('buy',$1,'moonpearl-luxury')",[crypto.randomUUID()])
 const r=(await db.query("select public.harbor_action('depart',$1,'moonpearl-luxury') r",[crypto.randomUUID()])).rows[0].r
 legacyId=r.receipt.voyageId
 oldSnapshot=(await db.query('select to_jsonb(v) row from public.harbor_voyages v where id=$1',[legacyId])).rows[0].row
 await db.exec(readFileSync('supabase/migrations/'+migration,'utf8'))
},60000)
afterAll(async()=>{await db?.close()})
it('freezes legacy shrimp probabilities without changing any original voyage fields or return time',async()=>{
 const row=(await db.query('select to_jsonb(v) row from public.harbor_voyages v where id=$1',[legacyId])).rows[0].row
 expect(row.vessel_snapshot.catch_rule).toMatchObject({version:1,success_bp:7000,rare_bp:9870,epic_bp:100,mythic_bp:30})
 delete row.vessel_snapshot.catch_rule
 expect(row).toEqual(oldSnapshot)
})
it('keeps all attempt counts and prices, with the agreed fuel, duration and independent success rates',async()=>{
 const expected=[['fishing-raft',0,40,2,3500],['current-rider',1,15,4,3500],['fishing-drone',1,60,4,3500],['neoul-boat',4,120,10,3500],['haeneomi-trawler',9,480,28,3500],['waterway-explorer',4,240,10,3500],['billow-rider',5,360,12,3500],['starlit-cruiser',9,900,30,3500],['golden-luck',7,480,18,3500],['scrap-gobbler',4,330,18,5000],['pearl-salvager',5,390,8,5000],['conch-explorer',6,420,5,5000],['moonpearl-luxury',10,630,10,7000]]
 for(const [id,fuel,minutes,count,success] of expected){const v=(await db.query('select * from public.harbor_vessels where id=$1',[id])).rows[0];expect(v).toMatchObject({fuel_cost:fuel,duration_minutes:minutes,fishing_count:count});expect(v.catch_rule.success_bp).toBe(success)}
})
it('snapshots new rules and settles both generations without consulting any live bait helpers or changed bait grades',async()=>{
 await db.query("select public.harbor_action('buy',$1,'current-rider')",[crypto.randomUUID()])
 const op=crypto.randomUUID(),r=(await db.query("select public.harbor_action('depart',$1,'current-rider') r",[op])).rows[0].r
 const id=r.receipt.voyageId
 const snap=(await db.query('select vessel_snapshot from public.harbor_voyages where id=$1',[id])).rows[0].vessel_snapshot
 expect(snap.catch_rule).toMatchObject({version:2,success_bp:3500,common_bp:8320})
 await db.exec(`update public.fishing_baits set success_chance_bp=10000,common_bp=0,rare_bp=0,epic_bp=0,mythic_bp=10000;
 create or replace function app_private.expedition_success_chance_bp(p_bait_id text,p_reduction integer) returns integer language plpgsql as $$begin raise exception 'LIVE_BAIT_HELPER_USED';end$$;
 create or replace function app_private.expedition_pick(p_region text,p_bait text,p_native boolean,p_local_discovery boolean default false) returns text language plpgsql as $$begin raise exception 'LIVE_BAIT_PICK_USED';end$$;
 update public.harbor_voyages set departed_at=clock_timestamp()-interval '2 days',returns_at=clock_timestamp()-interval '1 minute';`)
 const claim=crypto.randomUUID(),result=(await db.query("select public.harbor_action('claim_all',$1) r",[claim])).rows[0].r
 expect(result.receipt.results).toHaveLength(2)
 for(const entry of result.receipt.results)expect(entry.items.length+entry.failed).toBe(entry.attempted)
 expect((await db.query("select public.harbor_action('claim_all',$1) r",[claim])).rows[0].r.receipt).toEqual(result.receipt)
 expect((await db.query('select vessel_snapshot from public.harbor_voyages where id=$1',[id])).rows[0].vessel_snapshot).toEqual(snap)
})
it('does not grant authenticated players direct access to the internal sampler or catalogue edits',async()=>{
 await db.exec('set role authenticated')
 try{
  await expect(db.query("select app_private.harbor_draw('pongdang','{}')")).rejects.toThrow(/permission denied/)
  await expect(db.query("update public.harbor_vessels set catch_rule='{}'")).rejects.toThrow(/permission denied/)
 }finally{await db.exec('reset role')}
})
it('produces the configured success, kind and discovery weights in an isolated deterministic sample',async()=>{
 const sample=await createLocalDatabase()
 try{
  await sample.exec(`create schema app_private;create type public.game_rarity as enum('common','rare','epic','mythic');
   create table public.collectible_species(id text,rarity public.game_rarity,kind text,is_native boolean,native_region_id text);
   create table public.player_discoveries(user_id uuid,species_id text);
   insert into public.collectible_species values('known','common','fish',false,null),('unknown','common','fish',false,null),('trash','common','trash',false,null);
   select set_config('request.jwt.claim.sub','${user}',false);
   insert into public.player_discoveries values('${user}','known'),('${user}','trash');select setseed(0.22);`)
  const def=(await db.query("select pg_get_functiondef('app_private.harbor_draw(text,jsonb)'::regprocedure) d")).rows[0].d
  await sample.exec(def)
  const rule={version:2,success_bp:5000,common_bp:10000,rare_bp:0,epic_bp:0,mythic_bp:0,kind:'trash_weighted',trash_bp:7000,discovery_weight:1,home_multiplier:1}
  const rows=(await sample.query("select app_private.harbor_draw('pongdang',$1) id from generate_series(1,4000)",[rule])).rows
  const caught=rows.filter(r=>r.id),trash=caught.filter(r=>r.id==='trash')
  expect(caught.length/4000).toBeGreaterThan(.46);expect(caught.length/4000).toBeLessThan(.54)
  expect(trash.length/caught.length).toBeGreaterThan(.65);expect(trash.length/caught.length).toBeLessThan(.75)
  const discovered=(await sample.query("select app_private.harbor_draw('pongdang',$1) id from generate_series(1,2000)",[{...rule,success_bp:10000,kind:'discovery_weighted',discovery_weight:2}])).rows
  const unknown=discovered.filter(r=>r.id==='unknown').length/2000
  expect(unknown).toBeGreaterThan(.45);expect(unknown).toBeLessThan(.55)
 }finally{await sample.close()}
},60000)
