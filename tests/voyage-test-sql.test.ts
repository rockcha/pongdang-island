// @vitest-environment node
import { beforeAll, afterAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db: Awaited<ReturnType<typeof createLocalDatabase>>
const operator = '00000000-0000-0000-0000-000000006601',
  reader = '00000000-0000-0000-0000-000000006602'
async function asUser(id: string, sql: string) {
  await db.exec('set role authenticated')
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
    return await db.query(sql)
  } finally {
    await db.exec('reset role')
  }
}
const fingerprint = async () =>
  (
    await db.query(`select
 (select md5(coalesce(string_agg(to_jsonb(r)::text,'' order by id),'')) from app_private.voyage_bet_rounds r) rounds,
 (select md5(coalesce(string_agg(to_jsonb(p)::text,'' order by id),'')) from app_private.voyage_bet_plans p) plans,
 (select md5(coalesce(string_agg(to_jsonb(w)::text,'' order by user_id),'')) from public.player_wallets w) wallets,
 (select count(*) from app_private.voyage_race_bets) bets,(select count(*) from app_private.voyage_race_operations) operations,
 (select count(*) from app_private.push_deliveries) deliveries`)
  ).rows[0]
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
  for (const id of [operator, reader]) {
    await db.query('insert into auth.users(id)values($1)', [id])
    await db.query('insert into public.player_profiles(id,nickname)values($1,$2)', [
      id,
      id.slice(-4),
    ])
  }
  await db.query('insert into app_private.notice_operators(user_id)values($1)', [operator])
}, 180000)
afterAll(async () => {
  await db?.close()
})
it('requires operator status on the server, not just a hidden link', async () => {
  const before = await fingerprint()
  await expect(asUser(reader, 'select public.voyage_race_test_sample()')).rejects.toThrow(
    'OPERATOR_REQUIRED',
  )
  await db.exec('set role anon')
  try {
    await expect(db.query('select public.voyage_race_test_sample()')).rejects.toThrow(
      'permission denied',
    )
  } finally {
    await db.exec('reset role')
  }
  expect(await fingerprint()).toEqual(before)
})
it('uses production calculations for six phases and leaves all live state exactly unchanged', async () => {
  const before = await fingerprint()
  const sample = (await asUser(operator, 'select public.voyage_race_test_sample() sample')).rows[0]
    .sample
  expect(Object.keys(sample).sort()).toEqual(
    ['scheduled', 'open', 'sailing', 'one', 'two', 'final'].sort(),
  )
  const id = sample.open.rounds[0].id
  for (const [key, stage] of [
    ['scheduled', 0],
    ['open', 0],
    ['sailing', 0],
    ['one', 1],
    ['two', 2],
    ['final', 3],
  ] as const) {
    const state = sample[key],
      r = state.rounds[0]
    expect(state.rounds).toHaveLength(1)
    expect(r.id).toBe(id)
    expect(r.myBet).toBeNull()
    expect(Date.parse(r.departsAt)-Date.parse(r.opensAt)).toBe(3600000)
    expect(state.pendingPayout).toBe(0)
    expect(r.completedRegions).toBe(stage)
    expect(r.plans).toHaveLength(4)
    for (const p of r.plans) {
      if (key === 'scheduled') expect(p.bait).toBeNull()
      if (stage === 0) expect(p.progress).toBeNull()
      else expect(p.progress.regions).toHaveLength(stage)
      if (stage < 3) expect(p.result).toBeNull()
    }
  }
  expect(sample.final.rounds[0].phase).toBe('settled')
  expect(await fingerprint()).toEqual(before)
  const next = (await asUser(operator, 'select public.voyage_race_test_sample() sample')).rows[0]
    .sample
  expect(next.open.rounds[0].id).not.toBe(id)
  expect(await fingerprint()).toEqual(before)
})
it('revoking the operator allowlist blocks a previously allowed account', async () => {
  await db.query('delete from app_private.notice_operators where user_id=$1', [operator])
  await expect(asUser(operator, 'select public.voyage_race_test_sample()')).rejects.toThrow(
    'OPERATOR_REQUIRED',
  )
})
