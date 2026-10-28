// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const a='00000000-0000-0000-0000-000000077001',b='00000000-0000-0000-0000-000000077002',c='00000000-0000-0000-0000-000000077003'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
async function reject(sql:string,args:unknown[],message:string){await db.exec('savepoint bad');await expect(db.query(sql,args)).rejects.toThrow(message);await db.exec('rollback to bad;release bad')}
it('requires friendship and three ordered steps, permits unlimited repeats and deduplicates notifications',async()=>{
 await db.exec('begin')
 try{
  for(const id of [a,b,c]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query("insert into public.player_profiles(id,nickname) values($1,'테스트') on conflict do nothing",[id])}
  await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[a,b])
  const tank=(await db.query('insert into public.aquarium_tanks(user_id) values($1) returning id',[b])).rows[0].id
  await db.query("insert into public.player_collectibles(user_id,species_id,tank_id) values($1,'soft-sea-cucumber',null)",[b])
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);await db.exec('set local role authenticated')
  const visit=(await db.query('select public.friend_aquarium($1) r',[b])).rows[0].r
  expect(visit.owner.id).toBe(b);expect(visit.tanks).toHaveLength(1);expect(visit.inhabitants).toEqual([])
  const stranger=(await db.query('select public.friend_aquarium($1) r',[c])).rows[0].r
  expect(stranger.owner.id).toBe(c);expect(stranger.isFriend).toBe(false)
  expect(visit.isFriend).toBe(true)
  const op=crypto.randomUUID()
  const feed=async(step:number,operation=op)=>(await db.query('select public.feed_friend_aquarium($1,$2,$3) r',[tank,operation,step])).rows[0].r
  await reject('select public.feed_friend_aquarium($1,$2,3)',[tank,op],'FEEDING_STEP_REQUIRED')
  expect(await feed(1)).toMatchObject({clicks:1,completed:false})
  await reject('select public.feed_friend_aquarium($1,$2,3)',[tank,op],'FEEDING_STEP_REQUIRED')
  expect(await feed(2)).toMatchObject({clicks:2,completed:false})
  await db.exec('reset role');expect((await db.query('select * from public.notifications where recipient_id=$1 and actor_id=$2',[b,a])).rows).toHaveLength(0);await db.exec('set local role authenticated')
  expect(await feed(3)).toMatchObject({clicks:3,completed:true,replayed:false})
  expect(await feed(3)).toMatchObject({clicks:3,completed:true,replayed:true})
  const next=crypto.randomUUID();await feed(1,next);await feed(2,next);await feed(3,next)
  expect((await db.query('select * from public.aquarium_feedings')).rows).toHaveLength(2)
  await reject('update public.aquarium_feedings set clicks=3',[],'permission denied')
  await db.exec('reset role')
  expect((await db.query('select category,kind from public.notifications where recipient_id=$1 and actor_id=$2',[b,a])).rows).toEqual([{category:'general',kind:'system'}])
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[c]);await db.exec('set local role authenticated')
  expect((await db.query('select * from public.aquarium_feedings')).rows).toEqual([])
  await reject('select public.feed_friend_aquarium($1,$2,1)',[tank,crypto.randomUUID()],'FRIENDSHIP_REQUIRED')
  await db.exec('reset role');await db.query("update public.friend_requests set status='removed' where sender_id=$1",[a])
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[a]);await db.exec('set local role authenticated')
  const former=(await db.query('select public.friend_aquarium($1) r',[b])).rows[0].r
  expect(former.isFriend).toBe(false);expect(former.tanks).toHaveLength(1)
  expect(former.inhabitants).toEqual([])
 }finally{await db.exec('rollback;reset role')}
})
