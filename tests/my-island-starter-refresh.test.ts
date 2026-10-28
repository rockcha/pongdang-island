// @vitest-environment node
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db: any
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
}, 60000)
afterAll(async () => {
  await db?.close()
})
it('refreshes only the old default geometry, preserves materials and grants a stored sign to customized islands once', async () => {
  // Replay this historical backfill against the starter catalog it was designed
  // for, independently of later grouped starter templates.
  await db.exec(readFileSync('supabase/migrations/20261028040222_island_aquarium_starter_catalog.sql','utf8'))
  const oldSql = readFileSync('supabase/migrations/20261028032857_island_shop_catalog.sql', 'utf8')
    .replace(/\bbegin;/i, '')
    .replace(/commit;\s*$/i, '')
  await db.exec('begin')
  await db.exec(oldSql)
  const old = (await db.query("select blueprint b from public.island_starters where id='default'"))
    .rows[0].b
  await db.exec('rollback')
  const current = (
    await db.query("select blueprint b from public.island_starters where id='default'")
  ).rows[0].b
  const users = [
    '00000000-0000-0000-0000-000000009831',
    '00000000-0000-0000-0000-000000009832',
    '00000000-0000-0000-0000-000000009833',
    '00000000-0000-0000-0000-000000009834',
    '00000000-0000-0000-0000-000000009835',
  ]
  const originals: any[] = []
  for (let n = 0; n < 5; n++) {
    const uid = users[n]
    await db.query('insert into auth.users(id) values($1)', [uid])
    await db.query('insert into public.player_wallets(user_id,gold) values($1,1234)', [uid])
    if (n === 2) {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid])
      await db.query('select public.my_island_state()')
      continue
    }
    const ids = new Map<string, string>(
      old.items.map((i: any) => [i.id, i.item_id + '~' + crypto.randomUUID()]),
    )
    const document = structuredClone(old.document)
    document.layout = document.layout.map((p: any) => ({ ...p, id: ids.get(p.id) ?? p.id }))
    if (n === 1)
      document.paving.splice(
        document.paving.findIndex((p: any) => p.type === 'grass'),
        1,
      )
    if (n === 3) {
      document.paving.splice(
        document.paving.findIndex((p: any) => p.type === 'stone'),
        1,
      )
      document.land.push({ x: 5, y: 3 })
    }
    if (n === 4) {
      const bench = document.layout.find((p: any) => p.id.startsWith('bench~'))
      bench.x = 17
      bench.y = 10
    }
    originals[n] = document
    await db.query(
      'insert into app_private.player_islands(user_id,document,revision) values($1,$2,$3)',
      [uid, document, n === 1 ? 7 : 0],
    )
    for (const item of old.items)
      await db.query(
        'insert into app_private.player_island_items(user_id,id,item_id,sale_value) values($1,$2,$3,0)',
        [uid, ids.get(item.id), item.item_id],
      )
    for (const [id, quantity] of Object.entries(old.stocks))
      await db.query(
        'insert into app_private.player_island_stocks(user_id,item_id,quantity) values($1,$2,$3)',
        [uid, id, n === 3 && id === 'land-piece' ? (quantity as number) + 1 : quantity],
      )
  }
  const sql = readFileSync(
    'supabase/migrations/20261028040223_refresh_untouched_island_starters.sql',
    'utf8',
  )
  await db.exec(sql)
  const labelsSql = readFileSync(
    'supabase/migrations/20261028041410_preserve_island_starter_sign_labels.sql',
    'utf8',
  )
  await db.exec(labelsSql)
  for (let n = 0; n < 5; n++) {
    const uid = users[n]
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid])
    const state = (await db.query('select public.my_island_state() s')).rows[0].s
    expect(state.items).toHaveLength(5)
    if (n === 0) {
      expect(state.document.paving).toEqual(expect.arrayContaining(current.document.paving))
      expect(state.document.paving).toHaveLength(current.document.paving.length)
      expect(state.document.layout.slice(0, -1)).toEqual(originals[n].layout)
      expect(state.document.layout.at(-1)).toMatchObject({ label: '아쿠아리움', x: 17, y: 10 })
      expect(state.revision).toBe(2)
      expect(state.stocks['floor-grass']).toBe(203)
    }
    if (n === 1) {
      expect(state.document).toEqual({
        ...originals[n],
        signLabels: { 'wood-arrow-sign~aquarium-welcome': '아쿠아리움' },
      })
      expect(state.revision).toBe(8)
      expect(
        state.items.some(
          (i: any) =>
            i.type === 'wood-arrow-sign' && !state.document.layout.some((p: any) => p.id === i.id),
        ),
      ).toBe(true)
    }
    if (n === 2) {
      expect(state.revision).toBe(0)
      expect(state.stocks['floor-grass']).toBe(66)
    }
    if (n !== 2)
      expect(state.document.signLabels['wood-arrow-sign~aquarium-welcome']).toBe('아쿠아리움')
    if (n === 3) {
      expect(state.document.paving.filter((p: any) => p.type !== 'grass')).toEqual(
        originals[n].paving.filter((p: any) => p.type !== 'grass'),
      )
      expect(state.document.paving.filter((p: any) => p.type === 'grass')).toHaveLength(66)
      expect(state.document.land).toEqual(originals[n].land)
      expect(state.document.layout.slice(0, -1)).toEqual(originals[n].layout)
    }
    if (n === 4) {
      expect(state.document.layout).toEqual(originals[n].layout)
      expect(state.document.paving.filter((p: any) => p.type === 'grass')).toHaveLength(66)
      expect(
        state.items.some(
          (i: any) =>
            i.type === 'wood-arrow-sign' && !state.document.layout.some((p: any) => p.id === i.id),
        ),
      ).toBe(true)
    }
    expect((await db.query('select public.get_gold_wallet() w')).rows[0].w.gold).toBe(1234)
    // Real account validation accepts both refreshed and preserved layouts.
    await db.query('set role authenticated')
    await db.query('select public.save_my_island($1,$2,$3)', [
      state.document,
      state.revision,
      crypto.randomUUID(),
    ])
    await db.query('reset role')
  }
  await db.query(
    "update app_private.player_islands set document=jsonb_set(document,array['signLabels','wood-arrow-sign~aquarium-welcome'],to_jsonb('내어항'::text)),revision=revision+1 where user_id=$1",
    [users[1]],
  )
  const before = await db.query(
    'select user_id,document,revision from app_private.player_islands order by user_id',
  )
  await db.exec(sql)
  await db.exec(labelsSql)
  expect(
    (
      await db.query(
        'select user_id,document,revision from app_private.player_islands order by user_id',
      )
    ).rows,
  ).toEqual(before.rows)
  expect((await db.query('select count(*) n from app_private.player_island_items')).rows[0].n).toBe(
    25,
  )
})
