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
const buy = (id: string, price: number, qty = 1, op = crypto.randomUUID()) =>
  call("select public.trade_island('buy',$1,$2,$3,$4) s", [id, qty, price, op])
const act = (
  action: string,
  item: string,
  kind = '',
  price = 0,
  qty = 1,
  op = crypto.randomUUID(),
) => call('select public.farm_action($1,$2,$3,$4,$5,$6) s', [action, item, kind, qty, price, op])
const save = (doc: unknown, revision: number) =>
  call('select public.save_my_island($1,$2,$3) s', [doc, revision, crypto.randomUUID()])
async function ready(table: 'farm_crop_jobs' | 'farm_animal_jobs') {
  const stamp = table === 'farm_crop_jobs' ? 'planted_at' : 'fed_at'
  await db.query(
    `update app_private.${table} set ${stamp}=now()-interval '1 day',ready_at=now()-interval '1 second' where user_id=$1`,
    [uid],
  )
}
async function plot() {
  return (await state()).items.find((i: any) => i.type === 'farm-plot').id
}
it('starts with five crops, three livestock types, three buildings and only white-fence decoration', async () => {
  const s = await state()
  expect(s.farm.crops).toHaveLength(5)
  expect(s.farm.animalTypes).toHaveLength(3)
  expect(s.farm.buildings).toHaveLength(3)
  expect(s.farm).toMatchObject({
    plotLimit: 4,
    storeCapacity: 20,
    animalLimit: 0,
    inventory: {},
    cropJobs: [],
    animalJobs: [],
  })
  expect(s.items.filter((i: any) => i.type === 'farm-white-fence')).toHaveLength(4)
  expect(
    s.catalog
      .filter((i: any) => i.family === 'decoration')
      .map((i: any) => i.id)
      .sort(),
  ).toEqual([
    'farm-barn',
    'farm-chicken',
    'farm-cow',
    'farm-office',
    'farm-plot',
    'farm-sheep',
    'farm-store',
    'farm-white-fence',
  ])
})
it('plants and harvests using server time and replays each operation without another charge or yield', async () => {
  const id = await plot(),
    plantOp = crypto.randomUUID(),
    harvestOp = crypto.randomUUID()
  const planted = await act('plant', id, 'carrot', 3, 1, plantOp)
  expect(planted.wallet.gold).toBe(99997)
  expect((await act('plant', id, 'carrot', 3, 1, plantOp)).receipt.applied).toBe(false)
  expect((await state()).farm.cropJobs).toHaveLength(1)
  await reject(
    'select public.farm_action($1,$2,$3,1,0,$4) s',
    ['harvest', id, '', crypto.randomUUID()],
    'FARM_NOT_READY',
  )
  await ready('farm_crop_jobs')
  const harvested = await act('harvest', id, '', 0, 1, harvestOp)
  expect(harvested.island.farm.inventory.carrot).toBe(3)
  expect(harvested.island.farm.cropJobs).toHaveLength(0)
  expect((await act('harvest', id, '', 0, 1, harvestOp)).island.farm.inventory.carrot).toBe(3)
})
it('preserves a ready crop while storage is full and unlocks capacity through warehouse upgrades', async () => {
  const id = await plot()
  await act('plant', id, 'carrot', 3)
  await ready('farm_crop_jobs')
  await db.query(
    "update app_private.player_islands set farm_inventory='{" +
      '"carrot":20' +
      "}' where user_id=$1",
    [uid],
  )
  await reject(
    'select public.farm_action($1,$2,$3,1,0,$4) s',
    ['harvest', id, '', crypto.randomUUID()],
    'FARM_STORAGE_FULL',
  )
  expect((await state()).farm.cropJobs).toHaveLength(1)
  const op = crypto.randomUUID(),
    built = await buy('farm-store', 2500, 1, op)
  expect(built.island.farm.storeCapacity).toBe(100)
  expect((await buy('farm-store', 2500, 1, op)).wallet.gold).toBe(built.wallet.gold)
  expect((await act('harvest', id)).island.farm.inventory.carrot).toBe(23)
  const upgraded = await buy('farm-store', 5000)
  expect(upgraded.island.farm.storeCapacity).toBe(250)
  expect(upgraded.island.items.filter((i: any) => i.type === 'farm-store')).toHaveLength(1)
})
it('requires a barn, enforces animal limits and supports four rotations of buildings and animals', async () => {
  await state()
  await reject(
    "select public.trade_island('buy','farm-chicken',1,300,$1) s",
    [crypto.randomUUID()],
    'FARM_BARN_REQUIRED',
  )
  await buy('farm-barn', 3000)
  const first = await state(),
    doc = structuredClone(first.document)
  for (const [id, price, x, y, rotation] of [
    ['farm-cow', 800, 23, 16, 90],
    ['farm-sheep', 600, 24, 20, 180],
    ['farm-chicken', 300, 22, 20, 270],
    ['farm-chicken', 300, 25, 20, 0],
  ] as const) {
    const r = await buy(id, price)
    doc.layout.push({ id: r.receipt.itemIds[0], x, y, rotation })
  }
  await reject(
    'select public.save_my_island($1,0,$2) s',
    [doc, crypto.randomUUID()],
    'FARM_ANIMAL_LIMIT:3',
  )
  await buy('farm-barn', 6000)
  await save(doc, 0)
  expect((await state()).farm.animalLimit).toBe(5)
  const office = await buy('farm-office', 5000),
    store = await buy('farm-store', 2500)
  doc.layout.push(
    { id: office.receipt.itemIds[0], x: 14, y: 12, rotation: 90 },
    { id: store.receipt.itemIds[0], x: 21, y: 12, rotation: 270 },
  )
  await save(doc, 1)
  expect((await state()).document.layout.some((p: any) => p.rotation === 270)).toBe(true)
})
it('consumes feed once and collects dairy output once', async () => {
  const id = await plot()
  await act('plant', id, 'wheat', 5)
  await ready('farm_crop_jobs')
  await act('harvest', id)
  await buy('farm-barn', 3000)
  const cow = await buy('farm-cow', 800),
    cowId = cow.receipt.itemIds[0]
  const current = await state()
  await save(
    {
      ...current.document,
      layout: [...current.document.layout, { id: cowId, x: 23, y: 16, rotation: 0 }],
    },
    current.revision,
  )
  const feedOp = crypto.randomUUID(),
    fed = await act('feed', cowId, 'wheat', 0, 1, feedOp)
  expect(fed.island.farm.inventory.wheat).toBe(1)
  expect((await act('feed', cowId, 'wheat', 0, 1, feedOp)).island.farm.inventory.wheat).toBe(1)
  await ready('farm_animal_jobs')
  const collectOp = crypto.randomUUID(),
    collected = await act('collect', cowId, '', 0, 1, collectOp)
  expect(collected.island.farm.inventory.milk).toBe(1)
  expect((await act('collect', cowId, '', 0, 1, collectOp)).island.farm.inventory.milk).toBe(1)
})
it('keeps growing plots in place and checks product prices, stock and wallet capacity', async () => {
  const id = await plot()
  await act('plant', id, 'potato', 8)
  const s = await state()
  await reject(
    'select public.save_my_island($1,0,$2) s',
    [
      { ...s.document, layout: s.document.layout.filter((p: any) => p.id !== id) },
      crypto.randomUUID(),
    ],
    'FARM_CROP_ACTIVE',
  )
  await ready('farm_crop_jobs')
  await act('harvest', id)
  await reject(
    'select public.farm_action($1,$2,$3,3,0,$4) s',
    ['sell', 'potato', '', crypto.randomUUID()],
    'ISLAND_PRICE_CHANGED',
  )
  const op = crypto.randomUUID(),
    sold = await act('sell', 'potato', '', 10, 3, op)
  expect(sold.island.farm.inventory.potato).toBe(0)
  expect(sold.wallet.gold).toBe(100022)
  expect((await act('sell', 'potato', '', 10, 3, op)).wallet.gold).toBe(100022)
  await reject(
    'select public.farm_action($1,$2,$3,1,10,$4) s',
    ['sell', 'potato', '', crypto.randomUUID()],
    'FARM_INVENTORY_REQUIRED',
  )
})
it('blocks nonoperators, foreign plots and direct access to production jobs', async () => {
  const id = await plot(),
    other = crypto.randomUUID()
  await db.query('insert into auth.users(id) values($1)', [other])
  await db.query('insert into app_private.notice_operators(user_id) values($1)', [other])
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [other])
  expect((await state()).farm.cropJobs).toEqual([])
  await reject(
    'select public.farm_action($1,$2,$3,1,3,$4) s',
    ['plant', id, 'carrot', crypto.randomUUID()],
    'ISLAND_ITEM_NOT_OWNED',
  )
  await reject('select * from app_private.farm_crop_jobs', [], 'permission denied')
  await db.query('delete from app_private.notice_operators where user_id=$1', [other])
  await reject(
    'select public.farm_action($1,$2,$3,1,3,$4) s',
    ['plant', id, 'carrot', crypto.randomUUID()],
    'FARM_PREPARING',
  )
  await db.exec('savepoint anonymous;set role anon')
  await expect(
    db.exec("select public.farm_action('plant','fake','carrot',1,3,gen_random_uuid())"),
  ).rejects.toThrow('permission denied')
  await db.exec('rollback to anonymous;reset role;release savepoint anonymous')
})
