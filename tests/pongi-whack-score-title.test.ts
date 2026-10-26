// @vitest-environment node
import {readFileSync} from 'node:fs'
import {it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
it('awards 50/60/70 score titles, backfills old records and queues completed runs only',async()=>{
 const db=await createLocalDatabase()
 try{await replayMigrations(db);await db.exec(readFileSync('tests/fixtures/pongi-whack-score-title-smoke.sql','utf8'))}
 finally{await db.close()}
},60000)
