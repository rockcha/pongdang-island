// @vitest-environment node
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db
const [author,other,operator]=[1,2,3].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`)
const report='20000000-0000-0000-0000-000000000001'
async function asUser(uid,sql,params=[]){
 await db.exec(uid?'set role authenticated':'set role anon')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,params)}
 finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}
}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [i,id] of [author,other,operator].entries()){
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,JSON.stringify({game_nickname:`reporter${i}`})])
  await asUser(id,'select public.sync_player_profile()')
 }
 await db.query('insert into app_private.notice_operators(user_id) values($1)',[operator])
},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('truncate public.bug_reports cascade; truncate public.notifications cascade; truncate public.player_wallets cascade;')
 await asUser(author,"insert into public.bug_reports(id,title,body) values($1,'A bug','Steps to reproduce')",[report])
})
it('lets signed-in players report and read, without spoofing another author or confirmation',async()=>{
 const row=(await asUser(other,"insert into public.bug_reports(title,body) values('Second bug','Details') returning *")).rows[0]
 expect(row.author_id).toBe(other);expect(row.author_name).toBe('reporter1')
 expect((await asUser(other,'select id from public.bug_reports')).rows).toHaveLength(2)
 await expect(asUser(other,"insert into public.bug_reports(author_id,title,body) values($1,'Spoof','No')",[author])).rejects.toThrow(/permission denied/)
 await expect(asUser(author,'update public.bug_reports set confirmed_at=now()')).rejects.toThrow(/permission denied/)
 await expect(asUser(author,"insert into public.bug_reports(title,body) values('  ','Details')")).rejects.toThrow(/check constraint/)
})
it('allows only the author to edit/delete an unconfirmed report',async()=>{
 expect((await asUser(other,"update public.bug_reports set body='Changed' returning id")).rows).toHaveLength(0)
 expect((await asUser(other,'delete from public.bug_reports returning id')).rows).toHaveLength(0)
 expect((await asUser(author,"update public.bug_reports set body='Fixed details' returning id")).rows).toEqual([{id:report}])
 expect((await asUser(author,'delete from public.bug_reports returning id')).rows).toEqual([{id:report}])
})
it('denies anonymous access and refuses non-operator confirmation through either endpoint',async()=>{
 await expect(asUser(null,'select * from public.bug_reports')).rejects.toThrow(/permission denied/)
 await expect(asUser(null,"insert into public.bug_reports(title,body) values('Anon','No')")).rejects.toThrow(/permission denied/)
 await expect(asUser(null,'select public.confirm_bug_report($1)',[report])).rejects.toThrow(/permission denied/)
 for(const id of [author,other])for(const schema of ['public','app_private'])await expect(asUser(id,`select ${schema}.confirm_bug_report($1)`,[report])).rejects.toThrow(/BUG_REPORT_OPERATOR_REQUIRED/)
})
it('confirms a report and delivers exactly one special bait and operator notification only once',async()=>{
 const initial={bait:8,bait_special:3}
 await db.query('insert into public.player_wallets(user_id,gold,inventory) values($1,789,$2)',[author,JSON.stringify(initial)])
 const confirmed=(await asUser(operator,'select public.confirm_bug_report($1) as report',[report])).rows[0].report
 expect(confirmed.confirmed_by).toBe(operator);expect(confirmed.confirmed_at).toBeTruthy()
 const rewards=Object.entries(confirmed.reward)
 expect(rewards).toHaveLength(1)
 expect(['bait_safe','bait_special','bait_epic','bait_magnet','bait_forbidden_star','bait_grubby_magnet','bait_sea_memory','bait_first_greeting']).toContain(rewards[0][0]);expect(rewards[0][1]).toBe(1)
 const wallet=(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[author])).rows[0]
 expect(wallet.gold).toBe(789);expect(wallet.inventory).toEqual({...initial,[rewards[0][0]]:(initial[rewards[0][0]]??0)+1})
 const notifications=(await db.query('select actor_id,kind,body from public.notifications where recipient_id=$1',[author])).rows
 expect(notifications).toHaveLength(1);expect(notifications[0]).toMatchObject({actor_id:operator,kind:'reward'});expect(notifications[0].body).toContain('1개')
 expect((await asUser(operator,'select public.confirm_bug_report($1) as report',[report])).rows[0].report.reward).toEqual(confirmed.reward)
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[author])).rows[0].inventory).toEqual(wallet.inventory)
 expect((await db.query('select id from public.notifications')).rows).toHaveLength(1)
 expect((await asUser(author,"update public.bug_reports set body='Changed' returning id")).rows).toHaveLength(0)
 expect((await asUser(author,'delete from public.bug_reports returning id')).rows).toHaveLength(0)
})
it('rolls back confirmation and reward when notification delivery fails',async()=>{
 await db.exec("create function app_private.fail_bug_notification() returns trigger language plpgsql as $$begin raise exception 'TEST_DELIVERY_FAILURE'; end$$; create trigger fail_bug_notification before insert on public.notifications for each row execute function app_private.fail_bug_notification()")
 try{
  await expect(asUser(operator,'select public.confirm_bug_report($1)',[report])).rejects.toThrow(/TEST_DELIVERY_FAILURE/)
  expect((await db.query('select confirmed_at,reward from public.bug_reports where id=$1',[report])).rows[0]).toEqual({confirmed_at:null,reward:{}})
  expect((await db.query('select * from public.player_wallets')).rows).toHaveLength(0)
 }finally{await db.exec('drop trigger fail_bug_notification on public.notifications; drop function app_private.fail_bug_notification()')}
})
