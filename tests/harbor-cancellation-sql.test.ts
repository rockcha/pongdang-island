// @vitest-environment node
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('refunds only early cancellation, preserves boats, archives trips and rejects stale/foreign/returned requests',async()=>{
 await db.exec('begin')
 try{await db.exec(readFileSync('tests/fixtures/harbor-cancellation-smoke.sql','utf8'))}
 finally{await db.exec('rollback;reset role')}
})
it('does not expose cancellation audit or table writes to player roles',async()=>{
 const r=(await db.query("select has_table_privilege('authenticated','app_private.cancelled_harbor_voyages','SELECT') as read,has_table_privilege('authenticated','app_private.cancelled_harbor_voyages','INSERT') as write,relrowsecurity as rls from pg_class where oid='app_private.cancelled_harbor_voyages'::regclass")).rows[0]
 expect(r).toEqual({read:false,write:false,rls:true})
})
