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
it('rearranges only the unchanged previous default and corrects only free default captions in custom islands', async () => {
  await db.exec(
    readFileSync('supabase/migrations/20261028044115_grouped_island_starter_catalog.sql', 'utf8'),
  )
  const users = [
      '00000000-0000-0000-0000-000000009881',
      '00000000-0000-0000-0000-000000009882',
      '00000000-0000-0000-0000-000000009883',
    ],
    before: any[] = []
  for (const uid of users) {
    await db.query('insert into auth.users(id) values($1)', [uid])
    await db.query('insert into public.player_wallets(user_id,gold) values($1,4321)', [uid])
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid])
    before.push((await db.query('select public.my_island_state() s')).rows[0].s)
  }
  const custom = structuredClone(before[1].document),
    sea = custom.layout.find((p: any) => p.label === '낚시')
  custom.layout = custom.layout.filter((p: any) => p.id !== sea.id)
  custom.signLabels[sea.id] = '낚시'
  custom.layout.push({ id: 'island-name-sign~paid-caption', x: 6, y: 3, label: '교류' })
  await db.query(
    "insert into app_private.player_island_items(user_id,id,item_id,sale_value) values($1,'island-name-sign~paid-caption','island-name-sign',84)",
    [users[1]],
  )
  await db.query('update app_private.player_islands set document=$2,revision=3 where user_id=$1', [
    users[1],
    custom,
  ])
  const edited = structuredClone(before[2].document),
    plaza = edited.layout.find((p: any) => p.label === '교류')
  plaza.label = '마을'
  edited.signLabels[plaza.id] = '마을'
  await db.query('update app_private.player_islands set document=$2,revision=4 where user_id=$1', [
    users[2],
    edited,
  ])
  await db.exec(
    readFileSync(
      'supabase/migrations/20261028045939_align_island_starter_header_categories.sql',
      'utf8',
    ),
  )
  const migration = readFileSync(
    'supabase/migrations/20261028045942_align_existing_default_island_categories.sql',
    'utf8',
  )
  await db.exec(migration)
  for (let n = 0; n < 3; n++) {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [users[n]])
    const state = (await db.query('select public.my_island_state() s')).rows[0].s
    expect(state.stocks).toEqual(before[n].stocks)
    expect((await db.query('select public.get_gold_wallet() w')).rows[0].w.gold).toBe(4321)
    if (n === 0) {
      expect(state.items).toEqual(before[n].items)
      expect(state.document.layout.find((p: any) => p.id === 'aquarium-1~owned:hub')).toMatchObject(
        { x: 8, y: 7 },
      )
      expect(state.document.layout.some((p: any) => p.label === '광장')).toBe(true)
      expect(state.document.layout.some((p: any) => p.label === '교류' || p.label === '낚시')).toBe(
        false,
      )
      expect(state.revision).toBe(1)
    }
    if (n === 1) {
      expect(state.document.layout.map(({ label, ...p }: any) => p)).toEqual(
        custom.layout.map(({ label, ...p }: any) => p),
      )
      expect(state.document.paving).toEqual(custom.paving)
      expect(
        state.document.layout.find((p: any) => p.id === 'island-name-sign~paid-caption').label,
      ).toBe('교류')
      expect(state.document.layout.some((p: any) => p.label === '광장')).toBe(true)
      expect(state.document.signLabels[sea.id]).toBe('바다')
    }
    if (n === 2) {
      expect(state.document.layout.map(({ label, ...p }: any) => p)).toEqual(
        edited.layout.map(({ label, ...p }: any) => p),
      )
      expect(state.document.signLabels[plaza.id]).toBe('마을')
      expect(state.document.layout.find((p: any) => p.id === plaza.id).label).toBe('마을')
    }
    await db.exec('set role authenticated')
    await db.query('select public.save_my_island($1,$2,$3)', [
      state.document,
      state.revision,
      crypto.randomUUID(),
    ])
    await db.exec('reset role')
  }
  const checkpoint = (
    await db.query(
      'select user_id,document,revision from app_private.player_islands order by user_id',
    )
  ).rows
  await db.exec(migration)
  expect(
    (
      await db.query(
        'select user_id,document,revision from app_private.player_islands order by user_id',
      )
    ).rows,
  ).toEqual(checkpoint)
})
