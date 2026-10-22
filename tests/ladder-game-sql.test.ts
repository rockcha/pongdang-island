// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest'
import { ladderRoute, ladderModes } from '@/features/arcade/ladder-model'
const db = new PGlite(),
  uid = '00000000-0000-0000-0000-000000000001'
async function as(role: string, sql: string, args: unknown[] = []) {
  await db.exec('set role ' + role)
  try {
    return await db.query(sql, args)
  } finally {
    await db.exec('reset role')
  }
}
async function play(op = crypto.randomUUID(), mode = 'calm', stake = 100, choice = 0) {
  const { rows } = await as(
    'authenticated',
    "select public.ladder_game('play',$1,$2,$3,$4) result",
    [op, mode, stake, choice],
  )
  return (
    rows[0].result as {
      run: {
        id: string
        bridges: number[]
        payouts: number[]
        destination: number
        reward: number
        choice: number
      }
    }
  ).run
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema app_private;
    create table auth.users(id uuid primary key); insert into auth.users values('${uid}');
    create function auth.uid() returns uuid language sql stable as $$select '${uid}'::uuid$$;
    grant usage on schema auth,app_private to authenticated;
    create table public.player_wallets(user_id uuid primary key,gold integer,updated_at timestamptz);
    create table public.player_profiles(id uuid primary key,nickname text);
    create table public.gold_transactions(user_id uuid,operation_id uuid,action text,item_id text,delta integer,primary key(user_id,operation_id));
    create function app_private.get_gold_wallet() returns void language sql as $$select$$;`)
  await db.exec(await readFile('supabase/migrations/20261020113640_ladder_arcade_game.sql', 'utf8'))
  await db.exec(
    await readFile('supabase/migrations/20261021183627_ladder_five_modes_six_lanes.sql', 'utf8'),
  )
}, 30000)
beforeEach(async () => {
  await db.exec(
    `truncate app_private.ladder_runs,public.player_wallets,public.gold_transactions; insert into public.player_wallets values('${uid}',1000,now())`,
  )
})
afterAll(() => db.close())
it.each(
  Object.keys(ladderModes).flatMap((mode) =>
    Array.from({ length: 6 }, (_, choice) => [mode, choice] as const),
  ),
)('settles %s lane %i atomically with a route matching the server payout', async (mode, choice) => {
  const run = await play(undefined, mode, 100, choice)
  expect(run.payouts).toHaveLength(6)
  expect(run.payouts.reduce((a, b) => a + b, 0)).toBe(600)
  expect(ladderRoute(run.choice, run.bridges).destination).toBe(run.destination)
  expect(run.payouts.toSorted((a, b) => a - b)).toEqual([
    ...ladderModes[mode as keyof typeof ladderModes].payouts,
  ])
  expect(run.reward).toBe(run.payouts[run.destination])
  expect((await db.query('select gold from public.player_wallets')).rows[0].gold).toBe(
    900 + run.reward,
  )
  expect(
    (await db.query('select sum(delta)::int delta from public.gold_transactions')).rows[0].delta,
  ).toBe(run.reward - 100)
  expect('user_id' in run).toBe(false)
})
it('retries the exact same operation without another deduction or random outcome', async () => {
  const op = crypto.randomUUID(),
    first = await play(op)
  expect(await play(op)).toEqual(first)
  expect((await db.query('select count(*)::int n from app_private.ladder_runs')).rows[0].n).toBe(1)
  await expect(play(op, 'storm')).rejects.toThrow('OPERATION_CONFLICT')
})
it('rejects invalid bets and insufficient funds without changing any balance', async () => {
  await expect(play(undefined, 'calm', 21)).rejects.toThrow('INVALID_LADDER_REQUEST')
  await expect(play(undefined, 'calm', 100, 6)).rejects.toThrow('INVALID_LADDER_REQUEST')
  await db.exec('update public.player_wallets set gold=19')
  await expect(play(undefined, 'calm', 20)).rejects.toThrow('INSUFFICIENT_GOLD')
  expect((await db.query('select count(*)::int n from app_private.ladder_runs')).rows[0].n).toBe(0)
  expect((await db.query('select gold from public.player_wallets')).rows[0].gold).toBe(19)
})
it('returns old four-lane receipts unchanged without settling again', async () => {
  const op = crypto.randomUUID()
  await db.query(
    `insert into app_private.ladder_runs(user_id,operation_id,mode,stake,choice,bridges,payouts,destination,reward)
    values($1,$2,'wave',100,3,array_fill(-1,array[12]),array[0,50,150,200],3,200)`,
    [uid, op],
  )
  await db.exec('update public.player_wallets set gold=1100')
  const run = await play(op, 'wave', 100, 3)
  expect(run.payouts).toEqual([0, 50, 150, 200])
  expect(run.reward).toBe(200)
  expect((await db.query('select gold from public.player_wallets')).rows[0].gold).toBe(1100)
  expect((await db.query('select count(*)::int n from public.gold_transactions')).rows[0].n).toBe(0)
})
it('blocks anonymous play and direct access to outcomes', async () => {
  await expect(as('anon', "select public.ladder_game('state')")).rejects.toThrow()
  await expect(as('authenticated', 'select * from app_private.ladder_runs')).rejects.toThrow()
  await expect(as('authenticated', 'update public.player_wallets set gold=9999')).rejects.toThrow()
  const run = await play()
  const response = await as('authenticated', "select public.ladder_game('state') result")
  expect((response.rows[0].result as { run: { id: string } }).run.id).toBe(run.id)
  const ranks = await as('authenticated', 'select public.ladder_leaderboard(0) result')
  expect((ranks.rows[0].result as { rows: unknown[] }).rows.length).toBe(run.reward > 0 ? 1 : 0)
})
