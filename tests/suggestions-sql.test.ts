// @vitest-environment node
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db
const [author,friend,stranger,operator]=[1,2,3,4].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`)
const publicPost='10000000-0000-0000-0000-000000000001',privatePost='10000000-0000-0000-0000-000000000002'
async function asUser(uid,sql,params=[]){
 await db.exec(uid?'set role authenticated':'set role anon')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,params)}
 finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}
}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [i,id] of [author,friend,stranger,operator].entries()){
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,JSON.stringify({game_nickname:`tester${i}`})])
  await asUser(id,'select public.sync_player_profile()')
 }
 await db.query('insert into app_private.notice_operators(user_id) values($1)',[operator])
},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('truncate public.suggestion_posts cascade; truncate public.notifications cascade; truncate public.friend_requests cascade; truncate public.player_wallets cascade;')
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[author,friend])
 await asUser(author,"insert into public.suggestion_posts(id,title,body,friends_only) values($1,'Public idea','Details',false),($2,'Private idea','Friends details',true)",[publicPost,privatePost])
})
it('allows every signed-in player to post and stamps their real profile name',async()=>{
 const row=(await asUser(stranger,"insert into public.suggestion_posts(title,body) values('New idea','Something helpful') returning *")).rows[0]
 expect(row.author_id).toBe(stranger);expect(row.author_name).toBe('tester2')
 await expect(asUser(stranger,'insert into public.suggestion_posts(author_id,title,body) values($1,$2,$3)',[author,'Fake','Fake'])).rejects.toThrow(/permission denied/)
 await expect(asUser(stranger,"insert into public.suggestion_posts(title,body,author_name) values('Fake','Fake','Admin')")).rejects.toThrow(/permission denied/)
 await expect(asUser(stranger,"insert into public.suggestion_posts(title,body) values('   ','Details')")).rejects.toThrow(/check constraint/)
})
it('limits friends-only reads to author, current accepted friends, and operators',async()=>{
 for(const id of [author,friend,operator])expect((await asUser(id,'select id from public.suggestion_posts')).rows).toHaveLength(2)
 expect((await asUser(stranger,'select id from public.suggestion_posts')).rows).toEqual([{id:publicPost}])
 await db.exec("update public.friend_requests set status='removed'")
 expect((await asUser(friend,'select id from public.suggestion_posts')).rows).toEqual([{id:publicPost}])
 await db.exec("update public.friend_requests set status='pending'")
 expect((await asUser(friend,'select id from public.suggestion_posts')).rows).toHaveLength(1)
})
it('allows the author to change visibility but forbids others from editing or deleting',async()=>{
 expect((await asUser(stranger,"update public.suggestion_posts set title='Hacked' returning id")).rows).toHaveLength(0)
 expect((await asUser(friend,'delete from public.suggestion_posts returning id')).rows).toHaveLength(0)
 await asUser(author,'update public.suggestion_posts set friends_only=true where id=$1',[publicPost])
 expect((await asUser(stranger,'select id from public.suggestion_posts')).rows).toHaveLength(0)
 await asUser(author,'update public.suggestion_posts set friends_only=false where id=$1',[privatePost])
 expect((await asUser(stranger,'select id from public.suggestion_posts')).rows).toEqual([{id:privatePost}])
 expect((await asUser(author,'delete from public.suggestion_posts where id=$1 returning id',[publicPost])).rows).toHaveLength(1)
})
it('denies anonymous reads/writes and both public and private adoption endpoints',async()=>{
 await expect(asUser(null,'select * from public.suggestion_posts')).rejects.toThrow(/permission denied/)
 await expect(asUser(null,"insert into public.suggestion_posts(title,body) values('Anon','No')")).rejects.toThrow(/permission denied/)
 await expect(asUser(null,'select public.adopt_suggestion($1)',[publicPost])).rejects.toThrow(/permission denied/)
 for(const id of [author,friend,stranger]){
  await expect(asUser(id,'select public.adopt_suggestion($1)',[publicPost])).rejects.toThrow(/SUGGESTION_OPERATOR_REQUIRED/)
  await expect(asUser(id,'select app_private.adopt_suggestion($1)',[privatePost])).rejects.toThrow(/SUGGESTION_OPERATOR_REQUIRED/)
 }
 await expect(asUser(author,'update public.suggestion_posts set adopted_at=now() where id=$1',[publicPost])).rejects.toThrow(/permission denied/)
})
it('atomically grants exactly two special baits and one operator notification, once per post',async()=>{
 await db.query('insert into public.player_wallets(user_id,gold,inventory) values($1,123,$2)',[author,JSON.stringify({bait:9,bait_epic:5})])
 const adopted=(await asUser(operator,'select public.adopt_suggestion($1) as post',[privatePost])).rows[0].post
 expect(adopted.adopted_by).toBe(operator);expect(adopted.adopted_at).toBeTruthy()
 expect(Object.values(adopted.reward).reduce((n:number,v:number)=>n+v,0)).toBe(2)
 expect(Object.keys(adopted.reward).every(k=>['bait_safe','bait_special','bait_epic','bait_magnet','bait_forbidden_star','bait_grubby_magnet','bait_sea_memory','bait_first_greeting'].includes(k))).toBe(true)
 const wallet=(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[author])).rows[0]
 expect(wallet.gold).toBe(123);expect(wallet.inventory.bait).toBe(9)
 for(const id of ['bait_safe','bait_special','bait_epic','bait_magnet','bait_forbidden_star','bait_grubby_magnet','bait_sea_memory','bait_first_greeting'])expect(wallet.inventory[id]??0).toBe((id==='bait_epic'?5:0)+(adopted.reward[id]??0))
 const notification=(await db.query('select * from public.notifications where recipient_id=$1',[author])).rows
 expect(notification).toHaveLength(1);expect(notification[0]).toMatchObject({actor_id:operator,category:'general',kind:'reward'})
 expect(notification[0].title).toContain('[운영팀]')
 const again=(await asUser(operator,'select public.adopt_suggestion($1) as post',[privatePost])).rows[0].post
 expect(again.reward).toEqual(adopted.reward)
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[author])).rows[0].inventory).toEqual(wallet.inventory)
 expect((await db.query('select id from public.notifications')).rows).toHaveLength(1)
 expect((await asUser(author,"update public.suggestion_posts set body='Changed' where id=$1 returning id",[privatePost])).rows).toHaveLength(0)
 expect((await asUser(author,'delete from public.suggestion_posts where id=$1 returning id',[privatePost])).rows).toHaveLength(0)
})
it('rolls back adoption and wallet delivery if the notification cannot be saved',async()=>{
 await db.exec("create function app_private.fail_suggestion_notification() returns trigger language plpgsql as $$begin raise exception 'TEST_DELIVERY_FAILURE'; end$$; create trigger fail_suggestion_notification before insert on public.notifications for each row execute function app_private.fail_suggestion_notification()")
 try{
  await expect(asUser(operator,'select public.adopt_suggestion($1)',[publicPost])).rejects.toThrow(/TEST_DELIVERY_FAILURE/)
  expect((await db.query('select adopted_at,reward from public.suggestion_posts where id=$1',[publicPost])).rows[0]).toEqual({adopted_at:null,reward:{}})
  expect((await db.query('select * from public.player_wallets where user_id=$1',[author])).rows).toHaveLength(0)
 }finally{await db.exec('drop trigger fail_suggestion_notification on public.notifications; drop function app_private.fail_suggestion_notification()')}
})
