// @vitest-environment node
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('keeps timestamp summaries behind feed RLS and excludes own posts',async()=>{
 await db.exec('begin')
 try {await db.exec(readFileSync('tests/fixtures/background-content-smoke.sql','utf8'))}
 finally {await db.exec('rollback;reset role')}
})
it('bounds the title worker batch and preserves pending players for another run',async()=>{
 await db.exec('begin')
 try {
  await db.exec(`create or replace function app_private.sync_player_titles(p_user uuid) returns jsonb language sql as $$select '{}'::jsonb$$;
   delete from app_private.title_dirty;
   insert into auth.users(id) select gen_random_uuid() from generate_series(1,15);
   insert into app_private.title_dirty select id from auth.users on conflict do nothing;`)
  const before=(await db.query('select count(*)::int n from app_private.title_dirty')).rows[0].n
  const count=(await db.query('select app_private.process_title_queue() n')).rows[0].n
  expect(count).toBeGreaterThan(0);expect(count).toBeLessThanOrEqual(10)
  expect((await db.query('select count(*)::int n from app_private.title_dirty')).rows[0].n).toBe(before-count)
  const next=(await db.query('select app_private.process_title_queue() n')).rows[0].n
  expect(next).toBeGreaterThan(0)
 } finally {await db.exec('rollback;reset role')}
})
