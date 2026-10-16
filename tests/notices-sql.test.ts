// @vitest-environment node
import {beforeAll,afterAll,beforeEach,afterEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const admin='00000000-0000-0000-0000-000000000301',reader='00000000-0000-0000-0000-000000000302'
async function user(id:string,sql:string,args:unknown[]=[]){await db.exec('savepoint request;set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return (await db.query(sql,args)).rows}catch(e){await db.exec('rollback to savepoint request');throw e}finally{await db.exec('reset role;release savepoint request')}}
async function save(id:string,status='draft',revision=0,images:string[]=[],who=admin){return (await user(who,'select public.notice_save($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as value',[id,'update','New update','Safe text **bold**',images,status,true,null,null,revision]))[0].value}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
beforeEach(async()=>{await db.exec('begin');for(const id of [admin,reader])await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into app_private.notice_operators(user_id) values($1)',[admin])})
afterEach(async()=>{await db.exec('rollback')})
it('only allows explicit operators, ignoring self-editable metadata',async()=>{
 await db.query(`update auth.users set raw_user_meta_data='{"admin":true,"role":"admin"}' where id=$1`,[reader])
 expect((await user(reader,'select public.notice_is_operator() as value'))[0].value).toBe(false)
 await expect(save(crypto.randomUUID(),'published',0,[],reader)).rejects.toThrow('NOTICE_FORBIDDEN')
 await expect(user(reader,'insert into app_private.notice_operators values($1)',[reader])).rejects.toThrow('permission denied')
 await expect(user(admin,"update public.notices set status='published'")).rejects.toThrow('permission denied')
})
it('hides drafts and hidden documents from both direct reads and detail queries',async()=>{
 const id=crypto.randomUUID();await save(id)
 expect(await user(reader,'select * from public.notices')).toHaveLength(0)
 expect(await user(admin,'select * from public.notices')).toHaveLength(1)
 const published=await save(id,'published',1)
 expect(published.published_at).toBeTruthy();expect(await user(reader,'select * from public.notices')).toHaveLength(1)
 await save(id,'hidden',2)
 expect(await user(reader,'select * from public.notices where id=$1',[id])).toHaveLength(0)
})
it('rejects stale revisions so a second editor cannot overwrite newer work',async()=>{
 const id=crypto.randomUUID();await save(id);await save(id,'published',1)
 await expect(save(id,'draft',1)).rejects.toThrow('NOTICE_CHANGED')
 expect((await user(admin,'select revision,status from public.notices where id=$1',[id]))[0]).toMatchObject({revision:2,status:'published'})
})
it('protects private images until publishing and again after hiding',async()=>{
 const id=crypto.randomUUID(),path=`${id}/${crypto.randomUUID()}.png`
 await expect(user(reader,"insert into storage.objects(bucket_id,name,metadata) values('notice-images',$1,'{\"mimetype\":\"image/png\"}')",[path])).rejects.toThrow()
 await user(admin,"insert into storage.objects(bucket_id,name,metadata) values('notice-images',$1,'{\"mimetype\":\"image/png\"}')",[path])
 await save(id,'draft',0,[path])
 expect(await user(reader,"select * from storage.objects where bucket_id='notice-images'")).toHaveLength(0)
 await save(id,'published',1,[path])
 expect(await user(reader,"select * from storage.objects where bucket_id='notice-images'")).toHaveLength(1)
 expect(await user(admin,'delete from storage.objects where name=$1 returning id',[path])).toHaveLength(0)
 await save(id,'hidden',2,[path])
 expect(await user(reader,"select * from storage.objects where bucket_id='notice-images'")).toHaveLength(0)
})
it('rejects missing images, another document image and invalid fields',async()=>{
 const id=crypto.randomUUID(),path=`${crypto.randomUUID()}/${crypto.randomUUID()}.png`
 await expect(save(id,'published',0,[path])).rejects.toThrow('NOTICE_IMAGE_INVALID')
 await expect(user(admin,'select public.notice_save($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,'guide','Hi','',[],'published',false,null,null,0])).rejects.toThrow('NOTICE_EMPTY')
 await expect(user(admin,'select public.notice_save($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,'event','Hi','Body',[],'published',false,'2026-10-20','2026-10-19',0])).rejects.toThrow('INVALID_NOTICE')
 expect((await db.query("select public from storage.buckets where id='notice-images'")).rows[0].public).toBe(false)
})
