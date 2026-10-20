// @vitest-environment node
import { beforeAll, afterAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'

let db
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
}, 60000)
afterAll(async () => { await db?.close() })

it('prices the two everyday baits and preserves their distinct success chances', async () => {
  const { rows } = await db.query("select id,price,app_private.fishing_success_chance_bp(id) chance from public.fishing_baits where id in ('bait','bait_safe') order by id")
  expect(rows).toEqual([{ id: 'bait', price: 30, chance: 3500 }, { id: 'bait_safe', price: 100, chance: 10000 }])
})

it('resolves every roll using the rebalanced ordinary bait probabilities', async () => {
  const { rows } = await db.query("select b.id,app_private.resolve_regional_fishing(b.id,'cloudferry',r) rarity,count(*)::integer n from public.fishing_baits b cross join generate_series(0,9999) r where b.id in ('bait','bait_safe','bait_grubby_magnet','bait_sea_memory','bait_first_greeting') group by b.id,rarity order by b.id,rarity")
  for (const id of new Set(rows.map(row => row.id))) {
    expect(rows.filter(row => row.id === id).map(({ rarity, n }) => ({ rarity, n }))).toEqual([
      { rarity: 'common', n: 8320 }, { rarity: 'rare', n: 1500 },
      { rarity: 'epic', n: 150 }, { rarity: 'mythic', n: 30 },
    ])
  }
})
