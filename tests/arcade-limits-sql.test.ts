// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
}, 60000)
afterAll(async () => {
  await db?.close()
})
it('removes the 100-point cap, exhausts unique catalog targets, ranks >100 and preserves 30-gold idempotency through 20 wins', async () => {
  await db.exec('begin')
  try {
    await db.exec(readFileSync('tests/fixtures/arcade-limits-smoke.sql', 'utf8'))
  } finally {
    await db.exec('rollback')
  }
}, 30000)
it('keeps new pool snapshots private and rejects anonymous game calls', async () => {
  await db.exec('set role authenticated')
  try {
    await db.query("select set_config('request.jwt.claim.sub','',false)")
    await expect(db.query("select public.shadow_game('start',gen_random_uuid())")).rejects.toThrow(
      'AUTH_REQUIRED',
    )
    await expect(
      db.query("select public.odd_even_game('start',gen_random_uuid())"),
    ).rejects.toThrow('AUTH_REQUIRED')
    await expect(db.query('select app_private.shadow_question_pool()')).rejects.toThrow(
      'permission denied',
    )
    await expect(db.query('select * from app_private.shadow_game_rounds')).rejects.toThrow(
      'permission denied',
    )
  } finally {
    await db.exec('reset role')
  }
})
