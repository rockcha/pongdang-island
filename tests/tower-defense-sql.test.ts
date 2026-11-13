// @vitest-environment node
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db: Awaited<ReturnType<typeof createLocalDatabase>>
const uid = '00000000-0000-0000-0000-000000007291',
  other = '00000000-0000-0000-0000-000000007292'
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
}, 120000)
afterAll(async () => {
  await db.close()
})
beforeEach(async () => {
  await db.exec('begin')
  for (const id of [uid, other]) {
    await db.query('insert into auth.users(id) values($1)', [id])
    await db.query('insert into public.player_profiles(id,nickname) values($1,$2)', [
      id,
      id === uid ? '성A' : '성B',
    ])
    await db.query(
      'insert into public.player_wallets(user_id,gold) values($1,1000) on conflict(user_id) do update set gold=1000',
      [id],
    )
  }
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid])
})
afterEach(async () => {
  await db.exec('rollback')
})
async function as(role: string, sql: string, args: unknown[] = []) {
  await db.exec('set role ' + role)
  const result = (await db.query(sql, args)).rows[0]?.data
  await db.exec('reset role')
  return result
}
const start = (op = crypto.randomUUID()) =>
  as('authenticated', 'select public.tower_defense_start($1,1) data', [op])
async function settle(
  run: any,
  stage: number,
  final = false,
  abandoned = false,
  ticks = 100,
  previous = run.replay,
  user = uid,
) {
  const replay = { version: 1, ticks, commands: [] }
  return as('service_role', 'select public.tower_defense_settle($1,$2,$3,$4,$5,$6,$7,$8) data', [
    user,
    run.id,
    stage,
    JSON.stringify(replay),
    JSON.stringify({ version: 1, seed: run.seed, state: { tick: ticks } }),
    JSON.stringify(previous),
    final,
    abandoned,
  ])
}
async function denied(task: () => Promise<unknown>, message: string) {
  await db.exec('savepoint denied')
  await expect(task()).rejects.toThrow(message)
  await db.exec('rollback to savepoint denied;reset role')
}
it('charges 30 exactly once per entry, resumes the active run, and rejects insufficient gold', async () => {
  const op = crypto.randomUUID(),
    first = await start(op)
  expect(first.wallet.gold).toBe(970)
  expect(first.run.seed).toBeGreaterThan(0)
  expect(first.run.checkpoint).toBeUndefined()
  expect((await start(op)).run.id).toBe(first.run.id)
  expect((await start()).run.id).toBe(first.run.id)
  expect((await as('authenticated', 'select public.tower_defense_state() data')).wallet.gold).toBe(
    970,
  )
  await db.query('update public.player_wallets set gold=29 where user_id=$1', [other])
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [other])
  await denied(() => start(), 'INSUFFICIENT_GOLD')
})
it('credits ten per newly cleared stage immediately, preserving timestamps on retries and finalization', async () => {
  const first = await start(),
    a = await settle(first.run, 2)
  expect(a.wallet.gold).toBe(990)
  expect(a.run.reward).toBe(20)
  expect((await settle(first.run, 2)).wallet.gold).toBe(990)
  const b = await settle(a.run, 3, false, false, 200)
  expect(b.wallet.gold).toBe(1000)
  expect(b.run.reward).toBe(30)
  const finished = await settle(b.run, 3, true, false, 200)
  expect(finished.run.achieved_at).toBe(b.run.achieved_at)
  expect((await settle(b.run, 3, true, false, 200)).wallet.gold).toBe(1000)
  expect(
    (
      await db.query(
        "select count(*)::int n from public.gold_transactions where user_id=$1 and item_id='arcade:tower-defense:stages'",
        [uid],
      )
    ).rows[0].n,
  ).toBe(2)
  const next = await start()
  expect(next.run.id).not.toBe(first.run.id)
  expect(next.wallet.gold).toBe(970)
})
it('blocks client score/checkpoint writes, other owners, score regression and stale concurrent checkpoints', async () => {
  const first = await start()
  await denied(
    () =>
      as('authenticated', 'select public.tower_defense_record($1,$2) data', [uid, first.run.id]),
    'permission denied',
  )
  await denied(
    () => as('authenticated', 'select * from app_private.tower_defense_runs'),
    'permission denied',
  )
  await denied(() => as('anon', 'select public.tower_defense_state() data'), 'permission denied')
  await denied(
    () => settle(first.run, 1, false, false, 100, first.run.replay, other),
    'RUN_NOT_FOUND',
  )
  const a = await settle(first.run, 2)
  await denied(() => settle(a.run, 1, false, false, 200), 'INVALID_REPLAY')
  await denied(() => settle(first.run, 3, false, false, 200), 'CHECKPOINT_MISMATCH')
  await db.query('update public.player_wallets set gold=1000000000 where user_id=$1', [uid])
  await denied(() => settle(a.run, 3, false, false, 200), 'GOLD_LIMIT')
})
it('keeps immediate earnings on abandonment and excludes abandoned and unfinished records from ranking', async () => {
  const first = await start(),
    a = await settle(first.run, 5, true, true)
  expect(a.wallet.gold).toBe(1020)
  expect(a.run.abandoned).toBe(true)
  expect((await as('authenticated', 'select public.tower_defense_leaderboard(0) data')).total).toBe(
    0,
  )
  await settle((await start()).run, 8)
  expect((await as('authenticated', 'select public.tower_defense_leaderboard(0) data')).total).toBe(
    0,
  )
})
it('orders by stage then first achievement time (not finish time), and mails weekly gold once', async () => {
  const week = (
    await db.query(
      "select date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul')::date::text d",
    )
  ).rows[0].d
  for (const [user, stage, achieved, finished] of [
    [uid, 40, 1, 5],
    [uid, 39, 0, 1],
    [uid, 40, 3, 4],
    [other, 40, 2, 3],
  ] as const) {
    await db.query(
      "insert into app_private.tower_defense_runs(user_id,operation_id,seed,cleared_stage,reward,achieved_at,finished_at) values($1,gen_random_uuid(),1,$2,$2*10,($3::date+$4::integer)::timestamp at time zone 'Asia/Seoul',($3::date+$5::integer)::timestamp at time zone 'Asia/Seoul')",
      [user, stage, week, achieved, finished],
    )
  }
  const ranked = (
    await db.query("select * from app_private.arcade_weekly_rankings('tower-defense',$1)", [week])
  ).rows
  expect(ranked.map((r) => r.user_id)).toEqual([uid, other])
  expect(ranked.map((r) => r.score)).toEqual([40, 40])
  const board = await as('authenticated', 'select public.tower_defense_leaderboard(0) data')
  expect(board.rows.map((r: any) => r.userId)).toEqual([uid, other])
  expect(board.rewards).toEqual([2000, 1500, 1000, 650, 400, 200])
  await db.query('update app_private.arcade_reward_settings set first_week=$1', [week])
  const close = () =>
    db.query(
      "select app_private.settle_arcade_weeks((($1::date+7)::timestamp at time zone 'Asia/Seoul')+interval '1 minute') n",
      [week],
    )
  expect((await close()).rows[0].n).toBe(2)
  expect((await close()).rows[0].n).toBe(0)
  const gifts = (
    await db.query(
      "select g.id,g.quantity,g.message from public.collectible_gifts g join app_private.arcade_weekly_rewards r on r.gift_id=g.id where r.game='tower-defense' order by r.rank",
    )
  ).rows
  expect(gifts.map((g) => g.quantity)).toEqual([2000, 1500])
  expect(gifts[0].message).toContain('타워디펜스')
  await as('authenticated', 'select public.claim_collectible_gift($1) data', [gifts[0].id])
  await as('authenticated', 'select public.claim_collectible_gift($1) data', [gifts[0].id])
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [uid])).rows[0].gold,
  ).toBe(3000)
})
