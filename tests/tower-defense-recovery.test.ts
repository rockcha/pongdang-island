// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { recoveryPlayer, recoverySql } from '../scripts/db/tower-defense-recovery.mjs'

let db: PGlite
const run = {
  id: '00000000-0000-4000-8000-000000000001',
  user_id: recoveryPlayer,
  operation_id: '00000000-0000-4000-8000-000000000002',
  finished_at: null,
  reward: 10,
  cleared_stage: 1,
  replay: { version: 1, ticks: 461, commands: [] },
}
beforeEach(async () => {
  db = new PGlite()
  await db.exec(`create schema app_private;
    create table public.player_wallets(user_id uuid primary key,gold integer check(gold between 0 and 1000000000),updated_at timestamptz);
    create table public.gold_transactions(user_id uuid,operation_id uuid,action text check(action in('charge','buy','sell')),item_id text,delta integer,primary key(user_id,operation_id));
    create table app_private.tower_defense_runs(id uuid primary key,user_id uuid,operation_id uuid,finished_at timestamptz,abandoned boolean default false,reward integer,cleared_stage integer,replay jsonb);
    insert into public.player_wallets values('${recoveryPlayer}',100,now());
    insert into public.gold_transactions values('${recoveryPlayer}','${run.operation_id}','buy','arcade:tower-defense:entry',-30);
    insert into app_private.tower_defense_runs(id,user_id,operation_id,reward,cleared_stage,replay)
      values('${run.id}','${recoveryPlayer}','${run.operation_id}',10,1,'${JSON.stringify(run.replay)}');`)
})
afterEach(async () => {
  await db.close()
})

it('preserves history and rewards, closes only the inspected run and refunds the fee once', async () => {
  await db.exec(`insert into app_private.tower_defense_runs(id,user_id,reward,cleared_stage,replay)
    values('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004',0,0,'{}')`)
  await db.exec(recoverySql(run))
  await db.exec(recoverySql(run))
  const rows = (await db.query<any>('select * from app_private.tower_defense_runs order by id'))
    .rows
  expect(rows).toHaveLength(2)
  expect(rows[0]).toMatchObject({
    abandoned: true,
    reward: 10,
    cleared_stage: 1,
    replay: run.replay,
  })
  expect(rows[0].finished_at).not.toBeNull()
  expect(rows[1].finished_at).toBeNull()
  expect((await db.query('select gold from public.player_wallets')).rows).toEqual([{ gold: 130 }])
  expect(
    (await db.query('select delta from public.gold_transactions order by delta')).rows,
  ).toEqual([{ delta: -30 }, { delta: 30 }])
})

it.each([
  [
    `update app_private.tower_defense_runs set replay='{"version":1,"ticks":462,"commands":[]}'`,
    'RUN_CHANGED_SINCE_INSPECTION',
  ],
  [`update app_private.tower_defense_runs set finished_at=now()`, 'RUN_CHANGED_SINCE_INSPECTION'],
  ['delete from public.gold_transactions', 'ENTRY_PAYMENT_NOT_FOUND'],
  ['update public.player_wallets set gold=999999980', 'GOLD_LIMIT'],
])(
  'rolls back if the inspected state or entry payment cannot be confirmed: %s',
  async (setup, message) => {
    await db.exec(setup)
    await expect(db.exec(recoverySql(run))).rejects.toThrow(message)
    await db.exec('rollback')
    expect(
      (await db.query<any>('select abandoned from app_private.tower_defense_runs')).rows[0]
        .abandoned,
    ).toBe(false)
    expect(
      (await db.query('select delta from public.gold_transactions where delta=30')).rows,
    ).toEqual([])
  },
)

it('refuses a different account before constructing SQL', () => {
  expect(() => recoverySql({ ...run, user_id: '00000000-0000-4000-8000-000000000004' })).toThrow()
})
