// @vitest-environment node
import {beforeAll,afterAll,beforeEach,afterEach,expect,it} from 'vitest'
import type {PGlite} from '@electric-sql/pglite'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:PGlite
const user='00000000-0000-0000-0000-000000001301'
const event='a87b4c3e-cdbc-494e-b1d2-ca3810ba749d'
const rewardPrefix='giseong-catch-202610:'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
beforeEach(async()=>{
 await db.exec('begin')
 await db.query('insert into auth.users(id) values($1)',[user])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'이벤트친구')",[user])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])
 await db.query("insert into public.notices(id,category,title,body,status,starts_at,ends_at) values($1,'event','기성 포획 이벤트','각 종류당 300골드','draft','2026-10-20 00:00+09','2026-11-01 00:00+09')",[event])
})
afterEach(async()=>{await db.exec('rollback')})
async function attempt(species='giseong-fish',success=true,at='2026-10-25T12:00:00+09:00'){
 const operation=crypto.randomUUID()
 const item=success?(await db.query<{id:string}>('insert into public.player_collectibles(user_id,species_id) values($1,$2) returning id',[user,species])).rows[0].id:null
 await db.query('insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id,created_at) values($1,$2,\'pongdang\',\'bait\',$3,$4,$5)',[user,operation,success?'rare':null,item,at])
 return operation
}
async function publish(){await db.query("update public.notices set status='published' where id=$1",[event])}
async function grant(operation:string,at='2026-10-25T12:00:01+09:00'){
 return (await db.query<{id:string|null}>('select app_private.grant_giseong_catch_reward($1,$2,$3) id',[user,operation,at])).rows[0].id
}
async function gifts(){return (await db.query<{id:string;quantity:number;reward_id:string;status:string}>("select id,quantity,reward_id,status from public.collectible_gifts where recipient_id=$1 and reward_id like 'giseong-catch-202610:%' order by reward_id",[user])).rows}
it('issues each species once, creates one notification and lets each 300-gold gift be claimed once',async()=>{
 const fish=await attempt(),repeat=await attempt(),octopus=await attempt('giseong-webfoot-octopus')
 await publish()
 expect(await grant(fish)).toBeTruthy()
 expect(await grant(fish)).toBeNull()
 expect(await grant(repeat)).toBeNull()
 expect(await grant(octopus)).toBeTruthy()
 const rewards=await gifts()
 expect(rewards.map(g=>[g.reward_id,g.quantity,g.status])).toEqual([[rewardPrefix+'giseong-fish',300,'pending'],[rewardPrefix+'giseong-webfoot-octopus',300,'pending']])
 expect((await db.query<{n:number}>('select count(*)::int n from public.notifications where gift_id=any($1::uuid[])',[rewards.map(g=>g.id)])).rows[0].n).toBe(2)
 await db.query('select app_private.get_gold_wallet()')
 const initial=(await db.query<{gold:number}>('select gold from public.player_wallets where user_id=$1',[user])).rows[0].gold
 await db.exec('set local role authenticated')
 for(const g of rewards){await db.query('select public.claim_collectible_gift($1)',[g.id]);await db.query('select public.claim_collectible_gift($1)',[g.id])}
 await db.exec('reset role')
 expect((await db.query<{gold:number}>('select gold from public.player_wallets where user_id=$1',[user])).rows[0].gold).toBe(initial+600)
 expect(await grant(repeat)).toBeNull()
})
it('rejects failures, other species, missing attempts and unpublished events',async()=>{
 const failed=await attempt('giseong-fish',false),other=await attempt('pongi-jellyfish'),fish=await attempt()
 expect(await grant(fish)).toBeNull()
 await publish()
 expect(await grant(failed)).toBeNull()
 expect(await grant(other)).toBeNull()
 expect(await grant(crypto.randomUUID())).toBeNull()
 expect(await gifts()).toHaveLength(0)
})
it('includes October 31 but excludes the exact November 1 midnight KST deadline',async()=>{
 const fish=await attempt('giseong-fish',true,'2026-10-31T23:59:59+09:00')
 const octopus=await attempt('giseong-webfoot-octopus',true,'2026-11-01T00:00:00+09:00')
 await publish()
 expect(await grant(fish,'2026-10-19T23:59:59+09:00')).toBeNull()
 expect(await grant(fish,'2026-11-01T00:00:00+09:00')).toBeNull()
 expect(await grant(fish,'2026-10-31T23:59:59.999+09:00')).toBeTruthy()
 expect(await grant(octopus,'2026-10-31T23:59:59.999+09:00')).toBeNull()
})
it('does not reward catches from before event launch or trust forged cross-player collectibles',async()=>{
 const old=await attempt('giseong-fish',true,'2026-10-19T23:59:59+09:00')
 await publish()
 expect(await grant(old)).toBeNull()
 const other='00000000-0000-0000-0000-000000001302'
 await db.query('insert into auth.users(id) values($1)',[other])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'다른친구')",[other])
 const item=(await db.query<{id:string}>("insert into public.player_collectibles(user_id,species_id) values($1,'giseong-fish') returning id",[other])).rows[0].id
 const forged=crypto.randomUUID()
 await db.query("insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id,created_at) values($1,$2,'pongdang','bait','rare',$3,'2026-10-25 12:00+09')",[user,forged,item])
 expect(await grant(forged)).toBeNull()
 const rights=(await db.query<{allowed:boolean}>("select has_function_privilege('authenticated','app_private.grant_giseong_catch_reward(uuid,uuid,timestamptz)','execute') allowed")).rows[0].allowed
 expect(rights).toBe(false)
 expect((await db.query<{allowed:boolean}>("select has_table_privilege('authenticated','public.fishing_attempts','insert') allowed")).rows[0].allowed).toBe(false)
})
it('accepts the exact event start and keeps the reward amount constrained to 300',async()=>{
 const fish=await attempt('giseong-fish',true,'2026-10-20T00:00:00+09:00')
 await publish()
 const id=await grant(fish,'2026-10-20T00:00:00+09:00')
 expect(id).toBeTruthy()
 await expect(db.query('update public.collectible_gifts set quantity=301 where id=$1',[id])).rejects.toThrow('gift_asset_shape')
})
it('sends a gift in the public finish_fishing transaction and never duplicates on replay',async()=>{
 await db.query("update public.notices set starts_at=clock_timestamp()-interval '1 hour' where id=$1",[event]);await publish()
 const operation=crypto.randomUUID()
 await db.query("insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at) values($1,$2,'pongdang','bait',true,'giseong-fish','rare',app_private.species_payload('giseong-fish',null),3,6,'escape',clock_timestamp()-interval '20 seconds',clock_timestamp()+interval '1 minute')",[user,operation])
 await db.exec('set local role authenticated')
 const first=(await db.query<{result:{attempt:{collectible_id:string}}}>('select public.finish_fishing($1,true) result',[operation])).rows[0].result
 expect(first.attempt.collectible_id).toBeTruthy()
 const second=(await db.query<{result:{replayed:boolean}}>('select public.finish_fishing($1,true) result',[operation])).rows[0].result
 expect(second.replayed).toBe(true)
 await db.exec('reset role')
 const active=Date.now()<Date.parse('2026-11-01T00:00:00+09:00')
 expect(await gifts()).toHaveLength(active?1:0)
})
it.each(['trap','vessel'])('rewards a real %s settlement immediately and shares the manual-catch limit',async kind=>{
 await db.query("update public.notices set starts_at=clock_timestamp()-interval '1 hour' where id=$1",[event]);await publish()
 // Deterministic draw, while retaining the actual authenticated settlement path.
 await db.exec("create or replace function app_private.expedition_pick(p_region text,p_bait text,p_native boolean default false,p_local_discovery boolean default false) returns text language sql set search_path='' as $$select 'giseong-fish'::text$$")
 await db.exec("create or replace function app_private.expedition_success_chance_bp(p_bait_id text,p_reduction integer default 0) returns integer language sql set search_path='' as $$select 10000$$")
 let trip:string
 if(kind==='trap'){
  trip=(await db.query<{id:string}>("insert into public.fishing_expeditions(user_id,vessel_id,region_id,cargo,vessel_snapshot,departed_at,returns_at) select $1,v.id,'pongdang','{\"bait\":1}',to_jsonb(v)||'{\"bonus_count\":0,\"bonus_basic_count\":0}',clock_timestamp()-interval '1 hour',clock_timestamp()-interval '1 minute' from public.fishing_vessels v where id='dinghy' returning id",[user])).rows[0].id
 }else{
  const boat=(await db.query<{id:string}>("insert into public.harbor_boats(user_id,vessel_id,instance_no) values($1,'fishing-raft',1) returning id",[user])).rows[0].id
  trip=(await db.query<{id:string}>("insert into public.harbor_voyages(user_id,vessel_id,boat_id,vessel_snapshot,departed_at,returns_at) select $1,v.id,$2,to_jsonb(v)||'{\"fishing_count\":1}',clock_timestamp()-interval '1 hour',clock_timestamp()-interval '1 minute' from public.harbor_vessels v where id='fishing-raft' returning id",[user,boat])).rows[0].id
 }
 const operation=crypto.randomUUID()
 const sql=kind==='trap'?"select public.expedition_action('claim',$1,null,null,null,$2)":"select public.harbor_action('claim',$1,null,$2,1)"
 await db.exec('set local role authenticated')
 await db.query(sql,[operation,trip]);await db.query(sql,[operation,trip])
 await db.exec('reset role')
 const active=Date.now()<Date.parse('2026-11-01T00:00:00+09:00')
 expect(await gifts()).toHaveLength(active?1:0)
 const manual=await attempt('giseong-fish',true,new Date().toISOString())
 expect(await grant(manual,new Date().toISOString())).toBeNull()
})
it('does not award a gift when an event species is received or ownership changes without a capture',async()=>{
 await publish()
 const item=(await db.query<{id:string}>("insert into public.player_collectibles(user_id,species_id) values($1,'giseong-fish') returning id",[user])).rows[0].id
 await db.query('update public.player_collectibles set tank_id=null,escrow_gift_id=null where id=$1',[item])
 expect(await gifts()).toHaveLength(0)
 expect((await db.query<{allowed:boolean}>("select has_function_privilege('authenticated','app_private.grant_giseong_capture_reward(uuid,text,timestamptz,timestamptz)','execute') allowed")).rows[0].allowed).toBe(false)
})
