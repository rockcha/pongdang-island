// @vitest-environment node
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('conserves escrow, pays equal first-come slots once, closes the last slot and safely retries or refunds',async()=>{
 await db.exec('begin')
 try {await db.exec(readFileSync('tests/fixtures/sponsorship-smoke.sql','utf8'))}
 finally {await db.exec('rollback;reset role')}
})
it('bounds feed payloads and keeps closed retries separate from new sponsorships',async()=>{
 await db.exec('begin')
 try {
  const user=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[user]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[user,'후원검증'])
  await db.query("insert into app_private.sponsorships(id,creator_id,creator_name,gold_each,slots,status,closed_at) select gen_random_uuid(),$1,'후원검증',1,1,'cancelled',now() from generate_series(1,12)",[user])
  await db.exec('set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user])
  const first=(await db.query("select public.sponsorship_state('mine',0) s")).rows[0].s
  const next=(await db.query("select public.sponsorship_state('mine',10) s")).rows[0].s
  expect(first.items).toHaveLength(10);expect(first.hasMore).toBe(true);expect(next.items).toHaveLength(2);expect(next.hasMore).toBe(false)
  expect(new Set([...first.items,...next.items].map(x=>x.id)).size).toBe(12)
 } finally {await db.exec('rollback;reset role')}
})
