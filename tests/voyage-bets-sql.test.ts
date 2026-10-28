// @vitest-environment node
import { beforeAll, afterAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db: Awaited<ReturnType<typeof createLocalDatabase>>
const owner = '00000000-0000-0000-0000-000000009901',
  other = '00000000-0000-0000-0000-000000009902'
let fixtureIndex = 0
async function asUser(id: string, sql: string, args: unknown[] = []) {
  await db.exec('set role authenticated')
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
    return await db.query(sql, args)
  } finally {
    await db.exec('reset role')
  }
}
const state = async (id = owner) =>
  (await asUser(id, 'select public.voyage_bets_state() result')).rows[0].result
const bet = async (
  plan: string,
  side = 'above',
  stake = 100,
  operation = crypto.randomUUID(),
  id = owner,
) =>
  (
    await asUser(id, 'select public.voyage_bets_place($1,$2,$3,$4) result', [
      operation,
      plan,
      side,
      stake,
    ])
  ).rows[0].result
async function fixture() {
  const r = (
    await db.query(
      'select id from app_private.voyage_bet_rounds order by voyage_day,slot offset $1 limit 1',
      [fixtureIndex++],
    )
  ).rows[0]
  await db.query(
    "update app_private.voyage_bet_rounds set rules='legacy',opens_at=statement_timestamp()-interval '1 minute',departs_at=statement_timestamp()+interval '29 minutes',results_at=statement_timestamp()+interval '209 minutes' where id=$1",
    [r.id],
  )
  const plans = (
    await db.query(
      'select * from app_private.voyage_bet_plans where round_id=$1 order by company_id',
      [r.id],
    )
  ).rows
  return { round: r.id, plans }
}
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
  for (const id of [owner, other]) {
    await db.query('insert into auth.users(id) values($1)', [id])
    await db.query('insert into public.player_profiles(id,nickname) values($1,$2)', [
      id,
      id.slice(-4),
    ])
    await db.query(
      'insert into public.player_wallets(user_id,gold) values($1,10000) on conflict(user_id) do update set gold=10000',
      [id],
    )
  }
}, 180000)
afterAll(async () => {
  await db?.close()
})

it('prepares both Korea-time slots with four three-region plans and hides all early outcomes', async () => {
  const rounds = (await db.query('select * from app_private.voyage_bet_rounds order by departs_at'))
    .rows
  expect(rounds.length).toBeGreaterThanOrEqual(2)
  for (const r of rounds) {
    expect([9, 20]).toContain(
      Number(
        new Date(r.departs_at).toLocaleString('en-US', {
          hour: 'numeric',
          hour12: false,
          timeZone: 'Asia/Seoul',
        }),
      ),
    )
    expect(Date.parse(r.departs_at) - Date.parse(r.opens_at)).toBe(3600000)
    expect(Date.parse(r.results_at) - Date.parse(r.departs_at)).toBe(10800000)
  }
  for (const p of (await db.query('select * from app_private.voyage_bet_plans')).rows) {
    expect(new Set(p.regions).size).toBe(3)
    expect(p.result).toHaveLength(3)
    for (const region of p.result)
      expect(region.catches.reduce((n: number, x: { quantity: number }) => n + x.quantity, 0)).toBe(
        p.count_per_region,
      )
  }
  const payload = await state()
  for (const r of payload.rounds)
    for (const p of r.plans) {
      expect(p.result).toBeNull()
      expect(p.regions).toBeUndefined()
      expect(p.actual_sales).toBeUndefined()
      if (r.phase === 'scheduled') {
        expect(p.publicRegion).toBeNull()
        expect(p.bait).toBeNull()
      }
    }
  await expect(asUser(owner, 'select * from app_private.voyage_bet_plans')).rejects.toThrow(
    'permission denied',
  )
  await expect(asUser(owner, 'select app_private.voyage_bets_maintenance()')).rejects.toThrow(
    'permission denied',
  )
  await db.exec('set role anon')
  try {
    await expect(db.query('select public.voyage_bets_state()')).rejects.toThrow('permission denied')
  } finally {
    await db.exec('reset role')
  }
})

it('debits changes, refunds cancellation, enforces the shared cap and replays operations exactly once', async () => {
  const { round, plans } = await fixture(),
    operation = crypto.randomUUID()
  expect((await bet(plans[0].id, 'above', 300, operation)).replayed).toBe(false)
  expect((await bet(plans[0].id, 'above', 300, operation)).replayed).toBe(true)
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [owner])).rows[0]
      .gold,
  ).toBe(9700)
  await expect(bet(plans[0].id, 'below', 300, operation)).rejects.toThrow('OPERATION_CONFLICT')
  await bet(plans[1].id, 'below', 200)
  await expect(bet(plans[2].id, 'above', 100)).rejects.toThrow('VOYAGE_ROUND_LIMIT')
  await bet(plans[0].id, 'below', 100)
  await bet(plans[1].id, 'below', 0)
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [owner])).rows[0]
      .gold,
  ).toBe(9900)
  expect(
    (await state(other)).rounds
      .find((r: { id: string }) => r.id === round)
      .plans.every((p: { myBet: unknown }) => p.myBet === null),
  ).toBe(true)
  await db.query(
    "update app_private.voyage_bet_rounds set opens_at=statement_timestamp()-interval '31 minutes',departs_at=statement_timestamp()-interval '1 minute',results_at=statement_timestamp()+interval '179 minutes' where id=$1",
    [round],
  )
  await expect(bet(plans[2].id)).rejects.toThrow('VOYAGE_CLOSED')
  expect((await bet(plans[0].id, 'above', 300, operation)).replayed).toBe(true)
  await expect(bet(plans[0].id, 'above', 99)).rejects.toThrow('INVALID_VOYAGE_BET')
})

it('settles win/loss/tie automatically and defers full-wallet credits without losing or duplicating them', async () => {
  const { round, plans } = await fixture()
  await bet(plans[0].id, 'above', 100)
  await bet(plans[1].id, 'below', 100)
  await bet(plans[2].id, 'above', 100)
  await db.query(
    'update app_private.voyage_bet_plans set actual_sales=target_sales+1 where id=any($1::uuid[])',
    [[plans[0].id, plans[1].id]],
  )
  await db.query('update app_private.voyage_bet_plans set actual_sales=target_sales where id=$1', [
    plans[2].id,
  ])
  await db.query(
    "update app_private.voyage_bet_rounds set opens_at=statement_timestamp()-interval '4 hours',departs_at=statement_timestamp()-interval '210 minutes',results_at=statement_timestamp()-interval '30 minutes' where id=$1",
    [round],
  )
  await db.query('update public.player_wallets set gold=1000000000 where user_id=$1', [owner])
  await db.query('select app_private.voyage_bets_maintenance()')
  let payload = await state()
  expect(payload.pendingPayout).toBe(290)
  const result = payload.rounds.find((r: { id: string }) => r.id === round)
  expect(result.phase).toBe('settled')
  expect(result.plans.every((p: { result: unknown }) => p.result !== null)).toBe(true)
  await db.query('update public.player_wallets set gold=1000 where user_id=$1', [owner])
  await db.query('select app_private.voyage_bets_maintenance()')
  await db.query('select app_private.voyage_bets_maintenance()')
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [owner])).rows[0]
      .gold,
  ).toBe(1290)
  payload = await state()
  expect(payload.pendingPayout).toBe(0)
})

it('queues one departure alert only for opted-in devices and expires it at departure', async () => {
  const { round } = await fixture()
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/voyage-test',
    keys: { p256dh: 'B' + 'a'.repeat(86), auth: 'a'.repeat(22) },
  }
  await asUser(owner, 'select public.web_push_device($1,$2,$3)', [
    'save',
    subscription,
    ['voyage-bets'],
  ])
  await db.query('select app_private.voyage_bets_maintenance()')
  await db.query('select app_private.voyage_bets_maintenance()')
  expect(
    (
      await db.query(
        "select count(*)::int n from app_private.push_deliveries where category='voyage-bets' and source_id=$1",
        [round],
      )
    ).rows[0].n,
  ).toBe(1)
  const deliveries = (await db.query('select public.claim_web_push() items')).rows[0].items
  expect(deliveries).toHaveLength(1)
  expect(deliveries[0].payload.url).toBe('/voyage-bets')
  expect(
    (
      await db.query(
        "select q.expires_at=r.departs_at same from app_private.push_deliveries q join app_private.voyage_bet_rounds r on r.id=q.source_id where q.category='voyage-bets' and r.id=$1",
        [round],
      )
    ).rows[0].same,
  ).toBe(true)
  await asUser(owner, 'select public.web_push_device($1,$2,$3)', ['save', subscription, []])
  await db.query(
    "update app_private.push_deliveries set status='pending',locked_until=null where category='voyage-bets'",
  )
  expect((await db.query('select public.claim_web_push() items')).rows[0].items).toEqual([])
  await asUser(owner, 'select public.web_push_device($1,$2,$3)', [
    'save',
    subscription,
    ['voyage-bets'],
  ])
  await db.query(
    "update app_private.push_deliveries set status='pending',locked_until=null,expires_at=statement_timestamp()-interval '1 second' where category='voyage-bets'",
  )
  expect((await db.query('select public.claim_web_push() items')).rows[0].items).toEqual([])
})

it('rolls back rejected debits and rejects requests before opening and at departure', async () => {
  const { round, plans } = await fixture(),
    operation = crypto.randomUUID()
  await db.query('update public.player_wallets set gold=50 where user_id=$1', [other])
  await expect(bet(plans[0].id, 'above', 100, operation, other)).rejects.toThrow(
    'INSUFFICIENT_GOLD',
  )
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [other])).rows[0]
      .gold,
  ).toBe(50)
  expect(
    (
      await db.query(
        'select count(*)::int n from app_private.voyage_bet_operations where operation_id=$1',
        [operation],
      )
    ).rows[0].n,
  ).toBe(0)
  await db.query(
    "update app_private.voyage_bet_rounds set opens_at=statement_timestamp()+interval '1 minute',departs_at=statement_timestamp()+interval '31 minutes',results_at=statement_timestamp()+interval '211 minutes' where id=$1",
    [round],
  )
  await expect(bet(plans[0].id)).rejects.toThrow('VOYAGE_NOT_OPEN')
  await db.query(
    "update app_private.voyage_bet_rounds set opens_at=statement_timestamp()-interval '30 minutes',departs_at=statement_timestamp(),results_at=statement_timestamp()+interval '3 hours' where id=$1",
    [round],
  )
  await expect(bet(plans[0].id)).rejects.toThrow('VOYAGE_CLOSED')
})
