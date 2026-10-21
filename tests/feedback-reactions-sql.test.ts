// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const [author,friend,stranger]=[91,92,93].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`)
const idea='91000000-0000-0000-0000-000000000001',bug='91000000-0000-0000-0000-000000000002'
async function asUser(uid,sql,params=[]){
 await db.exec(uid?'set role authenticated':'set role anon')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,params)}
 finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}
}
async function vote(uid,kind,id,value){return (await asUser(uid,'select public.set_feedback_reaction($1,$2,$3) r',[kind,id,value])).rows[0].r}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const id of [author,friend,stranger]){
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,JSON.stringify({game_nickname:id.slice(-3)})])
  await asUser(id,'select public.sync_player_profile()')
 }
 await asUser(author,"insert into public.suggestion_posts(id,title,body) values($1,'idea','body')",[idea])
 await asUser(author,"insert into public.bug_reports(id,title,body) values($1,'bug','body')",[bug])
},60000)
afterAll(async()=>{await db?.close()})
it('persists one desired vote per account, switches sides, cancels and aggregates both kinds',async()=>{
 for(const [kind,id] of [['suggestion',idea],['bug',bug]]){
  expect(await vote(author,kind,id,1)).toMatchObject({likes:1,dislikes:0,my_reaction:1})
  expect(await vote(author,kind,id,1)).toMatchObject({likes:1,dislikes:0})
  expect(await vote(friend,kind,id,-1)).toMatchObject({likes:1,dislikes:1,my_reaction:-1})
  expect(await vote(author,kind,id,-1)).toMatchObject({likes:0,dislikes:2,my_reaction:-1})
  expect(await vote(author,kind,id,0)).toMatchObject({likes:0,dislikes:1,my_reaction:0})
  await vote(friend,kind,id,0)
 }
})
it('rejects anonymous access, invalid input and forged user votes',async()=>{
 await expect(vote(null,'bug',bug,1)).rejects.toThrow(/permission denied/)
 await expect(asUser(null,'select public.feedback_reactions($1,$2)',['bug',[bug]])).rejects.toThrow(/permission denied/)
 await expect(vote(author,'bug',bug,2)).rejects.toThrow(/INVALID_FEEDBACK_VALUE/)
 await expect(vote(author,'other',bug,1)).rejects.toThrow(/INVALID_FEEDBACK_KIND/)
 await expect(asUser(author,'select public.feedback_reactions($1,$2)',['bug',Array(21).fill(bug)])).rejects.toThrow(/INVALID_FEEDBACK_IDS/)
 await expect(asUser(stranger,'insert into app_private.feedback_bug_votes values($1,$2,1)',[bug,author])).rejects.toThrow(/row-level security/)
 await vote(author,'bug',bug,1)
 expect((await asUser(stranger,'delete from app_private.feedback_bug_votes returning *')).rows).toHaveLength(0)
 expect((await asUser(stranger,'update app_private.feedback_bug_votes set value=-1 returning *')).rows).toHaveLength(0)
})
it('inherits friends-only visibility for reads and votes, including after friendship ends',async()=>{
 await asUser(author,'update public.suggestion_posts set friends_only=true where id=$1',[idea])
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[author,friend])
 await vote(friend,'suggestion',idea,1)
 expect((await asUser(stranger,'select public.feedback_reactions($1,$2) r',['suggestion',[idea]])).rows[0].r).toEqual([])
 await expect(vote(stranger,'suggestion',idea,1)).rejects.toThrow(/FEEDBACK_NOT_FOUND/)
 await db.exec("update public.friend_requests set status='removed'")
 await expect(vote(friend,'suggestion',idea,-1)).rejects.toThrow(/FEEDBACK_NOT_FOUND/)
 expect((await asUser(friend,'select public.feedback_reactions($1,$2) r',['suggestion',[idea]])).rows[0].r).toEqual([])
})
it('returns only readable post avatars without exposing unrelated profile fields',async()=>{
 const path=`${author}/avatar.webp`
 await db.query('update public.player_profiles set avatar_path=$1 where id=$2',[path,author])
 const load=async(uid,kind,ids)=>(await asUser(uid,'select public.feedback_authors($1,$2) r',[kind,ids])).rows[0].r
 expect(await load(stranger,'bug',[bug])).toEqual([{id:bug,avatar_path:path}])
 expect(await load(author,'suggestion',[idea])).toEqual([{id:idea,avatar_path:path}])
 // The preceding visibility test removed this friendship; avatar access must end too.
 expect(await load(friend,'suggestion',[idea])).toEqual([])
 expect(await load(stranger,'suggestion',[idea])).toEqual([])
 await expect(load(null,'bug',[bug])).rejects.toThrow(/permission denied/)
 await expect(asUser(null,'select app_private.feedback_authors($1,$2)',['bug',[bug]])).rejects.toThrow(/permission denied/)
 await expect(load(author,'invalid',[bug])).rejects.toThrow(/INVALID_FEEDBACK_KIND/)
 await expect(load(author,'bug',Array(21).fill(bug))).rejects.toThrow(/INVALID_FEEDBACK_IDS/)
})
it('removes votes with deleted posts',async()=>{
 await asUser(author,'delete from public.suggestion_posts where id=$1',[idea])
 expect((await db.query('select * from app_private.feedback_suggestion_votes')).rows).toHaveLength(0)
})
