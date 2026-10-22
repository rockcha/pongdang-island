// @vitest-environment node
import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'

const migration='20261022113750_separate_bite_confirmation_deadline.sql'
let db:any,legacy:any,legacyUser:string
const value=async(sql:string,args:unknown[]=[])=>Object.values((await db.query(sql,args)).rows[0])[0] as any
async function user(){
 const uid=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec("select app_private.get_gold_wallet();insert into public.player_navigation(user_id,region_id) values(auth.uid(),'pongdang') on conflict(user_id) do update set region_id='pongdang';update public.player_wallets set inventory=jsonb_build_object('bait',10,'bait_deep_sleep_sachet',10) where user_id=auth.uid()")
 return uid
}
const prepare=(confirm=true,id=crypto.randomUUID())=>value("select public.prepare_fishing('pongdang','bait_deep_sleep_sachet',$1,$2) p",[id,confirm])
const start=(id:string)=>value('select public.start_fishing_fight($1) p',[id])
const finish=(id:string,won:boolean)=>value('select public.finish_fishing($1,$2) p',[id,won])
const wallet=()=>value("select inventory from public.player_wallets where user_id=auth.uid()")
const age=(id:string)=>db.query("update app_private.prepared_fishing_casts set created_at=created_at-interval '30 minutes',expires_at=expires_at-interval '30 minutes' where operation_id=$1",[id])

beforeAll(async()=>{
 db=await createLocalDatabase()
 for(const file of migrationFiles().filter(file=>file<migration))await db.exec(readSql('supabase/migrations/'+file))
 await db.exec('update app_private.fishing_maintenance set released_at=starts_at where id')
 legacyUser=await user()
 legacy=await value("select public.prepare_fishing('pongdang','bait',$1) p",[crypto.randomUUID()])
 await db.exec(readFileSync('supabase/migrations/'+migration,'utf8'))
},60000)
afterAll(async()=>{await db?.close()})

it('preserves an already paid legacy cast and its original deadline',async()=>{
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[legacyUser])
 const resumed=await value("select public.prepare_fishing('pongdang','bait',$1) p",[legacy.operation_id])
 expect(resumed.expires_at).toBe(legacy.expires_at)
 expect(resumed.confirm_bite).toBe(false)
 await db.query("update app_private.prepared_fishing_casts set created_at=created_at-interval '30 seconds' where operation_id=$1",[legacy.operation_id])
 expect((await finish(legacy.operation_id,true)).attempt.collectible_id).toBeTruthy()
})

it('keeps a long bite confirmation alive, starts a fresh three-minute clock once, and never spends or rerolls again',async()=>{
 await user()
 const before=await wallet(),p=await prepare()
 expect(p.confirm_bite).toBe(true)
 expect(Date.parse(p.expires_at)-Date.parse(p.server_now)).toBeGreaterThan(23*60*60*1000)
 expect((await wallet()).bait_deep_sleep_sachet).toBe(before.bait_deep_sleep_sachet-1)
 await age(p.operation_id)
 const resumed=await prepare(false,p.operation_id)
 expect(resumed.species).toEqual(p.species)
 expect(resumed.confirm_bite).toBe(true)
 await expect(finish(p.operation_id,true)).rejects.toThrow('CAST_NOT_STARTED')
 const started=await start(p.operation_id),retry=await start(p.operation_id)
 expect(Date.parse(started.expires_at)-Date.parse(started.fight_started_at)).toBe(180000)
 expect(Date.parse(started.expires_at)-Date.parse(started.server_now)).toBeGreaterThan(179000)
 expect(retry.expires_at).toBe(started.expires_at)
 expect(retry.fight_started_at).toBe(started.fight_started_at)
 expect(retry.species).toEqual(p.species)
 expect((await wallet()).bait_deep_sleep_sachet).toBe(before.bait_deep_sleep_sachet-1)
 await expect(finish(p.operation_id,true)).rejects.toThrow('CAST_TOO_EARLY')
 await db.query("update app_private.prepared_fishing_casts set fight_started_at=fight_started_at-interval '4 seconds' where operation_id=$1",[p.operation_id])
 const result=await finish(p.operation_id,true),replay=await finish(p.operation_id,true)
 expect(result.attempt.species).toEqual(p.species)
 expect(result.attempt.collectible_id).toBeTruthy()
 expect(replay.replayed).toBe(true)
 expect(replay.attempt.collectible_id).toBe(result.attempt.collectible_id)
 expect(await value('select count(*)::integer from public.player_collectibles where id=$1',[result.attempt.collectible_id])).toBe(1)
})

it('rejects starting before the reserved bite time',async()=>{
 await user()
 const p=await prepare()
 await expect(start(p.operation_id)).rejects.toThrow('CAST_TOO_EARLY')
 expect(await value('select fight_started_at from app_private.prepared_fishing_casts where operation_id=$1',[p.operation_id])).toBeNull()
})

it('settles a day-old abandoned confirmation and permits a new cast without reviving it',async()=>{
 await user()
 const p=await prepare()
 await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '25 hours',expires_at=clock_timestamp()-interval '1 second' where operation_id=$1",[p.operation_id])
 const expired=await start(p.operation_id)
 expect(expired.finished).toBe(true)
 expect(expired.result.failure_reason).toBe('expired')
 expect(expired.result.attempt.collectible_id).toBeNull()
 expect((await finish(p.operation_id,true)).replayed).toBe(true)
 expect((await prepare()).operation_id).not.toBe(p.operation_id)
})

it('never extends an expired fight when the start request is retried',async()=>{
 await user()
 const p=await prepare();await age(p.operation_id);await start(p.operation_id)
 await db.query("update app_private.prepared_fishing_casts set fight_started_at=clock_timestamp()-interval '4 minutes',expires_at=clock_timestamp()-interval '1 second' where operation_id=$1",[p.operation_id])
 const expired=await start(p.operation_id)
 expect(expired.finished).toBe(true)
 expect(expired.result.failure_reason).toBe('expired')
 expect(expired.result.attempt.collectible_id).toBeNull()
})

it('retains automatic play with the existing wait plus three-minute deadline when opted out',async()=>{
 await user()
 const p=await prepare(false)
 expect(p.confirm_bite).toBe(false)
 const lifetime=await value('select extract(epoch from expires_at-created_at) from app_private.prepared_fishing_casts where operation_id=$1',[p.operation_id])
 expect(Number(lifetime)).toBeCloseTo(Number(p.wait_seconds)+180)
 expect((await start(p.operation_id)).fight_started_at).toBeNull()
 await db.query("update app_private.prepared_fishing_casts set created_at=created_at-interval '2 minutes' where operation_id=$1",[p.operation_id])
 expect((await finish(p.operation_id,true)).attempt.collectible_id).toBeTruthy()
})

it('requires the owner and authenticated role, and denies direct timer writes',async()=>{
 const owner=await user(),p=await prepare()
 await age(p.operation_id)
 await user()
 await expect(start(p.operation_id)).rejects.toThrow('CAST_NOT_FOUND')
 await db.query("select set_config('request.jwt.claim.sub','',false)")
 await expect(start(p.operation_id)).rejects.toThrow('AUTH_REQUIRED')
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner])
 await db.exec('set role anon')
 try{await expect(start(p.operation_id)).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
 await db.exec('set role authenticated')
 try{
  await expect(db.query("update app_private.prepared_fishing_casts set expires_at=clock_timestamp()+interval '1 year'")).rejects.toThrow(/permission denied/)
  expect((await start(p.operation_id)).fight_started_at).toBeTruthy()
 }finally{await db.exec('reset role')}
})
