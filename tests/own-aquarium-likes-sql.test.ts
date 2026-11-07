// @vitest-environment node
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:any
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('preserves friend daily likes, blocks self likes and strangers, and allows the owner total',async()=>{
 await db.exec('begin')
 try{
  await db.exec(readFileSync('tests/fixtures/daily-aquarium-likes-smoke.sql','utf8'))
  const owner=crypto.randomUUID(),friend=crypto.randomUUID(),outsider=crypto.randomUUID()
  await db.query('insert into auth.users(id) values($1),($2),($3)',[owner,friend,outsider])
  await db.query("insert into public.player_profiles(id,nickname) values($1,'본인검증'),($2,'친구검증'),($3,'외부검증')",[owner,friend,outsider])
  await db.query('insert into app_private.aquarium_likes(owner_id,visitor_id,like_day) values($1,$2,current_date),($1,$2,current_date-1)',[owner,friend])
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);await db.exec('set local role authenticated')
  expect((await db.query('select public.aquarium_like_state($1) s',[owner])).rows[0].s).toMatchObject({count:2,liked:false})
  await db.exec('savepoint denied')
  await expect(db.query('select public.set_aquarium_like($1,true)',[owner])).rejects.toThrow('FRIENDSHIP_REQUIRED')
  await db.exec('rollback to denied;reset role')
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[outsider]);await db.exec('set local role authenticated;savepoint stranger')
  await expect(db.query('select public.aquarium_like_state($1)',[owner])).rejects.toThrow('FRIENDSHIP_REQUIRED')
  await db.exec('rollback to stranger')
  expect((await db.query('select public.aquarium_like_state($1) s',[outsider])).rows[0].s.count).toBe(0)
 }finally{await db.exec('rollback;reset role')}
},60000)
