// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db: Awaited<ReturnType<typeof createLocalDatabase>>
const uid = '00000000-0000-0000-0000-000000009731',
  other = '00000000-0000-0000-0000-000000009732'
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
      id === uid ? 'ordera' : 'orderb',
    ])
  }
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid])
  await db.exec('set role authenticated')
})
afterEach(async () => {
  await db.exec('rollback')
})
async function action(
  name: string,
  id: string | null = null,
  round: number | null = null,
  order: number[] | null = null,
  operation: string | null = null,
) {
  return (
    await db.query('select public.aquarium_order_action($1,$2,$3,$4,$5) s', [
      name,
      operation,
      id,
      round,
      order === null ? null : JSON.stringify(order),
    ])
  ).rows[0].s
}
function answer(run: any) {
  const counts = new Map<number, number>()
  for (const f of run.board.fish) counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1)
  return [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!)
}
it('starts free, is idempotent, exposes no table access and rejects another owner', async () => {
  const op = crypto.randomUUID(),
    s = await action('start', null, null, null, op)
  expect(s.run.round).toBe(0)
  expect(s.run.phase).toBe('briefing')
  expect((await action('start', null, null, null, op)).run.id).toBe(s.run.id)
  expect((await action('start', null, null, null, crypto.randomUUID())).run.id).toBe(s.run.id)
  expect(
    (
      await db.query(
        "select has_table_privilege('authenticated','app_private.aquarium_order_runs','SELECT') ok",
      )
    ).rows[0].ok,
  ).toBe(false)
  await db.exec('reset role')
  expect(
    (await db.query('select count(*)::int n from public.gold_transactions where user_id=$1', [uid]))
      .rows[0].n,
  ).toBe(0)
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [other])
  await db.exec('set role authenticated')
  await expect(action('begin', s.run.id, 0)).rejects.toThrow('RUN_NOT_FOUND')
})
it('validates answers once, does not extend deadline and advances once on retries', async () => {
  let s = await action('start', null, null, null, crypto.randomUUID())
  const id = s.run.id
  s = await action('begin', id, 0)
  const deadline = s.run.deadline
  expect((await action('begin', id, 0)).run.deadline).toBe(deadline)
  s = await action('answer', id, 0, answer(s.run))
  expect(s.run.outcome).toBe('correct')
  const score = s.run.score
  expect((await action('answer', id, 0, [0, 0, 0, 0])).run.score).toBe(score)
  s = await action('next', id, 0)
  expect(s.run.round).toBe(1)
  expect((await action('next', id, 0)).run.round).toBe(1)
  expect((await action('begin', id, 0)).run.phase).toBe('briefing')
})
it('server deadline rejects correct but late answers and abandon excludes ranking', async () => {
  let s = await action('start', null, null, null, crypto.randomUUID())
  const id = s.run.id
  s = await action('begin', id, 0)
  await db.exec('reset role')
  await db.query(
    "update app_private.aquarium_order_runs set deadline=clock_timestamp()-interval '1 second' where id=$1",
    [id],
  )
  await db.exec('set role authenticated')
  s = await action('answer', id, 0, answer(s.run))
  expect(s.run.outcome).toBe('timeout')
  expect(s.run.score).toBe(0)
  expect(s.run.lives).toBe(2)
  await action('leave', id)
  expect((await db.query('select public.aquarium_order_leaderboard(0) s')).rows[0].s.total).toBe(0)
})
it('rejects malformed permutations', async () => {
  let s = await action('start', null, null, null, crypto.randomUUID())
  s = await action('begin', s.run.id, 0)
  await expect(action('answer', s.run.id, 0, [1, 1, 1, 1])).rejects.toThrow('INVALID_ORDER')
})
it('completes forty server rounds with four species, then settles only the best run once', async () => {
  let s = await action('start', null, null, null, crypto.randomUUID())
  const id = s.run.id
  let previous: number[] = []
  let previousAnswer: number[] = []
  for (let i = 0; i < 40; i++) {
    const r = s.run
    expect(r.board.stage).toBe(Math.floor(i / 2) + 1)
    expect(new Set(r.board.fish.map((f: any) => f.kind)).size).toBe(4)
    const ranked = answer(r)
    expect(r.board.initialOrder).not.toEqual(ranked)
    if (i % 2 === 1) {
      expect(r.board.targets).toEqual(previous)
      expect(ranked).not.toEqual(previousAnswer)
    } else if (i > 0)
      expect(
        r.board.targets.filter((k: number) => !previous.includes(k)).length,
      ).toBeGreaterThanOrEqual(2)
    previous = r.board.targets
    previousAnswer = ranked
    s = await action('begin', id, i)
    s = await action('answer', id, i, ranked)
    expect(s.run.outcome).toBe('correct')
    s = await action('next', id, i)
  }
  expect(s.run.phase).toBe('result')
  expect(s.run.correct).toBe(40)
  const ranking = (await db.query('select public.aquarium_order_leaderboard(0) s')).rows[0].s
  expect(ranking.total).toBe(1)
  expect(ranking.rows[0].rewardGold).toBe(2000)
  await db.exec('reset role')
  const end = ranking.weekEnd
  expect(
    (await db.query('select app_private.settle_arcade_weeks($1::timestamptz) n', [end])).rows[0].n,
  ).toBe(0)
  await db.query("select app_private.settle_arcade_weeks($1::timestamptz+interval '1 minute')", [
    end,
  ])
  const rewards = (
    await db.query(
      "select gold from app_private.arcade_weekly_rewards where game='aquarium-order' and user_id=$1",
      [uid],
    )
  ).rows
  expect(rewards).toEqual([{ gold: 2000 }])
  const gift = (
    await db.query(
      "select gift_id from app_private.arcade_weekly_rewards where game='aquarium-order' and user_id=$1",
      [uid],
    )
  ).rows[0].gift_id
  await db.exec('set role authenticated')
  await db.query('select public.claim_collectible_gift($1)', [gift])
  await db.query('select public.claim_collectible_gift($1)', [gift])
  await db.exec('reset role')
  expect(
    (await db.query('select gold from public.player_wallets where user_id=$1', [uid])).rows[0].gold,
  ).toBe(2000)
  expect(
    (
      await db.query(
        "select app_private.settle_arcade_weeks($1::timestamptz+interval '2 minutes') n",
        [end],
      )
    ).rows[0].n,
  ).toBe(0)
}, 120000)
