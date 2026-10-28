// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db: Awaited<ReturnType<typeof createLocalDatabase>>
const user = '00000000-0000-0000-0000-000000009901',
  other = '00000000-0000-0000-0000-000000009902'
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
  for (const id of [user, other]) {
    await db.query('insert into auth.users(id) values($1)', [id])
    await db.query('insert into public.player_profiles(id,nickname) values($1,$2)', [
      id,
      '기록' + id.slice(-4),
    ])
  }
}, 180000)
afterAll(async () => {
  await db?.close()
})
async function read(id = user) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id])
  await db.exec('set role authenticated')
  try {
    return (await db.query('select public.today_fishing_records() data')).rows[0].data
  } finally {
    await db.exec('reset role')
  }
}
async function cast({
  id = user,
  rarity = null,
  bait = 'bait',
  offset = '1 second',
  prepared = true,
  done = true,
}: {
  id?: string
  rarity?: string | null
  bait?: string
  offset?: string
  prepared?: boolean
  done?: boolean
} = {}) {
  const op = crypto.randomUUID()
  if (prepared)
    await db.query(
      `insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,finished_at)
 values($1,$2,'pongdang',$3,false,'common','{"kind":"fish"}',12,4.5,'bait',(date_trunc('day',statement_timestamp() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul')+$4::interval,statement_timestamp()+interval '1 hour',case when $5 then statement_timestamp() else null end)`,
      [id, op, bait, offset, done],
    )
  if (done)
    await db.query(
      `insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,created_at) values($1,$2,'pongdang',$3,$4,statement_timestamp()-interval '1 millisecond')`,
      [id, op, bait, rarity],
    )
  return op
}
it('denies anonymous access and returns an empty, caller-only Korean calendar day without wallet writes', async () => {
  await db.exec('set role anon')
  await expect(db.query('select public.today_fishing_records()')).rejects.toThrow(
    /permission denied/,
  )
  await db.exec('reset role')
  await expect(read('')).rejects.toThrow('AUTH_REQUIRED')
  const data = await read()
  expect(data.totalCasts).toBe(0)
  expect(data.baits).toEqual([])
  expect(data.rarities).toEqual({ common: 0, rare: 0, epic: 0, mythic: 0 })
  expect(new Date(data.nextResetAt).getUTCHours()).toBe(15)
  expect(new Date(data.nextResetAt).getTime() - Date.parse(data.serverNow)).toBeGreaterThan(0)
})
it('deduplicates casts and results, includes failed bait use, and excludes other users and yesterday starts', async () => {
  await db.exec('begin')
  try {
    for (const rarity of ['mythic', 'epic', 'rare', 'common']) await cast({ rarity })
    await cast({ bait: 'bait_shell_crumbs' })
    await cast({ done: false, bait: 'bait_shell_crumbs' })
    await cast({ prepared: false })
    await cast({ id: other, rarity: 'mythic' })
    await cast({ rarity: 'mythic', offset: '-1 millisecond' })
    const data = await read()
    expect(data.totalCasts).toBe(7)
    expect(data.caughtCount).toBe(4)
    expect(data.failedCount).toBe(2)
    expect(data.unfinishedCount).toBe(1)
    expect(data.rarities).toEqual({ mythic: 1, epic: 1, rare: 1, common: 1 })
    expect(data.baits.map((b: { id: string; used: number }) => [b.id, b.used])).toEqual([
      ['bait', 5],
      ['bait_shell_crumbs', 2],
    ])
    expect(data.baits[0].imagePath).toBe('/items/baits/pongdang-worm.png')
    expect((await read(other)).totalCasts).toBe(1)
  } finally {
    await db.exec('rollback')
  }
})
it('counts an unfinished cast once and reveals no planned rarity until a result exists', async () => {
  await db.exec('begin')
  try {
    const op = await cast({ done: false, offset: '0 seconds' })
    await db.query(
      "update app_private.prepared_fishing_casts set rarity='mythic' where user_id=$1 and operation_id=$2",
      [user, op],
    )
    expect((await read()).rarities.mythic).toBe(0)
    await db.query(
      "insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity) values($1,$2,'pongdang','bait','mythic')",
      [user, op],
    )
    const data = await read()
    expect(data.totalCasts).toBe(1)
    expect(data.unfinishedCount).toBe(0)
    expect(data.rarities.mythic).toBe(1)
    expect((await read()).totalCasts).toBe(1)
  } finally {
    await db.exec('rollback')
  }
})
