// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

let db:any
const owner='00000000-0000-4000-8000-000000006731'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db,{keepScheduledMaintenance:true})},180000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec(`begin;insert into auth.users(id) values('${owner}');insert into public.player_profiles(id,nickname) values('${owner}','점검도전자');insert into public.player_wallets(user_id,gold) values('${owner}',100) on conflict(user_id) do update set gold=100;update app_private.pongi_whack_maintenance set starts_at=clock_timestamp()+interval '1 hour',released_at=null;`)
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner])
})
afterEach(async()=>{await db.exec('rollback;reset role')})
async function action(action:string,operation:string|null=null,id:string|null=null,hits:any[]=[]){
 return (await db.query('select public.pongi_whack_action($1,$2,$3,$4) result',[action,operation,id,JSON.stringify(hits)])).rows[0].result
}
async function close(){await db.exec("update app_private.pongi_whack_maintenance set starts_at=clock_timestamp()-interval '1 minute',released_at=null")}
async function expectBlocked(){
 await db.exec('savepoint blocked_start')
 await expect(action('start',crypto.randomUUID())).rejects.toThrow('PONGI_WHACK_MAINTENANCE')
 await db.exec('rollback to blocked_start;release savepoint blocked_start')
}

it('closes exactly at November 2 midnight KST and only reopens at an explicit release',async()=>{
 await db.exec("update app_private.pongi_whack_maintenance set starts_at='2026-11-02 00:00+09',released_at=null")
 const check=async(at:string)=>(await db.query('select app_private.pongi_whack_maintenance_active($1) active',[at])).rows[0].active
 expect(await check('2026-11-01 23:59:59.999+09')).toBe(false)
 expect(await check('2026-11-02 00:00:00+09')).toBe(true)
 expect(await check('2026-12-01 00:00:00+09')).toBe(true)
 await db.exec("update app_private.pongi_whack_maintenance set released_at='2026-11-03 10:00+09'")
 expect(await check('2026-11-03 09:59:59+09')).toBe(true)
 expect(await check('2026-11-03 10:00:00+09')).toBe(false)
 await db.exec("update app_private.pongi_whack_maintenance set starts_at=clock_timestamp()-interval '1 minute',released_at=clock_timestamp()")
 expect((await action('start',crypto.randomUUID())).gold).toBe(90)
})

it('rejects a new start without charging gold, creating a run or advancing quests',async()=>{
 const before=(await db.query('select public.quest_state() result')).rows[0].result
 await close();await expectBlocked()
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[owner])).rows[0].gold).toBe(100)
 expect((await db.query('select count(*)::int n from app_private.pongi_whack_runs where user_id=$1',[owner])).rows[0].n).toBe(0)
 expect((await db.query('select count(*)::int n from public.gold_transactions where user_id=$1',[owner])).rows[0].n).toBe(0)
 expect((await db.query('select public.quest_state() result')).rows[0].result.daily.quests).toEqual(before.daily.quests)
})

it('preserves an accepted start operation across the cutoff and permits state and leave',async()=>{
 const operation=crypto.randomUUID(),started=await action('start',operation)
 expect(started.gold).toBe(90)
 await close()
 expect((await action('start',operation)).run.id).toBe(started.run.id)
 expect((await action('state')).maintenance.active).toBe(true)
 await action('leave',null,started.run.id)
 expect((await action('state')).run).toBeNull()
 expect((await action('start',operation)).run.abandoned).toBe(true)
 await expectBlocked()
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[owner])).rows[0].gold).toBe(90)
})

it('finishes a pre-cutoff run, preserves its ranking record and pays its reward once',async()=>{
 const {run}=await action('start',crypto.randomUUID())
 await db.query("update app_private.pongi_whack_runs set started_at=clock_timestamp()-interval '31 seconds',targets=$1 where id=$2",[JSON.stringify([{id:0,hole:0,at:500,until:1500,kind:'golden'}]),run.id])
 await close()
 const finished=await action('finish',null,run.id,[{id:0,ms:650}])
 expect(finished.run).toMatchObject({score:10,rewardGold:10})
 expect(finished.gold).toBe(100)
 expect((await action('finish',null,run.id,[])).gold).toBe(100)
 expect((await db.query('select score,finished_at is not null finished from app_private.pongi_whack_runs where id=$1',[run.id])).rows[0]).toEqual({score:10,finished:true})
 expect((await db.query('select public.pongi_whack_leaderboard(0) result')).rows[0].result.rows.some((row:any)=>row.userId===owner&&row.id===run.id)).toBe(true)
})

it('enforces the gate through the authenticated RPC and keeps the switch owner-only',async()=>{
 await close();await db.exec('set local role authenticated')
 await expectBlocked()
 const state=await action('state')
 expect(state.maintenance.active).toBe(true)
 for(const query of ['select * from app_private.pongi_whack_maintenance','update app_private.pongi_whack_maintenance set released_at=clock_timestamp()']){
  await db.exec('savepoint gate_permissions')
  await expect(db.query(query)).rejects.toThrow(/permission denied/)
  await db.exec('rollback to gate_permissions;release savepoint gate_permissions')
 }
})
