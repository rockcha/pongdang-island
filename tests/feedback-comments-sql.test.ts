// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const [author,friend,stranger,operator]=[191,192,193,194].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`)
const idea=crypto.randomUUID(),bug=crypto.randomUUID()
async function user(uid,sql,args=[]){await db.exec(uid?'set role authenticated':'set role anon');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,args)}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}}
const action=async(uid,kind,id,act,cid,body='')=>(await user(uid,'select public.feedback_comment_action($1,$2,$3,$4,$5) r',[kind,id,act,cid,body])).rows[0].r
const feed=async(uid,kind,id,offset=0)=>(await user(uid,'select public.feedback_comments($1,$2,$3) r',[kind,id,offset])).rows[0].r
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const id of [author,friend,stranger,operator]){await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,{game_nickname:id.slice(-3)}]);await user(id,'select public.sync_player_profile()')}
 await db.query('insert into app_private.notice_operators(user_id) values($1)',[operator])
 await user(author,"insert into public.suggestion_posts(id,title,body,friends_only) values($1,'idea','body',true)",[idea])
 await user(author,"insert into public.bug_reports(id,title,body) values($1,'bug','body')",[bug])
 await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[author,friend])
},60000)
afterAll(async()=>await db?.close())
it('adds, deduplicates retries, edits and restricts deletion for both boards',async()=>{
 for(const [kind,id] of [['suggestion',idea],['bug',bug]]){
  const cid=crypto.randomUUID()
  expect(await action(friend,kind,id,'add',cid,' 안녕하세요 ')).toBe(cid)
  await action(friend,kind,id,'add',cid,'안녕하세요')
  expect((await feed(author,kind,id)).items).toHaveLength(1)
  await expect(action(friend,kind,id,'add',cid,'다른 내용')).rejects.toThrow(/OPERATION_CONFLICT/)
  await expect(action(author,kind,id,'edit',cid,'변조')).rejects.toThrow(/FORBIDDEN/)
  await action(friend,kind,id,'edit',cid,'수정 댓글')
  expect((await feed(author,kind,id)).items[0]).toMatchObject({body:'수정 댓글',author_id:friend})
  await expect(action(author,kind,id,'delete',cid)).rejects.toThrow(/FORBIDDEN/)
  await action(operator,kind,id,'delete',cid);await action(operator,kind,id,'delete',cid)
  expect((await feed(author,kind,id)).total).toBe(0)
 }
})
it('enforces friends-only visibility even after a commenter loses friendship',async()=>{
 const cid=crypto.randomUUID();await action(friend,'suggestion',idea,'add',cid,'친구 댓글')
 await expect(feed(stranger,'suggestion',idea)).rejects.toThrow(/FEEDBACK_NOT_FOUND/)
 await expect(action(stranger,'suggestion',idea,'add',crypto.randomUUID(),'비공개')).rejects.toThrow(/FEEDBACK_NOT_FOUND/)
 await db.query("update public.friend_requests set status='removed' where sender_id=$1",[author])
 await expect(feed(friend,'suggestion',idea)).rejects.toThrow(/FEEDBACK_NOT_FOUND/)
 await expect(action(friend,'suggestion',idea,'edit',cid,'수정')).rejects.toThrow(/FEEDBACK_NOT_FOUND/)
 expect((await feed(operator,'suggestion',idea)).total).toBe(1)
})
it('blocks anonymous/direct writes, invalid bodies, invalid pagination and cross-post comment reuse',async()=>{
 await expect(feed(null,'bug',bug)).rejects.toThrow(/permission denied/)
 await expect(action(null,'bug',bug,'add',crypto.randomUUID(),'text')).rejects.toThrow(/permission denied/)
 await expect(user(author,'select * from public.feedback_comments')).rejects.toThrow(/permission denied/)
 await expect(user(author,"insert into public.feedback_comments(id,bug_id,author_id,body) values($1,$2,$3,'forged')",[crypto.randomUUID(),bug,stranger])).rejects.toThrow(/permission denied/)
 for(const body of ['', ' ', '가'.repeat(501)])await expect(action(author,'bug',bug,'add',crypto.randomUUID(),body)).rejects.toThrow(/INVALID_FEEDBACK_COMMENT/)
 await expect(feed(author,'bug',bug,-1)).rejects.toThrow(/INVALID_FEEDBACK_COMMENT/)
 const cid=crypto.randomUUID();await action(author,'bug',bug,'add',cid,'valid')
 await expect(action(author,'suggestion',idea,'delete',cid)).rejects.toThrow(/FORBIDDEN/)
 for(const signature of ['public.feedback_comments(text,uuid,integer)','public.feedback_comment_action(text,uuid,text,uuid,text)'])expect((await db.query('select prosecdef from pg_proc where oid=$1::regprocedure',[signature])).rows[0].prosecdef).toBe(false)
})
it('paginates 20 at a time and cascades comments when a post is deleted',async()=>{
 for(let i=0;i<22;i++)await action(author,'bug',bug,'add',crypto.randomUUID(),`댓글 ${i}`)
 expect((await feed(author,'bug',bug)).items).toHaveLength(20)
 expect((await feed(author,'bug',bug,20)).items).toHaveLength(3)
 await user(author,'delete from public.bug_reports where id=$1',[bug])
 expect((await db.query('select * from public.feedback_comments where bug_id=$1',[bug])).rows).toHaveLength(0)
})
