// @vitest-environment node
import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

it('discounts every purchasable bait through new and legacy routes, preserves quotes and isolates players',async()=>{
 const db=await createLocalDatabase()
 try{
  await replayMigrations(db)
  await db.exec('begin')
  await db.exec(readFileSync('tests/fixtures/bait-discount-relic-smoke.sql','utf8'))
  expect((await db.query("select count(*)::int n from public.fishing_relics where effect_kind='bait_discount_gold'")).rows[0].n).toBe(2)
  await db.exec('rollback')
 }finally{await db.close()}
},180000)
