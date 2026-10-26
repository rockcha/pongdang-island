// @vitest-environment node
import {readFileSync} from 'node:fs'
import {it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
it('snapshots all golden relic tiers, isolates ownership and pays the full verified score once',async()=>{
 const db=await createLocalDatabase()
 try{await replayMigrations(db);
 const status=await db.query("select count(*)::int total,count(*) filter(where enabled)::int enabled from public.fishing_relics where effect_kind='pongi_whack_golden_count'")
 expect(status.rows[0]).toEqual({total:3,enabled:0})
 // Exercise the effect implementation in a rolled-back fixture without re-enabling the operational catalog.
 await db.exec(readFileSync('tests/fixtures/pongi-whack-golden-relic-smoke.sql','utf8').replace('begin;',"begin; update public.fishing_relics set enabled=true where effect_kind='pongi_whack_golden_count';"))}
 finally{await db.close()}
},60000)
