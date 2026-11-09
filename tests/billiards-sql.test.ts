// @vitest-environment node
import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db: Awaited<ReturnType<typeof createLocalDatabase>>
const uid = '00000000-0000-0000-0000-000000007191',
  other = '00000000-0000-0000-0000-000000007192'
const replay = { version: 1, shots: [{ dx: 0, dy: -60 }] }
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
      id === uid ? '당구A' : '당구B',
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
  as('authenticated', 'select public.billiards_start($1,1) data', [op])
const settle = (
  id: string,
  final: boolean,
  abandoned = false,
  value = replay,
  score = 10,
  user = uid,
) =>
  as('service_role', 'select public.billiards_settle($1,$2,$3,$4,$5,$6) data', [
    user,
    id,
    score,
    JSON.stringify(value),
    final,
    abandoned,
  ])
async function denied(task: () => Promise<unknown>, message: string) {
  await db.exec('savepoint denied')
  await expect(task()).rejects.toThrow(message)
  await db.exec('rollback to savepoint denied;reset role')
}
it('charges ten once, resumes an active run and never charges on operation retries', async () => {
  const op = crypto.randomUUID(),
    first = await start(op)
  expect(first.wallet.gold).toBe(990)
  expect((await start(op)).run.id).toBe(first.run.id)
  expect((await start()).run.id).toBe(first.run.id)
  expect((await as('authenticated', 'select public.billiards_state() data')).wallet.gold).toBe(990)
  expect(
    (await db.query('select count(*)::int n from public.gold_transactions where user_id=$1', [uid]))
      .rows[0].n,
  ).toBe(1)
  await db.query('update public.player_wallets set gold=9 where user_id=$1', [other])
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [other])
  await denied(() => start(), 'INSUFFICIENT_GOLD')
})
it('saves checkpoints without paying and pays the final score exactly once', async () => {
  const s = await start(),
    checkpoint = await settle(s.run.id, false)
  expect(checkpoint.wallet.gold).toBe(990)
  expect(checkpoint.run.reward).toBe(0)
  expect(checkpoint.run.replay).toEqual(replay)
  const final = await settle(s.run.id, true)
  expect(final.wallet.gold).toBe(1000)
  expect(final.run.reward).toBe(10)
  expect((await settle(s.run.id, true)).wallet.gold).toBe(1000)
  expect(
    (
      await db.query(
        "select count(*)::int n from public.gold_transactions where user_id=$1 and item_id='arcade:billiards:reward'",
        [uid],
      )
    ).rows[0].n,
  ).toBe(1)
})
it('blocks client score writes, table reads, foreign ownership and rewritten checkpoint prefixes', async () => {
  const s = await start()
  await denied(
    () =>
      as('authenticated', 'select public.billiards_settle($1,$2,100,$3,true,false) data', [
        uid,
        s.run.id,
        JSON.stringify(replay),
      ]),
    'permission denied',
  )
  await denied(() => as('anon', 'select public.billiards_state() data'), 'permission denied')
  await denied(
    () => as('authenticated', 'select * from app_private.billiards_runs'),
    'permission denied',
  )
  await denied(() => settle(s.run.id, true, false, replay, 10, other), 'RUN_NOT_FOUND')
  await settle(s.run.id, false)
  await denied(
    () => settle(s.run.id, true, false, { version: 1, shots: [{ dx: 60, dy: 0 }] }),
    'CHECKPOINT_MISMATCH',
  )
})
it('pays earned points on leaving but excludes that run from weekly rankings', async () => {
  const s = await start(),
    final = await settle(s.run.id, true, true)
  expect(final.run.abandoned).toBe(true)
  expect(final.wallet.gold).toBe(1000)
  const board = await as('authenticated', 'select public.billiards_leaderboard(0) data')
  expect(board.total).toBe(0)
})
it('ranks one best completed run per player and settles weekly gifts only once', async () => {
  const week = (
    await db.query(
      "select date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul')::date::text d",
    )
  ).rows[0].d
  for (const [user, score, day, abandoned] of [
    [uid, 50, 1, false],
    [uid, 40, 2, false],
    [other, 50, 2, false],
    [other, 100, 3, true],
  ] as const) {
    await db.query(
      "insert into app_private.billiards_runs(user_id,operation_id,score,reward,finished_at,abandoned) values($1,gen_random_uuid(),$2,$2,($3::date+$4::integer)::timestamp at time zone 'Asia/Seoul',$5)",
      [user, score, week, day, abandoned],
    )
  }
  const ranked = (
    await db.query("select * from app_private.arcade_weekly_rankings('billiards',$1)", [week])
  ).rows
  expect(ranked.map((r) => r.user_id)).toEqual([uid, other])
  expect(ranked.map((r) => r.score)).toEqual([50, 50])
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
      "select g.id,g.quantity,g.message from public.collectible_gifts g join app_private.arcade_weekly_rewards r on r.gift_id=g.id where r.game='billiards' order by r.rank",
    )
  ).rows
  expect(gifts.map((g) => g.quantity)).toEqual([2000, 1500])
  expect(gifts[0].message).toContain('퐁이 당구')
  await as('authenticated', 'select public.claim_collectible_gift($1) data', [gifts[0].id])
  await as('authenticated', 'select public.claim_collectible_gift($1) data', [gifts[0].id])
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [uid])).rows[0].gold,
  ).toBe(3000)
})
