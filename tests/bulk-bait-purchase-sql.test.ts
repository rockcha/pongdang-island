// @vitest-environment node
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('atomically buys one complete quantity, validates discounts and rejects partial, stale, conflicting and anonymous purchases',async()=>{
 await db.exec('begin')
 try{await db.exec(readFileSync('tests/fixtures/bulk-bait-purchase-smoke.sql','utf8'))}
 finally{await db.exec('rollback;reset role')}
})
