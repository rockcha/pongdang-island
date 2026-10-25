// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

let db:Awaited<ReturnType<typeof createLocalDatabase>>
let uid:string
async function user(sql:string,args:unknown[]=[]){
 await db.exec('set role authenticated')
 const result=(await db.query(sql,args)).rows[0]?.s
 await db.exec('reset role')
 return result
}
async function rejected(action:()=>Promise<unknown>,message:string|RegExp){
 await db.exec('savepoint rejected')
 try{await expect(action()).rejects.toThrow(message)}
 finally{await db.exec('rollback to rejected;reset role;release savepoint rejected')}
}
async function prepare(){return user("select public.prepare_discovery_fishing('pongdang','bait_grubby_magnet',$1,false) s",[crypto.randomUUID()])}
async function finish(op:string,won=true){
 await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '1 minute' where user_id=$1 and operation_id=$2",[uid,op])
 return user('select public.finish_fishing($1,$2) s',[op,won])
}
async function gold(){return (await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold}
async function equip(id:string|null,op=crypto.randomUUID(),fee=500){return user('select public.equip_relic($1,$2,$3) s',[id,op,fee])}
async function enableOnly(id:string,rarity:string){
 await db.query('update public.fishing_relics set enabled=(id=$1)',[id])
 await db.query("update app_private.fishing_bait_balance_profiles set common_bp=0,rare_bp=case when $1='rare' then 10000 else 0 end,epic_bp=case when $1='epic' then 10000 else 0 end,mythic_bp=case when $1='mythic' then 10000 else 0 end where id='bait_grubby_magnet'",[rarity])
}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('begin');uid=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'유물흐름검증')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid])
 await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,100000,'{\"bait_grubby_magnet\":1000}') on conflict(user_id) do update set gold=100000,inventory=excluded.inventory",[uid])
 await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang') on conflict(user_id) do update set region_id='pongdang'",[uid])
 // Only the category roll is fixed. Real rarity, reservation, finalization,
 // ownership, payment and public authorization paths remain in use.
 await db.exec("create or replace function app_private.fishing_reward_category(p_roll double precision) returns text language sql immutable set search_path='' as $$select 'relic'::text$$")
})
afterEach(async()=>{await db.exec('rollback;reset role')})

it('runs acquisition, paid equip, paid unequip and permanent duplicate exclusion for all sixteen real relics',async()=>{
 const relics=(await db.query('select id,rarity from public.fishing_relics order by id')).rows
 expect(relics).toHaveLength(16)
 for(const [index,relic] of relics.entries()){
  await enableOnly(relic.id,relic.rarity)
  await rejected(()=>equip(relic.id),'RELIC_NOT_OWNED')
  const reserved=await prepare()
  expect(reserved.species).toMatchObject({id:'relic-'+relic.id,kind:'relic',rarity:relic.rarity})
  const result=await finish(reserved.operation_id)
  expect(result.attempt.collectible_id).toBeNull()
  expect(result.attempt.firstDiscovery).toBe(true)
  const retry=await finish(reserved.operation_id)
  expect(retry.replayed).toBe(true);expect(retry.attempt).toEqual(result.attempt)
  expect((await user('select public.relic_state() s')).relics.find(r=>r.id===relic.id).owned).toBe(true)
  expect((await user('select public.collection_state() s')).catalog.find(r=>r.id==='relic-'+relic.id).discovered).toBe(true)
  const equipOp=crypto.randomUUID(),unequipOp=crypto.randomUUID(),balance=await gold()
  expect((await equip(relic.id,equipOp)).equippedId).toBe(relic.id)
  await equip(relic.id,equipOp);expect(await gold()).toBe(balance-500)
  const loadouts=(await db.query('select relic_id from app_private.player_relic_loadouts where user_id=$1',[uid])).rows
  expect(loadouts).toEqual([{relic_id:relic.id}])
  expect((await equip(null,unequipOp)).equippedId).toBeNull()
  await equip(null,unequipOp);expect(await gold()).toBe(balance-1000)
  expect((await db.query('select count(*)::int n from app_private.player_fishing_relics where user_id=$1',[uid])).rows[0].n).toBe(index+1)
  expect((await db.query("select count(*)::int n from app_private.fishing_discovery_candidates($1) where category='relic'",[relic.rarity])).rows[0].n).toBe(0)
  // Unequipping never restores the relic to the reward pool.
  const next=await prepare();expect(next.species.kind).not.toBe('relic');await finish(next.operation_id,false)
 }
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1',[uid])).rows[0].n).toBe(0)
 expect((await db.query("select count(*)::int n from public.gold_transactions where user_id=$1 and item_id like 'relic-loadout:%'",[uid])).rows[0].n).toBe(32)
},30000)

it('does not award failed or expired casts and leaves their relic available for another attempt',async()=>{
 await enableOnly('shell-hourglass','rare')
 const failed=await prepare();await finish(failed.operation_id,false)
 expect((await user('select public.relic_state() s')).relics[0].owned).toBe(false)
 const expired=await prepare();await db.query("update app_private.prepared_fishing_casts set expires_at=clock_timestamp()-interval '1 second' where operation_id=$1",[expired.operation_id]);await finish(expired.operation_id)
 expect((await db.query('select count(*)::int n from app_private.player_fishing_relics where user_id=$1',[uid])).rows[0].n).toBe(0)
 expect((await prepare()).species.id).toBe('relic-shell-hourglass')
})

it('rejects sale, exchange, tank admission and placement through public authenticated RPCs',async()=>{
 await enableOnly('shell-hourglass','rare')
 const reserved=await prepare();await finish(reserved.operation_id)
 const tank=(await user('select public.aquarium_state() s')).tanks[0].id
 const balance=await gold(),fakeId=crypto.randomUUID()
 for(const id of ['shell-hourglass','relic-shell-hourglass']){
  await rejected(()=>user("select public.exchange_post('sell','collectible',$1,1,'gold','gold',1,$2,'유물 판매') s",[id,crypto.randomUUID()]),'INVALID_EXCHANGE_ASSET')
  await rejected(()=>user("select public.exchange_post('sell','relic',$1,1,'gold','gold',1,$2,'유물 판매') s",[id,crypto.randomUUID()]),'INVALID_EXCHANGE_ASSET')
  await rejected(()=>user('select public.sell_collectibles($1::text[]::uuid[],$2) s',[[id],crypto.randomUUID()]),/invalid input syntax for type uuid/)
  await rejected(()=>user('select public.move_collectibles($1::text[]::uuid[],$2) s',[[id],tank]),/invalid input syntax for type uuid/)
 }
 await rejected(()=>user('select public.sell_collectibles($1,$2) s',[[fakeId],crypto.randomUUID()]),'COLLECTIBLE_NOT_FOUND')
 await rejected(()=>user('select public.move_collectibles($1,$2) s',[[fakeId],tank]),'COLLECTIBLE_NOT_FOUND')
 await rejected(()=>user('select public.place_collectible($1,$2,0.5,0.5) s',[fakeId,tank]),'COLLECTIBLE_NOT_FOUND')
 expect(await gold()).toBe(balance)
 expect((await db.query('select count(*)::int n from public.exchange_listings where owner_id=$1',[uid])).rows[0].n).toBe(0)
 expect((await user('select public.aquarium_state() s')).inhabitants).toHaveLength(0)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1',[uid])).rows[0].n).toBe(0)
 expect((await user('select public.relic_state() s')).relics[0].owned).toBe(true)
 // Attempts to sell or place the relic do not destroy its ownership.
 expect((await equip('shell-hourglass')).equippedId).toBe('shell-hourglass')
})

it('preserves equipped state and discovery if an unaffordable removal fails',async()=>{
 await enableOnly('shell-hourglass','rare');const p=await prepare();await finish(p.operation_id)
 await equip('shell-hourglass')
 await db.query('update public.player_wallets set gold=499 where user_id=$1',[uid])
 await rejected(()=>equip(null),'INSUFFICIENT_GOLD')
 const state=await user('select public.relic_state() s')
 expect(state.equippedId).toBe('shell-hourglass');expect(state.relics[0].owned).toBe(true);expect(await gold()).toBe(499)
 expect((await db.query("select count(*)::int n from app_private.fishing_discovery_candidates('rare') where category='relic' and reward_id='shell-hourglass'")).rows[0].n).toBe(0)
})
