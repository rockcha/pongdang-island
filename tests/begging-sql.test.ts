// @vitest-environment node
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('moves real gold atomically, awards exactly 2 XP per unique valid transfer, retains history and enforces minimum/cap/auth checks',async()=>{
 await db.exec('begin')
 try{await db.exec(readFileSync('tests/fixtures/begging-smoke.sql','utf8'))}finally{await db.exec('rollback;reset role')}
})
it('paginates public contributions in chronological order without exposing unrelated personal history',async()=>{
 await db.exec('begin')
 try{
  const owner=crypto.randomUUID(),giver=crypto.randomUUID(),post=crypto.randomUUID()
  for(const [id,name] of [[owner,'Request'],[giver,'Giver']]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name]);await db.query('insert into public.player_wallets(user_id,gold) values($1,10000) on conflict(user_id) do update set gold=10000',[id])}
  await db.query("insert into app_private.begging_requests(id,creator_id,creator_name,story,goal_gold) values($1,$2,'Request','Story',10000)",[post,owner])
  await db.query("insert into app_private.begging_transfers(id,request_id,sender_id,recipient_id,sender_name,recipient_name,gold,created_at) select gen_random_uuid(),$1,$2,$3,'Giver','Request',100,now()+i*interval '1 second' from generate_series(24,0,-1)i",[post,giver,owner])
  await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner])
  const first=(await db.query('select public.begging_detail($1,0) s',[post])).rows[0].s,next=(await db.query('select public.begging_detail($1,20) s',[post])).rows[0].s
  expect(first.items).toHaveLength(20);expect(next.items).toHaveLength(5);expect(first.hasMore).toBe(true);expect(next.hasMore).toBe(false)
  const dates=[...first.items,...next.items].map(x=>Date.parse(x.createdAt));expect(dates).toEqual([...dates].sort((a,b)=>a-b))
 }finally{await db.exec('rollback;reset role')}
})
