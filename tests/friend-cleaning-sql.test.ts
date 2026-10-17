// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const a='00000000-0000-0000-0000-000000078001',b='00000000-0000-0000-0000-000000078002',c='00000000-0000-0000-0000-000000078003'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
async function reject(sql:string,args:unknown[],message:string){await db.exec('savepoint bad');await expect(db.query(sql,args)).rejects.toThrow(message);await db.exec('rollback to bad;release bad')}
it('records only the third ordered cleaning stroke as complete and notifies once across unlimited sessions',async()=>{
 await db.exec('begin')
 try{
  for(const id of [a,b,c]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query("insert into public.player_profiles(id,nickname) values($1,'테스트') on conflict do nothing",[id])}
  await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[a,b])
  const tank=(await db.query('insert into public.aquarium_tanks(user_id) values($1) returning id',[b])).rows[0].id
  const tank2=(await db.query('insert into public.aquarium_tanks(user_id) values($1) returning id',[b])).rows[0].id
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);await db.exec('set local role authenticated')
  const op=crypto.randomUUID()
  const clean=async(step:number,operation=op,target=tank)=>(await db.query('select public.clean_friend_aquarium($1,$2,$3) r',[target,operation,step])).rows[0].r
  await reject('select public.clean_friend_aquarium($1,$2,3)',[tank,op],'CLEANING_STEP_REQUIRED')
  expect(await clean(1)).toMatchObject({strokes:1,completed:false})
  await reject('select public.clean_friend_aquarium($1,$2,3)',[tank,op],'CLEANING_STEP_REQUIRED')
  await reject('select public.clean_friend_aquarium($1,$2,2)',[tank2,op],'OPERATION_CONFLICT')
  expect(await clean(2)).toMatchObject({strokes:2,completed:false})
  await db.exec('reset role');expect((await db.query('select * from public.notifications where recipient_id=$1',[b])).rows).toHaveLength(0);await db.exec('set local role authenticated')
  expect(await clean(3)).toMatchObject({strokes:3,completed:true,replayed:false})
  expect(await clean(3)).toMatchObject({strokes:3,completed:true,replayed:true})
  const next=crypto.randomUUID();await clean(1,next,tank2);await clean(2,next,tank2);await clean(3,next,tank2)
  expect((await db.query('select * from public.aquarium_cleanings')).rows).toHaveLength(2)
  await reject('update public.aquarium_cleanings set strokes=3',[],'permission denied')
  await db.exec('reset role')
  expect((await db.query('select category,kind,title from public.notifications where recipient_id=$1',[b])).rows).toEqual([{category:'general',kind:'system',title:'친구가 어항을 닦아줬어요'}])
  expect((await db.query('select * from public.aquarium_feedings')).rows).toHaveLength(0)
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[c]);await db.exec('set local role authenticated')
  expect((await db.query('select * from public.aquarium_cleanings')).rows).toEqual([])
  await reject('select public.clean_friend_aquarium($1,$2,1)',[tank,crypto.randomUUID()],'FRIENDSHIP_REQUIRED')
  await db.exec('reset role');await db.query("update public.friend_requests set status='removed' where sender_id=$1",[a])
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);await db.exec('set local role authenticated')
  await reject('select public.clean_friend_aquarium($1,$2,1)',[tank,crypto.randomUUID()],'FRIENDSHIP_REQUIRED')
 }finally{await db.exec('rollback;reset role')}
})
