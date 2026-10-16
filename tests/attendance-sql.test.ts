// @vitest-environment node
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
const db=new PGlite(),uid='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002'
let today:string,migration:string
type State={today:string;checkedIn:boolean;streak:number;currentDay:number;completedDays:number;sheetNumber:number;completedSheets:number;reset:boolean;replayed?:boolean;reward?:{gold:number;bait_id:string|null}}
async function user(sql:string,params:unknown[]=[],id=uid){
 await db.exec('set role authenticated')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return await db.query(sql,params)}finally{await db.exec('reset role')}
}
async function state(){return (await user('select public.attendance_state() as value')).rows[0] as {value:State}}
async function claim(day=today){return (await user('select public.claim_attendance($1) as value',[day])).rows[0] as {value:State}}
async function seed(streak:number,gap=1,completed=0){await db.query("insert into public.player_attendance(user_id,last_claim_date,streak,completed_sheets) values($1,$2::date-$3::int,$4,$5)",[uid,today,gap,streak,completed])}
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,app_private to authenticated;
 create table public.fishing_baits(id text primary key);insert into public.fishing_baits values('bait_special'),('bait_epic');
 insert into auth.users values('${uid}'),('${other}');`)
 await db.exec(await readFile('supabase/sql/08-gold/01-wallet.sql','utf8'))
 await db.exec(await readFile('supabase/migrations/20261016083949_attendance_streak.sql','utf8'))
 migration=await readFile('supabase/migrations/20261016151410_attendance_28_day_sheet.sql','utf8');await db.exec(migration)
 today=(await db.query<{day:string}>("select ((transaction_timestamp() at time zone 'Asia/Seoul')::date)::text as day")).rows[0].day
},30000)
beforeEach(async()=>{await db.exec('truncate public.attendance_claims,public.player_attendance,public.gold_transactions,public.player_wallets')})
afterAll(()=>db.close())
it('uses Korea server date and gives exactly 50 gold once per day',async()=>{
 expect((await state()).value).toMatchObject({today,checkedIn:false,currentDay:1,completedDays:0,sheetNumber:1})
 expect((await claim()).value).toMatchObject({checkedIn:true,streak:1,completedDays:1,replayed:false,reward:{gold:50,bait_id:null}})
 expect((await claim()).value.replayed).toBe(true)
 expect((await db.query('select gold,test_claimed from public.player_wallets')).rows[0]).toEqual({gold:50,test_claimed:false})
 expect((await db.query('select count(*)::int as count from public.gold_transactions')).rows[0]).toEqual({count:1})
 await db.exec(migration)
 expect((await claim()).value.replayed).toBe(true)
})
it.each([7,14,21])('grants one moon pearl shrimp on sheet day %i',async(day)=>{
 await seed(day-1)
 expect((await claim()).value).toMatchObject({currentDay:day,reward:{bait_id:'bait_special'}})
 await claim()
 expect((await db.query('select inventory from public.player_wallets')).rows[0]).toEqual({inventory:{bait_special:1}})
})
it('grants the final bait on day 28, displays completion, then opens a fresh sheet',async()=>{
 await seed(27)
 expect((await claim()).value).toMatchObject({currentDay:28,completedDays:28,completedSheets:1,sheetNumber:1,reward:{bait_id:'bait_epic'}})
 await db.query('delete from public.attendance_claims')
 await db.query('update public.player_attendance set last_claim_date=$1::date-1',[today])
 expect((await state()).value).toMatchObject({checkedIn:false,streak:28,currentDay:1,completedDays:0,sheetNumber:2})
 expect((await claim()).value).toMatchObject({streak:29,currentDay:1,reward:{bait_id:null}})
})
it('repeats rewards on the next sheet and resets only current progress after a missed day',async()=>{
 await seed(34,1,1)
 expect((await claim()).value).toMatchObject({streak:35,currentDay:7,sheetNumber:2,reward:{bait_id:'bait_special'}})
 await db.exec('delete from public.attendance_claims;delete from public.player_attendance')
 await seed(55,1,1)
 expect((await claim()).value).toMatchObject({streak:56,currentDay:28,completedSheets:2,reward:{bait_id:'bait_epic'}})
 await db.exec('delete from public.attendance_claims;delete from public.player_attendance')
 await seed(20,2,2)
 expect((await state()).value).toMatchObject({streak:0,currentDay:1,completedDays:0,completedSheets:2,reset:true})
 expect((await claim()).value).toMatchObject({streak:1,currentDay:1,reward:{bait_id:null}})
})
it('rejects stale dates and rolls back the whole reward on gold overflow',async()=>{
 await expect(claim('2000-01-01')).rejects.toThrow('ATTENDANCE_DAY_CHANGED')
 await db.query('insert into public.player_wallets(user_id,gold) values($1,1000000000)',[uid])
 await expect(claim()).rejects.toThrow('GOLD_LIMIT')
 expect((await db.query('select * from public.attendance_claims')).rows).toHaveLength(0)
 expect((await state()).value.checkedIn).toBe(false)
})
it.each([[27,28,0,0],[28,1,1,0],[29,1,1,1],[30,1,1,2],[36,7,1,2],[60,1,2,4]])('preserves legacy progress at streak %i without issuing migration rewards',async(streak,nextDay,completed,offset)=>{
 await db.exec('alter table public.player_attendance drop column sheet_streak_offset')
 await seed(streak,1,Math.floor(streak/30))
 await db.exec(migration)
 expect((await state()).value).toMatchObject({streak,currentDay:nextDay,completedSheets:completed})
 expect((await db.query('select sheet_streak_offset from public.player_attendance')).rows[0]).toEqual({sheet_streak_offset:offset})
 expect((await db.query('select * from public.attendance_claims')).rows).toHaveLength(0)
 await db.exec(migration)
 expect((await state()).value.currentDay).toBe(nextDay)
 expect((await claim()).value.currentDay).toBe(nextDay)
 await db.query('update public.player_attendance set last_claim_date=$1::date-2',[today])
 expect((await state()).value.currentDay).toBe(1)
 await db.exec('delete from public.attendance_claims')
 expect((await claim()).value).toMatchObject({streak:1,currentDay:1})
})
it('isolates accounts and blocks direct client writes or anonymous claims',async()=>{
 await claim()
 expect((await user('select * from public.attendance_claims',[],other)).rows).toHaveLength(0)
 expect((await user('select * from public.player_attendance',[],other)).rows).toHaveLength(0)
 await expect(user('update public.player_attendance set streak=30')).rejects.toThrow('permission denied')
 await expect(user('delete from public.attendance_claims')).rejects.toThrow('permission denied')
 await expect(user('select public.claim_attendance($1)',[today],'')).rejects.toThrow('AUTH_REQUIRED')
 await db.exec('set role anon');await expect(db.query('select public.attendance_state()')).rejects.toThrow('permission denied');await db.exec('reset role')
})
