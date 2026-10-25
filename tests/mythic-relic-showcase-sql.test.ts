// @vitest-environment node
import {readFileSync} from 'node:fs'
import {afterAll,beforeAll,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('shares genuine mythic relic catches, deduplicates and rejects pending, epic, foreign and anonymous access',async()=>{
 await db.exec('begin')
 try{await db.exec(readFileSync('tests/fixtures/mythic-relic-showcase-smoke.sql','utf8'))}
 finally{await db.exec('rollback;reset role')}
})
