// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'
const migration='20261022074953_fishing_maintenance_cast_tester.sql'
const tester='00000000-0000-0000-0000-000000007332'
const other='00000000-0000-0000-0000-000000007333'
const emailTester='00000000-0000-0000-0000-000000007334'
let db:any
const login=(id:string)=>db.query("select set_config('request.jwt.claim.sub',$1,false)",[id])
const wallet=async(id:string)=>(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[id])).rows[0]
beforeAll(async()=>{
 db=await createLocalDatabase()
 for(const file of migrationFiles().filter(f=>f<migration))await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
 await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'operator@example.test','{\"game_nickname\":\"낚시테스터\"}'),($2,'other@example.test','{\"email\":\"1@1.com\",\"game_nickname\":\"일반계정\"}'),($3,'1@1.com','{\"game_nickname\":\"이메일테스터\"}')",[tester,other,emailTester])
 await db.query('insert into app_private.notice_operators(user_id) values($1)',[tester])
 await db.exec(readFileSync('supabase/migrations/'+migration,'utf8'))
 for(const id of [tester,other,emailTester]){
  await login(id)
  await db.exec('select public.sync_player_profile()')
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,100000,'{\"bait\":10,\"fuel\":100}') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory",[id])
  await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang') on conflict(user_id) do update set region_id=excluded.region_id",[id])
 }
 await db.exec("update app_private.fishing_maintenance set starts_at=clock_timestamp()-interval '1 second',released_at=null")
},60000)
afterAll(async()=>{await db?.close()})

it('recognizes server operator membership and permits authenticated prepare, retry and finish',async()=>{
 expect((await db.query('select user_id from app_private.notice_operators')).rows).toEqual([{user_id:tester}])
 await login(tester)
 const before=await wallet(tester),op=crypto.randomUUID()
 await db.exec('set role authenticated')
 try{
  const result=(await db.query("select public.prepare_fishing('pongdang','bait',$1) p",[op])).rows[0].p
  expect(result.operation_id).toBe(op)
  expect((await db.query("select public.prepare_fishing('pongdang','bait',$1) p",[op])).rows[0].p).toEqual(result)
  await db.query('select public.finish_fishing($1,false)',[op])
 }finally{await db.exec('reset role')}
 expect((await wallet(tester)).inventory.bait).toBe(before.inventory.bait-1)
 expect((await db.query('select released_at from app_private.fishing_maintenance')).rows[0].released_at).toBeNull()
})

it('blocks another account even when its user metadata claims the allowed email',async()=>{
 await login(other)
 const before=await wallet(other)
 await db.exec('set role authenticated')
 try{await expect(db.query("select public.prepare_fishing('pongdang','bait',$1)",[crypto.randomUUID()])).rejects.toThrow(/FISHING_MAINTENANCE/)}finally{await db.exec('reset role')}
 expect(await wallet(other)).toEqual(before)
})

it('also allows the explicitly requested email account without granting operator rights',async()=>{
 await login(emailTester)
 expect((await db.query('select public.notice_is_operator() allowed')).rows[0].allowed).toBe(false)
 const op=crypto.randomUUID()
 await db.exec('set role authenticated')
 try{
  expect((await db.query("select public.prepare_fishing('pongdang','bait',$1) p",[op])).rows[0].p.operation_id).toBe(op)
  await db.query('select public.finish_fishing($1,false)',[op])
  await expect(db.query("select public.buy_fishing_bait('bait',$1)",[crypto.randomUUID()])).rejects.toThrow(/FISHING_MAINTENANCE/)
 }finally{await db.exec('reset role')}
})

it('does not let the tester create a cast for another user',async()=>{
 await login(tester)
 await expect(db.query(`insert into app_private.prepared_fishing_casts
 select (jsonb_populate_record(null::app_private.prepared_fishing_casts,to_jsonb(c)||jsonb_build_object('user_id',$1::uuid))).*
 from app_private.prepared_fishing_casts c where c.user_id=$2 limit 1`,[other,tester])).rejects.toThrow(/FISHING_MAINTENANCE/)
})

it('keeps bait purchases, trap starts and boat departures blocked for the tester',async()=>{
 await login(tester)
 const before=await wallet(tester)
 await expect(db.query("select public.buy_fishing_bait('bait',$1)",[crypto.randomUUID()])).rejects.toThrow(/FISHING_MAINTENANCE/)
 await expect(db.query("select public.trade_gold($1,'buy','bait')",[crypto.randomUUID()])).rejects.toThrow(/FISHING_MAINTENANCE/)
 await expect(db.query("select public.expedition_action('depart',$1,'dinghy','pongdang','{\"bait\":1}')",[crypto.randomUUID()])).rejects.toThrow(/FISHING_MAINTENANCE/)
 expect(await wallet(tester)).toEqual(before)
 await db.query("select public.harbor_action('buy',$1,'current-rider')",[crypto.randomUUID()])
 const afterPurchase=await wallet(tester)
 await expect(db.query("select public.harbor_action('depart',$1,'current-rider')",[crypto.randomUUID()])).rejects.toThrow(/FISHING_MAINTENANCE/)
 expect(await wallet(tester)).toEqual(afterPurchase)
})

it('still blocks the tester from claiming existing traps and boats',async()=>{
 await login(tester)
 await db.exec("update app_private.fishing_maintenance set starts_at=clock_timestamp()+interval '1 hour'")
 const trap=(await db.query("select public.expedition_action('depart',$1,'dinghy','pongdang','{\"bait\":1}') r",[crypto.randomUUID()])).rows[0].r
 const boat=(await db.query("select public.harbor_action('depart',$1,'current-rider') r",[crypto.randomUUID()])).rows[0].r
 await db.exec("update public.fishing_expeditions set departed_at=clock_timestamp()-interval '2 hours',returns_at=clock_timestamp()-interval '1 minute';update public.harbor_voyages set departed_at=clock_timestamp()-interval '2 hours',returns_at=clock_timestamp()-interval '1 minute';update app_private.fishing_maintenance set starts_at=clock_timestamp()-interval '1 second'")
 const before=await wallet(tester)
 await expect(db.query("select public.expedition_action('claim',$1,null,null,null,$2)",[crypto.randomUUID(),trap.active.id])).rejects.toThrow(/FISHING_MAINTENANCE/)
 await expect(db.query("select public.harbor_action('claim',$1,null,$2)",[crypto.randomUUID(),boat.receipt.voyageId])).rejects.toThrow(/FISHING_MAINTENANCE/)
 expect(await wallet(tester)).toEqual(before)
})

it.each(['anon','authenticated'])('denies %s reading, self-enrolling or modifying maintenance exceptions',async(role)=>{
 await login(other)
 await db.exec('set role '+role)
 try{
  await expect(db.query('select * from app_private.notice_operators')).rejects.toThrow(/permission denied/)
  await expect(db.query('insert into app_private.notice_operators(user_id) values($1)',[other])).rejects.toThrow(/permission denied/)
  await expect(db.query('delete from app_private.notice_operators')).rejects.toThrow(/permission denied/)
 }finally{await db.exec('reset role')}
})

it('revokes manual fishing as soon as DB-owner membership is removed',async()=>{
 await login(tester)
 await db.query('delete from app_private.notice_operators where user_id=$1',[tester])
 await expect(db.query("select public.prepare_fishing('pongdang','bait',$1)",[crypto.randomUUID()])).rejects.toThrow(/FISHING_MAINTENANCE/)
})
