// @vitest-environment node
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db: any, uid: string
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
}, 60000)
afterAll(async () => {
  await db?.close()
})
beforeEach(async () => {
  await db.exec('begin')
  uid = crypto.randomUUID()
  await db.query('insert into auth.users(id) values($1)', [uid])
  await db.query('insert into app_private.notice_operators(user_id) values($1)', [uid])
  await db.query(
    'insert into public.player_wallets(user_id,gold) values($1,100000) on conflict(user_id) do update set gold=100000',
    [uid],
  )
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid])
})
afterEach(async () => {
  await db.exec('rollback;reset role')
})
async function call(sql: string, args: unknown[] = []) {
  await db.exec('set role authenticated')
  const result = (await db.query(sql, args)).rows[0]?.s
  await db.exec('reset role')
  return result
}
async function reject(sql: string, args: unknown[], message: string) {
  await db.exec('savepoint rejected')
  try {
    await expect(call(sql, args)).rejects.toThrow(message)
  } finally {
    await db.exec('rollback to rejected;reset role;release savepoint rejected')
  }
}
const state = () => call('select public.my_island_state() s')
const buy = (id: string, quantity: number, price: number, op = crypto.randomUUID()) =>
  call("select public.trade_island('buy',$1,$2,$3,$4) s", [id, quantity, price, op])
const save = (doc: unknown, revision: number) =>
  call('select public.save_my_island($1,$2,$3) s', [doc, revision, crypto.randomUUID()])
it('charges the exact five prices, keeps one office, expands all limits and replays once', async () => {
  expect((await state()).farm).toMatchObject({ officeLevel: 0, plotLimit: 4, nextCost: 5000 })
  let id = ''
  for (const [i, cost] of [5000, 10000, 15000, 20000, 25000].entries()) {
    const op = crypto.randomUUID(),
      result = await buy('farm-office', 1, cost, op),
      retry = await buy('farm-office', 1, cost, op)
    expect(result.island.farm).toMatchObject({
      officeLevel: i + 1,
      plotLimit: [9, 16, 25, 36, 49][i],
      nextCost: i === 4 ? null : cost + 5000,
    })
    const offices = result.island.items.filter((item: any) => item.type === 'farm-office')
    expect(offices).toHaveLength(1)
    if (i === 0) id = offices[0].id
    expect(offices[0].id).toBe(id)
    expect(retry.wallet.gold).toBe(result.wallet.gold)
    expect(retry.receipt.applied).toBe(false)
  }
  expect((await call('select public.get_gold_wallet() s')).gold).toBe(25000)
  await reject(
    "select public.trade_island('buy','farm-office',1,30000,$1) s",
    [crypto.randomUUID()],
    'FARM_OFFICE_MAX_LEVEL',
  )
  await reject(
    "select public.trade_island('sell',$1,1,0,$2) s",
    [id, crypto.randomUUID()],
    'FARM_OFFICE_NOT_SELLABLE',
  )
})
it('enforces placed plot limits on the server and permits moving or recovering plots without losing upgrades', async () => {
  const first = await state(),
    bought = await buy('farm-plot', 6, 10),
    extra = bought.receipt.itemIds
  const doc = structuredClone(first.document)
  doc.layout.push({ id: extra[0], x: 14, y: 13 })
  await reject(
    'select public.save_my_island($1,0,$2) s',
    [{ ...doc, farm_office_level: 5 }, crypto.randomUUID()],
    'FARM_PLOT_LIMIT:4',
  )
  await buy('farm-office', 1, 5000)
  for (let n = 1; n < 6; n++) doc.layout.push({ id: extra[n], x: 14 + n, y: 13 })
  await reject(
    'select public.save_my_island($1,0,$2) s',
    [doc, crypto.randomUUID()],
    'FARM_PLOT_LIMIT:9',
  )
  const nine = { ...doc, layout: doc.layout.slice(0, -1) }
  await save(nine, 0)
  const moved = structuredClone(nine)
  moved.layout.find((p: any) => p.id === extra[0]).y = 14
  await save(moved, 1)
  await buy('farm-office', 1, 10000)
  const ten = { ...moved, layout: [...moved.layout, { id: extra[5], x: 19, y: 13 }] }
  await save(ten, 2)
  const recovered = { ...ten, layout: ten.layout.filter((p: any) => p.id !== extra[0]) }
  await save(recovered, 3)
  expect((await state()).farm).toMatchObject({ officeLevel: 2, plotLimit: 16 })
  expect((await state()).items.filter((i: any) => i.type === 'farm-plot')).toHaveLength(10)
})
it('rejects forged prices, multiple offices, stale quotes, insufficient gold and nonoperators', async () => {
  await state()
  await reject(
    "select public.trade_island('buy','farm-office',1,0,$1) s",
    [crypto.randomUUID()],
    'ISLAND_PRICE_CHANGED',
  )
  await reject(
    "select public.trade_island('buy','farm-office',2,5000,$1) s",
    [crypto.randomUUID()],
    'INVALID_ISLAND_OPERATION',
  )
  await buy('farm-office', 1, 5000)
  await reject(
    "select public.trade_island('buy','farm-office',1,5000,$1) s",
    [crypto.randomUUID()],
    'ISLAND_PRICE_CHANGED',
  )
  await db.query('update public.player_wallets set gold=1 where user_id=$1', [uid])
  await reject(
    "select public.trade_island('buy','farm-office',1,10000,$1) s",
    [crypto.randomUUID()],
    'INSUFFICIENT_GOLD',
  )
  expect((await state()).farm.officeLevel).toBe(1)
  await db.query('delete from app_private.notice_operators where user_id=$1', [uid])
  await reject(
    "select public.trade_island('buy','farm-office',1,10000,$1) s",
    [crypto.randomUUID()],
    'FARM_PREPARING',
  )
})
