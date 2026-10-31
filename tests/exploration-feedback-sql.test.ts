// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:any
const [author,other,operator]=[701,702,703].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`)
async function user(uid:string|null,sql:string,args:unknown[]=[]){await db.exec(uid?'set role authenticated':'set role anon');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,args)}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}}
const action=async(uid:string|null,act:string,id:string,body:string|null=null)=>(await user(uid,'select public.exploration_feedback_action($1,$2,$3) r',[act,id,body])).rows[0].r
const feed=async(uid:string|null,offset=0)=>(await user(uid,'select public.exploration_feedback($1) r',[offset])).rows[0].r
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const id of [author,other,operator]){await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,{game_nickname:id.slice(-3)}]);await user(id,'select public.sync_player_profile()')}
 await db.query('insert into app_private.notice_operators(user_id) values($1)',[operator])
},60000)
afterAll(async()=>{await db?.close()})
it('shows public comments across users, deduplicates retries, and permits only the author to edit',async()=>{
 const id=crypto.randomUUID();expect(await action(author,'add',id,' 좋은 탐험 ')).toBe(id)
 await action(author,'add',id,'좋은 탐험')
 const page=await feed(other);expect(page.items).toHaveLength(1)
 expect(page.items[0]).toMatchObject({authorId:author,body:'좋은 탐험',canEdit:false,canDelete:false})
 expect(page.items[0].createdAt).toBe(page.items[0].updatedAt)
 await expect(action(other,'edit',id,'다른 유저 수정')).rejects.toThrow(/FEEDBACK_FORBIDDEN/)
 await expect(action(operator,'edit',id,'운영자 수정')).rejects.toThrow(/FEEDBACK_FORBIDDEN/)
 await expect(action(author,'add',id,'다른 요청')).rejects.toThrow(/OPERATION_CONFLICT/)
 await action(author,'edit',id,'수정한 피드백');await action(author,'edit',id,'수정한 피드백')
 expect((await feed(author)).items[0]).toMatchObject({body:'수정한 피드백',canEdit:true,canDelete:true})
})
it('allows author/operator deletion, denies strangers, and never restores a deleted comment on retry',async()=>{
 const id=(await feed(author)).items[0].id
 await expect(action(other,'delete',id)).rejects.toThrow(/FEEDBACK_FORBIDDEN/)
 expect((await feed(operator)).items[0].canDelete).toBe(true)
 await action(operator,'delete',id);await action(operator,'delete',id)
 expect((await feed(other)).items).toHaveLength(0)
 await action(author,'add',id,'수정한 피드백')
 expect((await feed(author)).items).toHaveLength(0)
 await expect(action(author,'edit',id,'복구 시도')).rejects.toThrow(/FEEDBACK_NOT_FOUND/)
})
it('enforces authenticated access, body limits, rate limits, and direct-table isolation',async()=>{
 await expect(feed(null)).rejects.toThrow(/permission denied/)
 await expect(action(null,'add',crypto.randomUUID(),'익명')).rejects.toThrow(/permission denied/)
 await expect(action(other,'add',crypto.randomUUID(),'  ')).rejects.toThrow(/INVALID_FEEDBACK_BODY/)
 await expect(action(other,'add',crypto.randomUUID(),'\n\t\r')).rejects.toThrow(/INVALID_FEEDBACK_BODY/)
 await expect(action(other,'add',crypto.randomUUID(),'가'.repeat(501))).rejects.toThrow(/INVALID_FEEDBACK_BODY/)
 const id=crypto.randomUUID();await action(other,'add',id,'첫 번째 댓글')
 await expect(action(other,'add',crypto.randomUUID(),'빠른 두 번째 댓글')).rejects.toThrow(/FEEDBACK_RATE_LIMIT/)
 await action(other,'add',id,'첫 번째 댓글')
 await expect(user(author,'select * from app_private.exploration_feedback')).rejects.toThrow(/permission denied/)
 await expect(user(author,"insert into app_private.exploration_feedback(id,user_id,body) values(gen_random_uuid(),$1,'변조')",[other])).rejects.toThrow(/permission denied/)
 expect((await db.query("select relrowsecurity from pg_class where oid='app_private.exploration_feedback'::regclass")).rows[0].relrowsecurity).toBe(true)
 await expect(feed(author,-1)).rejects.toThrow(/INVALID_FEEDBACK_PAGE/)
})
it('paginates newest-first without duplicates when timestamps tie and removes comments with deleted accounts',async()=>{
 await db.exec('delete from app_private.exploration_feedback')
 const ids=Array.from({length:25},(_,index)=>`10000000-0000-0000-0000-${String(index+1).padStart(12,'0')}`)
 for(const id of ids)await db.query("insert into app_private.exploration_feedback(id,user_id,body,created_at,updated_at) values($1,$2,'테스트 댓글','2026-10-31T00:00:00Z','2026-10-31T00:00:00Z')",[id,other])
 const first=await feed(author),second=await feed(author,20)
 expect(first.items).toHaveLength(20);expect(first.hasMore).toBe(true);expect(second.items).toHaveLength(5);expect(second.hasMore).toBe(false)
 expect([...first.items,...second.items].map(row=>row.id)).toEqual([...ids].reverse())
 await db.query('delete from auth.users where id=$1',[other])
 expect((await feed(author)).items).toHaveLength(0)
})
