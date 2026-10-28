// @vitest-environment node
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
import { resetIslandDocument } from '@/features/my-island/island-document'
import { placeGroups } from '@/lib/place-groups'
let db: any
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
}, 60000)
afterAll(async () => {
  await db?.close()
})
it('grants category signs once without moving an existing island, then saves a valid owned recommendation', async () => {
  const a = '00000000-0000-0000-0000-000000009861',
    b = '00000000-0000-0000-0000-000000009862'
  await db.exec('begin')
  await db.exec(
    readFileSync('supabase/migrations/20261028040222_island_aquarium_starter_catalog.sql', 'utf8')
      .replace(/\bbegin;/i, '')
      .replace(/commit;\s*$/i, ''),
  )
  const old = (await db.query("select blueprint b from public.island_starters where id='default'"))
    .rows[0].b
  await db.exec('rollback')
  await db.query('insert into auth.users(id) values($1),($2)', [a, b])
  await db.query('insert into public.player_wallets(user_id,gold) values($1,4321),($2,4321)', [
    a,
    b,
  ])
  const document = {
    ...old.document,
    layout: [],
    paving: old.document.paving.slice(0, 3),
    signLabels: {},
  }
  await db.query(
    'insert into app_private.player_islands(user_id,document,revision) values($1,$2,5)',
    [a, document],
  )
  for (const item of old.items)
    await db.query(
      'insert into app_private.player_island_items(user_id,id,item_id,sale_value) values($1,$2,$3,0)',
      [a, item.id, item.item_id],
    )
  for (const [id, quantity] of Object.entries(old.stocks))
    await db.query(
      'insert into app_private.player_island_stocks(user_id,item_id,quantity) values($1,$2,$3)',
      [a, id, quantity],
    )
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b])
  const fresh = (await db.query('select public.my_island_state() s')).rows[0].s
  expect(fresh.items).toHaveLength(12)
  const migration = readFileSync(
    'supabase/migrations/20261028044119_grant_island_zone_signs.sql',
    'utf8',
  )
  await db.exec(migration)
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a])
  const state = (await db.query('select public.my_island_state() s')).rows[0].s
  expect(state.items).toHaveLength(12)
  expect(state.document.layout).toEqual(document.layout)
  expect(state.document.paving).toEqual(document.paving)
  expect(state.document.land).toEqual(document.land)
  expect(state.stocks).toEqual(old.stocks)
  expect(state.revision).toBe(6)
  expect(Object.values(state.document.signLabels).sort()).toEqual(
    placeGroups.map((g) => g.label).sort(),
  )
  await db.exec(migration)
  expect((await db.query('select public.my_island_state() s')).rows[0].s).toEqual(state)
  await db.exec('set role authenticated')
  const recommendation = resetIslandDocument(state),
    saved = (
      await db.query('select public.save_my_island($1,$2,$3) s', [
        recommendation,
        state.revision,
        crypto.randomUUID(),
      ])
    ).rows[0].s
  expect(saved.island.document.layout).toHaveLength(50)
  expect(saved.island.items).toEqual(state.items)
  expect((await db.query('select public.get_gold_wallet() w')).rows[0].w.gold).toBe(4321)
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b])
  expect((await db.query('select public.my_island_state() s')).rows[0].s).toEqual(fresh)
})
