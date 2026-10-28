// @vitest-environment node
import { beforeAll, afterAll, expect, it } from 'vitest'
import {
  createLocalDatabase,
  replayMigrations,
  migrationFiles,
  readSql,
} from '../scripts/db/local.mjs'
let db: Awaited<ReturnType<typeof createLocalDatabase>>,
  index = 0
const users = [1, 2, 3, 4].map((i) => '00000000-0000-0000-0000-00000000880' + i)
async function user(id: string, sql: string, args: unknown[] = []) {
  await db.exec('set role authenticated')
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
    return await db.query(sql, args)
  } finally {
    await db.exec('reset role')
  }
}
const bet = async (plan: string, stake = 100, operation = crypto.randomUUID(), uid = users[0]) =>
  (await user(uid, 'select public.voyage_race_place($1,$2,$3) result', [operation, plan, stake]))
    .rows[0].result
async function fixture() {
  const r = (
    await db.query(
      "insert into app_private.voyage_bet_rounds(voyage_day,slot,opens_at,departs_at,results_at,rules) values(date '2080-01-01'+$1::int,9,statement_timestamp()-interval '1 minute',statement_timestamp()+interval '29 minutes',statement_timestamp()+interval '209 minutes','ranking') returning id",
      [index++],
    )
  ).rows[0]
  await db.query('select app_private.voyage_bet_make_plans($1,clock_timestamp())', [r.id])
  const plans = (
    await db.query(
      'select * from app_private.voyage_bet_plans where round_id=$1 order by company_id',
      [r.id],
    )
  ).rows
  return { round: r.id, plans }
}
const payload = async (round: string, elapsed: string, uid = users[0]) =>
  (
    await db.query(
      'select app_private.voyage_race_payload($1,r.departs_at+$2::interval) result from app_private.voyage_bet_rounds r where id=$3',
      [uid, elapsed, round],
    )
  ).rows[0].result
const at = async (round: string, elapsed: string) =>
  (await payload(round, elapsed)).rounds.find((r: { id: string }) => r.id === round)
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
  for (const id of users) {
    await db.query('insert into auth.users(id) values($1)', [id])
    await db.query('insert into public.player_profiles(id,nickname) values($1,$2)', [
      id,
      id.slice(-4),
    ])
    await db.query(
      'insert into public.player_wallets(user_id,gold) values($1,10000) on conflict(user_id)do update set gold=10000',
      [id],
    )
  }
}, 180000)
afterAll(async () => {
  await db?.close()
})
it('preserves already-open legacy bets during migration and settles them under their original rules', async () => {
  const previous = await createLocalDatabase(),
    file = '20261028174409_voyage_ranking_and_hourly_reports.sql'
  try {
    for (const f of migrationFiles()) {
      if (f === file) break
      await previous.exec(readSql('supabase/migrations/' + f))
    }
    await previous.query('insert into auth.users(id) values($1)', [users[0]])
    await previous.query('insert into public.player_profiles(id,nickname) values($1,$2)', [
      users[0],
      '이전규칙확인',
    ])
    await previous.query('update public.player_wallets set gold=1000 where user_id=$1', [users[0]])
    const round = (
      await previous.query(
        'select id from app_private.voyage_bet_rounds order by departs_at limit 1',
      )
    ).rows[0].id
    await previous.query(
      "update app_private.voyage_bet_rounds set opens_at=statement_timestamp()-interval '1 minute',departs_at=statement_timestamp()+interval '29 minutes',results_at=statement_timestamp()+interval '209 minutes' where id=$1",
      [round],
    )
    const plan = (
      await previous.query(
        'select id,target_sales,result from app_private.voyage_bet_plans where round_id=$1 order by company_id limit 1',
        [round],
      )
    ).rows[0]
    await previous.query("select set_config('request.jwt.claim.sub',$1,false)", [users[0]])
    await previous.query("select public.voyage_bets_place($1,$2,'above',200)", [
      crypto.randomUUID(),
      plan.id,
    ])
    await previous.exec(readSql('supabase/migrations/' + file))
    expect(
      (await previous.query('select rules from app_private.voyage_bet_rounds where id=$1', [round]))
        .rows[0].rules,
    ).toBe('legacy')
    const after = (
      await previous.query(
        'select target_sales,result,stage_targets from app_private.voyage_bet_plans where id=$1',
        [plan.id],
      )
    ).rows[0]
    expect(after.target_sales).toBe(plan.target_sales)
    expect(after.result).toEqual(plan.result)
    expect(after.stage_targets).toBeNull()
    await previous.query(
      'update app_private.voyage_bet_plans set actual_sales=target_sales+1 where id=$1',
      [plan.id],
    )
    await previous.query(
      "update app_private.voyage_bet_rounds set opens_at=statement_timestamp()-interval '4 hours',departs_at=statement_timestamp()-interval '210 minutes',results_at=statement_timestamp()-interval '30 minutes' where id=$1",
      [round],
    )
    await previous.query('select app_private.voyage_bets_maintenance()')
    expect(
      (await previous.query('select gold from public.player_wallets where user_id=$1', [users[0]]))
        .rows[0].gold,
    ).toBe(1180)
  } finally {
    await previous.close()
  }
}, 180000)
it('blocks direct reads, anonymous RPC calls, and old above/below writes on ranking rounds', async () => {
  const { round, plans } = await fixture(),
    p = plans[0]
  await expect(user(users[0], 'select * from app_private.voyage_race_bets')).rejects.toThrow(
    'permission denied',
  )
  await expect(
    user(users[0], 'select app_private.voyage_race_board($1,3)', [round]),
  ).rejects.toThrow('permission denied')
  await expect(
    user(users[0], 'select public.voyage_bets_place($1,$2,$3,$4)', [
      crypto.randomUUID(),
      p.id,
      'above',
      100,
    ]),
  ).rejects.toThrow('VOYAGE_RULES_CHANGED')
  await db.exec('set role anon')
  try {
    await expect(db.query('select public.voyage_race_state()')).rejects.toThrow('permission denied')
  } finally {
    await db.exec('reset role')
  }
  expect(
    (await at(round, '-31 minutes')).plans.every(
      (p: { bait: unknown; progress: unknown; result: unknown }) =>
        p.bait === null && p.progress === null && p.result === null,
    ),
  ).toBe(true)
})
it('keeps one company per round, charges only the delta, refunds, and replays the same operation', async () => {
  const { round, plans } = await fixture(),
    op = crypto.randomUUID()
  await bet(plans[0].id, 500, op)
  await bet(plans[0].id, 500, op)
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [users[0]])).rows[0]
      .gold,
  ).toBe(9500)
  await expect(bet(plans[1].id, 500, op)).rejects.toThrow('OPERATION_CONFLICT')
  await bet(plans[1].id, 300)
  expect(
    (
      await db.query(
        'select count(*)::int n from app_private.voyage_race_bets where user_id=$1 and round_id=$2',
        [users[0], round],
      )
    ).rows[0].n,
  ).toBe(1)
  const state = await at(round, '-1 minute')
  expect(state.myBet.planId).toBe(plans[1].id)
  expect(state.myStake).toBe(300)
  expect(
    (await payload(round, '-1 minute', users[1])).rounds.find((r: { id: string }) => r.id === round)
      .myBet,
  ).toBeNull()
  await bet(plans[1].id, 0)
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [users[0]])).rows[0]
      .gold,
  ).toBe(10000)
  await expect(bet(plans[0].id, 600)).rejects.toThrow('INVALID_VOYAGE_BET')
  await db.query(
    "update app_private.voyage_bet_rounds set opens_at=statement_timestamp()-interval '30 minutes',departs_at=statement_timestamp(),results_at=statement_timestamp()+interval '3 hours' where id=$1",
    [round],
  )
  await expect(bet(plans[0].id)).rejects.toThrow('VOYAGE_CLOSED')
  expect((await bet(plans[0].id, 500, op)).replayed).toBe(true)
})
it('reveals exactly one completed region per hour and never ranks unrevealed sales', async () => {
  const { round, plans } = await fixture()
  expect((await at(round, '59 minutes 59.999 seconds')).completedRegions).toBe(0)
  const first = await at(round, '1 hour')
  expect(first.completedRegions).toBe(1)
  for (const p of first.plans) {
    expect(p.progress.regions).toHaveLength(1)
    expect(p.result).toBeNull()
    expect(p.stage_targets).toBeUndefined()
    expect(p.progress.sales).toBe(p.progress.regions[0].sales)
  }
  const order = first.plans.map((p: { progress: { rank: number } }) => p.progress.rank)
  await db.query(
    "update app_private.voyage_bet_plans set result=jsonb_set(result,'{2,sales}','99999999'::jsonb) where id=$1",
    [plans[0].id],
  )
  expect(
    (await at(round, '1 hour')).plans.map((p: { progress: { rank: number } }) => p.progress.rank),
  ).toEqual(order)
  expect(
    (await at(round, '1 hour 59 minutes 59.999 seconds')).plans.every(
      (p: { progress: { regions: unknown[] } }) => p.progress.regions.length === 1,
    ),
  ).toBe(true)
  const second = await at(round, '2 hours')
  expect(second.completedRegions).toBe(2)
  expect(
    second.plans.every(
      (p: { progress: { regions: unknown[] }; result: unknown }) =>
        p.progress.regions.length === 2 && p.result === null,
    ),
  ).toBe(true)
  const final = await at(round, '3 hours')
  expect(final.completedRegions).toBe(3)
  expect(
    final.plans.every((p: { result: { regions: unknown[] } }) => p.result.regions.length === 3),
  ).toBe(true)
})
async function forceScores(plans: { id: string }[], sales: number[]) {
  for (let i = 0; i < plans.length; i++)
    await db.query(
      "update app_private.voyage_bet_plans set stage_targets=array[100,200,300],target_sales=300,actual_sales=$2,result=jsonb_set(jsonb_set(jsonb_set(result,'{0,sales}','0'::jsonb),'{1,sales}','0'::jsonb),'{2,sales}',to_jsonb($2::int)) where id=$1",
      [plans[i].id, sales[i]],
    )
}
async function due(round: string) {
  await db.query(
    "update app_private.voyage_bet_rounds set opens_at=statement_timestamp()-interval '4 hours',departs_at=statement_timestamp()-interval '210 minutes',results_at=statement_timestamp()-interval '30 minutes' where id=$1",
    [round],
  )
  await db.query('select app_private.voyage_bets_maintenance()')
}
it('stores 3x / 1.2x rewards once, then credits only the recipient on an explicit claim', async () => {
  const { round, plans } = await fixture()
  for (let i = 0; i < 4; i++) {
    await db.query('update public.player_wallets set gold=10000 where user_id=$1', [users[i]])
    await bet(plans[i].id, 500, crypto.randomUUID(), users[i])
  }
  await forceScores(plans, [400, 300, 200, 100])
  await db.query('update public.player_wallets set gold=1000000000 where user_id=$1', [users[0]])
  await due(round)
  const bets = (
    await db.query(
      'select payout,paid_at,reward_gift_id from app_private.voyage_race_bets where round_id=$1 order by user_id',
      [round],
    )
  ).rows
  expect(bets.map((b) => b.payout)).toEqual([1500, 600, 0, 0])
  expect(bets[0].paid_at).not.toBeNull()
  expect(bets[0].reward_gift_id).toBeTruthy()
  expect(bets[1].reward_gift_id).toBeTruthy()
  expect(bets.slice(2).map((b) => b.reward_gift_id)).toEqual([null, null])
  expect((await payload(round, '3 hours')).pendingPayout).toBe(0)
  const settled = await at(round, '3 hours')
  expect(settled.myBet.rewardGiftId).toBe(bets[0].reward_gift_id)
  expect(settled.myBet.rewardClaimedAt).toBeNull()
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [users[0]])).rows[0]
      .gold,
  ).toBe(1000000000)
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [users[1]])).rows[0]
      .gold,
  ).toBe(9500)
  await expect(
    user(users[1], 'select public.claim_collectible_gift($1)', [bets[0].reward_gift_id]),
  ).rejects.toThrow('GIFT_NOT_FOUND')
  await expect(
    user(users[0], 'select public.claim_collectible_gift($1)', [bets[0].reward_gift_id]),
  ).rejects.toThrow('GOLD_LIMIT')
  expect(
    (
      await db.query('select status from public.collectible_gifts where id=$1', [
        bets[0].reward_gift_id,
      ])
    ).rows[0].status,
  ).toBe('pending')
  await db.query('update public.player_wallets set gold=1000 where user_id=$1', [users[0]])
  await db.query('select app_private.voyage_bets_maintenance()')
  await db.query('select app_private.voyage_bets_maintenance()')
  expect(
    (
      await db.query('select count(*)::int n from public.collectible_gifts where reward_id=$1', [
        'voyage-race:' + round,
      ])
    ).rows[0].n,
  ).toBe(2)
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [users[0]])).rows[0]
      .gold,
  ).toBe(1000)
  await user(users[0], 'select public.claim_collectible_gift($1)', [bets[0].reward_gift_id])
  await user(users[0], 'select public.claim_collectible_gift($1)', [bets[0].reward_gift_id])
  expect((await at(round, '3 hours')).myBet.rewardClaimedAt).not.toBeNull()
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [users[0]])).rows[0]
      .gold,
  ).toBe(2500)
  expect(
    (
      await db.query(
        'select count(*)::int n from public.gold_transactions where user_id=$1 and item_id=$2',
        [users[0], 'voyage:claim:' + bets[0].reward_gift_id],
      )
    ).rows[0].n,
  ).toBe(1)
})
it('does not redeliver historical wallet payouts as gifts', async () => {
  const { round, plans } = await fixture()
  await bet(plans[0].id, 100)
  await forceScores(plans, [400, 300, 200, 100])
  await db.query(
    'update app_private.voyage_race_bets set payout=300,paid_at=clock_timestamp() where round_id=$1',
    [round],
  )
  await db.query(
    'update app_private.voyage_bet_rounds set settled_at=clock_timestamp() where id=$1',
    [round],
  )
  await db.query('select app_private.voyage_bets_maintenance()')
  expect(
    (
      await db.query('select reward_gift_id from app_private.voyage_race_bets where round_id=$1', [
        round,
      ])
    ).rows[0].reward_gift_id,
  ).toBeNull()
  expect(
    (
      await db.query('select count(*)::int n from public.collectible_gifts where reward_id=$1', [
        'voyage-race:' + round,
      ])
    ).rows[0].n,
  ).toBe(0)
})
it('refunds exact ties in paid places without treating a tie for third as a refund', async () => {
  const first = await fixture()
  await bet(first.plans[0].id, 100)
  await forceScores(first.plans, [400, 300, 300, 100])
  await due(first.round)
  expect((await at(first.round, '3 hours')).refunded).toBe(true)
  expect(
    (
      await db.query('select payout from app_private.voyage_race_bets where round_id=$1', [
        first.round,
      ])
    ).rows[0].payout,
  ).toBe(100)
  const second = await fixture()
  await bet(second.plans[0].id, 100)
  await forceScores(second.plans, [400, 300, 100, 100])
  await due(second.round)
  expect((await at(second.round, '3 hours')).refunded).toBe(false)
  expect(
    (
      await db.query('select payout from app_private.voyage_race_bets where round_id=$1', [
        second.round,
      ])
    ).rows[0].payout,
  ).toBe(300)
})
it('ranks exact ratios beyond floating point precision even when displayed percentages match', async () => {
  const { round, plans } = await fixture()
  await forceScores(plans, [2000000000, 1999999999, 200, 100])
  await db.query(
    'update app_private.voyage_bet_plans set stage_targets=array[100,200,2000000001],target_sales=2000000001 where id=$1',
    [plans[0].id],
  )
  await db.query(
    'update app_private.voyage_bet_plans set stage_targets=array[100,200,2000000000],target_sales=2000000000 where id=$1',
    [plans[1].id],
  )
  const final = await at(round, '3 hours'),
    a = final.plans.find((p: { id: string }) => p.id === plans[0].id),
    b = final.plans.find((p: { id: string }) => p.id === plans[1].id)
  expect(a.progress.achievement).toBe(b.progress.achievement)
  expect(a.progress.rank).toBe(1)
  expect(b.progress.rank).toBe(2)
  expect(final.refunded).toBe(false)
})
