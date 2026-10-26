// @vitest-environment node
import {readFileSync} from 'node:fs'
import {it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
it('snapshots all golden relic tiers, isolates ownership and pays the full verified score once',async()=>{
 const db=await createLocalDatabase()
 try{await replayMigrations(db);await db.exec(readFileSync('tests/fixtures/pongi-whack-golden-relic-smoke.sql','utf8'))}
 finally{await db.close()}
},60000)
