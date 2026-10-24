// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
import { readFileSync, readdirSync } from 'node:fs'
let db
const [owner, other] = [crypto.randomUUID(), crypto.randomUUID()]
async function user(sql, args = []) {
  await db.exec('set role authenticated')
  const r = await db.query(sql, args)
  await db.exec('reset role')
  return r
}
async function state() {
  return (await user('select public.personal_bait_workshop_state() s')).rows[0].s
}
async function action(kind, extras = {}, op = crypto.randomUUID()) {
  return (
    await user('select public.personal_bait_workshop_action($1,$2,$3,$4,$5,$6,$7) s', [
      kind,
      op,
      extras.bait ?? null,
      extras.quantity ?? null,
      extras.minutes ?? null,
      extras.job ?? null,
      extras.cost ?? null,
    ])
  ).rows[0].s
}
const start = (extras = {}, op = crypto.randomUUID()) =>
  action('start', { bait: 'bait', quantity: 10, minutes: 30, cost: 8, ...extras }, op)
async function rejected(fn, message) {
  await db.exec('savepoint rejected')
  await expect(fn()).rejects.toThrow(message)
  await db.exec('rollback to rejected;reset role')
}
async function complete() {
  await db.exec(
    "update app_private.personal_bait_jobs set started_at=transaction_timestamp()-interval '30 days',completes_at=transaction_timestamp()-interval '30 days'+make_interval(mins=>production_minutes)",
  )
}
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
  for (const [i, id] of [owner, other].entries()) {
    await db.query('insert into auth.users(id) values($1)', [id])
    await db.query('insert into public.player_profiles(id,nickname) values($1,$2)', [
      id,
      'Workshop' + i,
    ])
    await db.query(
      'insert into public.player_wallets(user_id,gold,inventory) values($1,12345,\'{"fuel":10000,"bait":7}\') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory',
      [id],
    )
  }
}, 60000)
beforeEach(async () => {
  await db.exec('begin')
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [owner])
})
afterEach(async () => {
  await db.exec('rollback;reset role')
})
afterAll(async () => {
  await db?.close()
})
it('preserves old production snapshots and replay receipts across the balance migration', async () => {
  const legacy = readFileSync(
    'supabase/migrations/20261024214355_personal_bait_workshop.sql',
    'utf8',
  )
    .match(/create function app_private\.personal_bait_workshop_action\([\s\S]*?end \$\$;/i)![0]
    .replace('create function', 'create or replace function')
  await db.exec(legacy)
  const op = crypto.randomUUID(),
    before = await start({ cost: 10 }, op)
  const migration = readdirSync('supabase/migrations').find((name) =>
    name.endsWith('_buff_personal_bait_fuel.sql'),
  )!
  await db.exec(readFileSync('supabase/migrations/' + migration, 'utf8'))
  expect((await state()).job).toEqual(before.job)
  expect((await start({ cost: 10 }, op)).replayed).toBe(true)
  expect((await state()).fuel).toBe(9990)
  await complete()
  await action('claim', { job: before.job.id })
  expect((await start()).job.fuelCost).toBe(8)
  expect((await state()).fuel).toBe(9982)
})
it('quotes all purchasable baits and charges the exact rounded curve at every half-hour', async () => {
  const s = await state()
  expect(s).toMatchObject({ fuel: 10000, job: null, limits: { maxQuantity: 100, maxMinutes: 720 } })
  expect(s.baits.find((b) => b.id === 'bait')).toMatchObject({ owned: 7, unitValue: 50 })
  const purchasable = (
    await db.query('select count(*)::int n from public.fishing_baits where price>0')
  ).rows[0].n
  expect(s.baits).toHaveLength(purchasable)
  for (const minutes of Array.from({ length: 24 }, (_, i) => (i + 1) * 30)) {
    const cost = Math.ceil((100 * 50 * 0.8) / (50 + (20 * (minutes - 30)) / 690))
    await db.exec('savepoint quote')
    const result = await start({ quantity: 100, minutes, cost })
    expect(result.fuel).toBe(10000 - cost)
    expect(result.job).toMatchObject({ minutes, quantity: 100, fuelCost: cost, unitValue: 50 })
    await db.exec('rollback to quote')
  }
  expect((await start({ quantity: 100, minutes: 720, cost: 58 })).fuel).toBe(9942)
})
it('uses current shop value for premium bait and preserves production snapshots after catalog edits', async () => {
  const bait = (await state()).baits.find((b) => b.unitValue === 361)
  expect(bait).toBeTruthy()
  const s = await start({ bait: bait.id, quantity: 100, minutes: 720, cost: 413 })
  await db.query('update public.fishing_baits set price=1,name=$2 where id=$1', [
    bait.id,
    'Changed',
  ])
  expect((await state()).job).toEqual(s.job)
  await complete()
  const received = await action('claim', { job: s.job.id })
  expect(received.baits.find((b) => b.id === bait.id).owned).toBe(bait.owned + 100)
})
it('replays debit and claim exactly once, even after a later job starts', async () => {
  const op = crypto.randomUUID(),
    claim = crypto.randomUUID(),
    s = await start({}, op)
  expect((await start({}, op)).replayed).toBe(true)
  expect((await state()).fuel).toBe(9992)
  await rejected(() => start({ quantity: 11, cost: 11 }, op), 'OPERATION_CONFLICT')
  await rejected(() => start(), 'PERSONAL_PRODUCTION_BUSY')
  await rejected(() => action('claim', { job: s.job.id }), 'PRODUCTION_NOT_READY')
  await complete()
  const received = await action('claim', { job: s.job.id }, claim)
  expect(received.job).toBeNull()
  expect(received.baits.find((b) => b.id === 'bait').owned).toBe(17)
  expect((await action('claim', { job: s.job.id }, claim)).replayed).toBe(true)
  await rejected(() => action('claim', { job: s.job.id }), 'WORKSHOP_JOB_NOT_FOUND')
  const next = await start()
  expect((await start({}, op)).job.id).toBe(next.job.id)
  expect((await state()).fuel).toBe(9984)
})
it('rejects invalid inputs, stale quotes, gift-only bait and insufficient fuel atomically', async () => {
  for (const quantity of [0, 101, null])
    await rejected(() => start({ quantity }), 'INVALID_WORKSHOP_QUANTITY')
  for (const minutes of [0, 31, 750, null])
    await rejected(() => start({ minutes }), 'INVALID_WORKSHOP_TIME')
  await rejected(() => start({ cost: 1 }), 'FUEL_QUOTE_CHANGED')
  await rejected(() => start({ cost: 10 }), 'FUEL_QUOTE_CHANGED')
  await rejected(() => start({ bait: 'not-a-bait' }), 'BAIT_NOT_AVAILABLE')
  const gift = (await db.query('select id from public.fishing_baits where price is null limit 1'))
    .rows[0]
  if (gift) await rejected(() => start({ bait: gift.id }), 'BAIT_NOT_AVAILABLE')
  await db.query(
    "update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}','7') where user_id=$1",
    [owner],
  )
  await rejected(() => start(), 'INSUFFICIENT_FUEL')
  expect((await state()).fuel).toBe(7)
  expect((await state()).job).toBeNull()
  expect(
    (await db.query('select count(*)::int n from app_private.personal_bait_operations')).rows[0].n,
  ).toBe(0)
})
it('retains completed output indefinitely and preserves unrelated wallet fields', async () => {
  const s = await start()
  await complete()
  await rejected(() => start(), 'PERSONAL_PRODUCTION_BUSY')
  await db.query(
    'update public.player_wallets set inventory=inventory||\'{"fuel":6,"other":55}\'::jsonb where user_id=$1',
    [owner],
  )
  await action('claim', { job: s.job.id })
  const w = (
    await db.query('select gold,inventory from public.player_wallets where user_id=$1', [owner])
  ).rows[0]
  expect(w).toMatchObject({ gold: 12345, inventory: { fuel: 6, other: 55, bait: 17 } })
})
it('isolates users and denies anonymous access and direct table writes', async () => {
  const s = await start()
  await complete()
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [other])
  expect((await state()).job).toBeNull()
  await rejected(() => action('claim', { job: s.job.id }), 'WORKSHOP_JOB_NOT_FOUND')
  await rejected(() => user('select * from app_private.personal_bait_jobs'), 'permission denied')
  await rejected(
    () => user('delete from app_private.personal_bait_operations'),
    'permission denied',
  )
  await db.exec('savepoint anonymous;set role anon')
  await expect(db.query('select public.personal_bait_workshop_state()')).rejects.toThrow(
    /permission denied/,
  )
  await db.exec('rollback to anonymous;reset role')
})
it('does not lose output or record a receipt if the inventory cap prevents claiming', async () => {
  const s = await start()
  await complete()
  await db.query(
    "update public.player_wallets set inventory=jsonb_set(inventory,'{bait}','1000000000') where user_id=$1",
    [owner],
  )
  await rejected(() => action('claim', { job: s.job.id }), 'BAIT_LIMIT')
  expect((await state()).job.id).toBe(s.job.id)
})
