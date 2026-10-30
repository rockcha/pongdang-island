// @vitest-environment node
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest'
import { createLocalDatabase, migrationFiles } from '../scripts/db/local.mjs'
import {villageDecorations} from '@/features/my-island/village-decoration-catalog'
import {readFileSync} from 'node:fs'
let db: any
const uid = '00000000-0000-0000-0000-000000009801',
  other = '00000000-0000-0000-0000-000000009802'
beforeAll(async () => {
  db = await createLocalDatabase()
  // Historical island commerce; current farm-only catalog is covered by isometric-farm-sql.test.ts.
  for(const file of migrationFiles().filter(file=>file<'20261030053506'))await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
}, 60000)
afterAll(async () => {
  await db?.close()
})
const owner = async (work: () => Promise<any>) => {
  await db.exec('reset role')
  try {
    return await work()
  } finally {
    await db.exec('set role authenticated')
  }
}
const state = async () => (await db.query('select public.my_island_state() s')).rows[0].s
const wallet = async () => (await db.query('select public.get_gold_wallet() s')).rows[0].s
const trade = async (
  action: string,
  item: string,
  quantity: number,
  price: number,
  id = crypto.randomUUID(),
) =>
  (
    await db.query('select public.trade_island($1,$2,$3,$4,$5) s', [
      action,
      item,
      quantity,
      price,
      id,
    ])
  ).rows[0].s
const save = async (document: any, revision: number, id = crypto.randomUUID()) =>
  (await db.query('select public.save_my_island($1,$2,$3) s', [document, revision, id])).rows[0].s
beforeEach(async () => {
  await db.exec('reset role')
  await db.query('delete from auth.users where id=any($1::uuid[])', [[uid, other]])
  await db.query('insert into auth.users(id) values($1),($2)', [uid, other])
  await db.query(
    'insert into public.player_wallets(user_id,gold) values($1,10000),($2,10000) on conflict(user_id) do update set gold=10000',
    [uid, other],
  )
  await db.query('insert into app_private.notice_operators(user_id) values($1),($2)',[uid,other])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid])
  await db.exec('set role authenticated')
})
it('initializes fixed gifts exactly once and accepts its starter geometry without minting gold', async () => {
  const first = await state(),
    again = await state()
  expect(first.items).toHaveLength(6)
  expect(first.items.filter((i:any)=>i.type==='farm-plot')).toHaveLength(4)
  expect(first.document.layout).toHaveLength(6)
  expect(first.document.paving).toEqual([])
  expect(again.items).toEqual(first.items)
  expect(first.stocks['land-piece']).toBe(164)
  expect((await wallet()).gold).toBe(10000)
  const result = await save(first.document, first.revision)
  expect(result.island.document).toEqual(first.document)
  expect(result.island.revision).toBe(1)
  expect(result.island.items).toEqual(first.items)
})
it('charges the catalog price and grants each purchased structure once across retries', async () => {
  const before = await state(),
    item = before.catalog.find((c: any) => c.id === 'bench'),
    id = crypto.randomUUID()
  const first = await trade('buy', item.id, 3, item.price, id),
    retry = await trade('buy', item.id, 3, item.price, id)
  expect(first.wallet.gold).toBe(10000 - item.price * 3)
  expect(first.island.items).toHaveLength(9)
  expect(first.receipt.itemIds).toHaveLength(3)
  expect(retry.wallet.gold).toBe(first.wallet.gold)
  expect(retry.receipt.applied).toBe(false)
  expect(retry.receipt.itemIds).toEqual(first.receipt.itemIds)
  expect(retry.island.items).toEqual(first.island.items)
  await expect(trade('buy', item.id, 2, item.price, id)).rejects.toThrow('OPERATION_CONFLICT')
  expect(
    await owner(
      async () =>
        (
          await db.query(
            'select count(*) n from public.gold_transactions where user_id=$1 and operation_id=$2',
            [uid, id],
          )
        ).rows[0].n,
    ),
  ).toBe(1)
})
it('rejects stale prices, bad quantities and insufficient funds without changing stock', async () => {
  const before = await state(),
    item = before.catalog.find((c: any) => c.id === 'bench')
  await expect(trade('buy', 'bench', 1, item.price + 1)).rejects.toThrow('ISLAND_PRICE_CHANGED')
  await expect(trade('buy', 'bench', 0, item.price)).rejects.toThrow('INVALID_ISLAND_OPERATION')
  await expect(trade('buy', 'bench', 101, item.price)).rejects.toThrow('INVALID_ISLAND_OPERATION')
  await owner(() => db.query('update public.player_wallets set gold=0 where user_id=$1', [uid]))
  await expect(trade('buy', 'bench', 1, item.price)).rejects.toThrow('INSUFFICIENT_GOLD')
  expect((await state()).items).toEqual(before.items)
})
it('buys floors and land as total stock, preserving placed materials across saves', async () => {
  const first = await state()
  await trade('buy', 'land-piece', 5, 50)
  const floor = first.catalog.find((c: any) => c.id === 'floor-brick')
  const bought = await trade('buy', 'floor-brick', 3, floor.price)
  expect(bought.island.stocks['land-piece']).toBe(169)
  expect(bought.island.stocks['floor-brick']).toBe(3)
  const document = structuredClone(first.document)
  document.land.push({ x: 5, y: 3 })
  document.paving.push({ x: 5, y: 3, type: 'brick' })
  const saved = await save(document, 0)
  expect(saved.island.stocks['land-piece']).toBe(169)
  expect(saved.island.stocks['floor-brick']).toBe(3)
  expect(saved.island.document.land).toContainEqual({ x: 5, y: 3 })
})
it('rejects fabricated ownership, material counts and duplicate cells', async () => {
  const first = await state(),
    fake = structuredClone(first.document)
  fake.layout.push({ id: 'bench~fabricated', x: 13, y: 12 })
  await expect(save(fake, 0)).rejects.toThrow('ISLAND_ITEM_NOT_OWNED')
  const land = structuredClone(first.document)
  land.land.push({ x: 5, y: 3 })
  await expect(save(land, 0)).rejects.toThrow('ISLAND_STOCK_REQUIRED')
  const floor = structuredClone(first.document)
  floor.paving.push({ x: 13, y: 12, type: 'brick' })
  await expect(save(floor, 0)).rejects.toThrow('ISLAND_STOCK_REQUIRED')
  const duplicate = structuredClone(first.document)
  duplicate.removedLand.push(duplicate.removedLand[0])
  await expect(save(duplicate, 0)).rejects.toThrow('INVALID_ISLAND_LAYOUT')
  expect((await state()).revision).toBe(0)
})
it('validates water, rotation, text and overlapping footprints', async () => {
  const first = await state(),
    water = structuredClone(first.document),
    waterProduct = first.catalog.find(
      (c: any) => c.family === 'decoration' && c.terrain === 'water',
    )
  const waterItem = await trade('buy', waterProduct.id, 1, waterProduct.price)
  water.layout.push({ id: waterItem.receipt.itemIds[0], x: 13, y: 12 })
  await expect(save(water, 0)).rejects.toThrow('INVALID_ISLAND_TERRAIN')
  const rotation = structuredClone(first.document)
  rotation.layout.find((p: any) => p.id.startsWith('farm-plot~')).rotation = 45
  await expect(save(rotation, 0)).rejects.toThrow('INVALID_ISLAND_ROTATION')
  const overlap = structuredClone(first.document),
    trees = overlap.layout.filter((p: any) => p.id.startsWith('farm-plot~'))
  trees[1].x = trees[0].x
  trees[1].y = trees[0].y
  await expect(save(overlap, 0)).rejects.toThrow('ISLAND_PLACEMENT_OVERLAP')
  const sign = first.catalog.find((c: any) => c.text_label),
    bought = await trade('buy', sign.id, 1, sign.price),
    labels = structuredClone(first.document)
  labels.signLabels[bought.receipt.itemIds[0]] = '1234567'
  await expect(save(labels, 0)).rejects.toThrow('INVALID_ISLAND_LABEL')
})
it('keeps saves idempotent and prevents a stale device from overwriting a newer layout', async () => {
  const first = await state(),
    id = crypto.randomUUID()
  const a = await save(first.document, 0, id),
    b = await save(first.document, 0, id)
  expect(a.island.revision).toBe(1)
  expect(b.island.revision).toBe(1)
  expect(b.receipt.applied).toBe(false)
  await expect(save(first.document, 0)).rejects.toThrow('ISLAND_REVISION_CHANGED')
  await expect(save({ ...first.document, layout: [] }, 0, id)).rejects.toThrow('OPERATION_CONFLICT')
})
it('refunds only a paid item once and removes its placement atomically', async () => {
  const first = await state(),
    item = first.catalog.find((c: any) => c.id === 'bench'),
    bought = await trade('buy', 'bench', 1, item.price),
    instance = bought.receipt.itemIds[0]
  const document = structuredClone(first.document)
  document.layout.push({ id: instance, x: 13, y: 12 })
  await save(document, 0)
  const id = crypto.randomUUID(),
    sold = await trade('sell', instance, 1, Math.floor(item.price * 0.7), id),
    retry = await trade('sell', instance, 1, Math.floor(item.price * 0.7), id)
  expect(sold.wallet.gold).toBe(10000 - item.price + Math.floor(item.price * 0.7))
  expect(retry.wallet.gold).toBe(sold.wallet.gold)
  expect(sold.island.items.some((i: any) => i.id === instance)).toBe(false)
  expect(sold.island.document.layout.some((p: any) => p.id === instance)).toBe(false)
  await expect(save(document, sold.island.revision)).rejects.toThrow('ISLAND_ITEM_NOT_OWNED')
})
it('does not turn starter gifts or layout reset into cash or new ownership', async () => {
  const first = await state()
  await expect(trade('sell', first.items[0].id, 1, 0)).rejects.toThrow(
    'ISLAND_STARTER_NOT_FOR_SALE',
  )
  const reset = {
    ...first.document,
    layout: first.document.layout.filter((p: any) => p.id.includes('~owned:')),
    paving: [],
  }
  const saved = await save(
    { ...reset, coins: 999999999, owned: ['bench~fake'], landStock: 9999 },
    0,
  )
  expect((await wallet()).gold).toBe(10000)
  expect(saved.island.items).toEqual(first.items)
  expect(saved.island.document).not.toHaveProperty('coins')
  expect(saved.island.stocks).toEqual(first.stocks)
})
it('enforces whole-quantity capacity and rolls back a failed sale at the wallet limit', async () => {
  const first = await state(),
    item = first.catalog.find((c: any) => c.id === 'bench')
  await owner(() =>
    db.query(
      "insert into app_private.player_island_items(user_id,id,item_id,sale_value) select $1,'bench~capacity-'||i,'bench',1 from generate_series(1,294)i",
      [uid],
    ),
  )
  await expect(trade('buy', 'bench', 3, item.price)).rejects.toThrow('ISLAND_INVENTORY_LIMIT')
  expect((await wallet()).gold).toBe(10000)
  await owner(() =>
    db.query('update public.player_wallets set gold=1000000000 where user_id=$1', [uid]),
  )
  await expect(trade('sell', 'bench~capacity-1', 1, 1)).rejects.toThrow('GOLD_LIMIT')
  expect((await state()).items.some((i: any) => i.id === 'bench~capacity-1')).toBe(true)
})
it('isolates accounts and rejects anonymous RPCs and direct ownership writes', async () => {
  const a = await state()
  await owner(() => db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]))
  const b = await state()
  expect(b.items.map((i: any) => i.id)).not.toEqual(a.items.map((i: any) => i.id))
  await expect(trade('sell', a.items[0].id, 1, 0)).rejects.toThrow('ISLAND_ITEM_NOT_OWNED')
  await expect(db.query('select * from app_private.player_islands')).rejects.toThrow(
    /permission denied/,
  )
  await expect(
    db.query(
      "insert into app_private.player_island_stocks(user_id,item_id,quantity) values($1,'land-piece',9999)",
      [other],
    ),
  ).rejects.toThrow(/permission denied/)
  await owner(() => db.query("select set_config('request.jwt.claim.sub','',false)"))
  await db.exec('reset role;set role anon')
  await expect(state()).rejects.toThrow(/permission denied/)
})
it('sells stored floor tiles for half the current price exactly once', async () => {
  const first = await state(),
    id = crypto.randomUUID()
  await trade('buy', 'floor-brick', 4, 20)
  const sold = await trade('sell', 'floor-brick', 3, 10, id),
    retry = await trade('sell', 'floor-brick', 3, 10, id)
  expect(sold.wallet.gold).toBe(9950)
  expect(sold.island.stocks['floor-brick']).toBe(1)
  expect(sold.island.document).toEqual(first.document)
  expect(retry.wallet.gold).toBe(9950)
  expect(retry.island.stocks['floor-brick']).toBe(1)
  expect(retry.receipt.applied).toBe(false)
  await expect(trade('sell', 'floor-brick', 1, 10, id)).rejects.toThrow('OPERATION_CONFLICT')
  await expect(trade('sell', 'floor-brick', 2, 10)).rejects.toThrow('ISLAND_STOCK_NOT_STORED')
  expect((await wallet()).gold).toBe(9950)
})
it('requires placing materials back in storage before selling them', async () => {
  const first = await state()
  await expect(trade('sell', 'land-piece', 1, 25)).rejects.toThrow('ISLAND_STOCK_NOT_STORED')
  await expect(trade('sell', 'floor-grass', 1, 5)).rejects.toThrow('ISLAND_STOCK_NOT_STORED')
  await trade('buy', 'floor-grass', 2, 10)
  const document = structuredClone(first.document)
  document.paving = [{x:13,y:12,type:'grass'},{x:14,y:12,type:'grass'}]
  await save(document, 0)
  await expect(trade('sell','floor-grass',1,5)).rejects.toThrow('ISLAND_STOCK_NOT_STORED')
  await save({...document,paving:[]},1)
  const sold = await trade('sell', 'floor-grass', 2, 5)
  expect(sold.wallet.gold).toBe(9990)
  expect(sold.island.stocks['floor-grass']).toBe(0)
  await expect(save(document, 2)).rejects.toThrow('ISLAND_STOCK_REQUIRED')
})
it('protects placed extension land and rejects old or forged material prices', async () => {
  const first = await state()
  await trade('buy', 'land-piece', 3, 50)
  const document = structuredClone(first.document)
  document.land.push({ x: 5, y: 3 })
  await save(document, 0)
  await expect(trade('sell', 'land-piece', 3, 25)).rejects.toThrow('ISLAND_STOCK_NOT_STORED')
  await expect(trade('sell', 'land-piece', 2, 50)).rejects.toThrow('ISLAND_PRICE_CHANGED')
  const sold = await trade('sell', 'land-piece', 2, 25)
  expect(sold.island.stocks['land-piece']).toBe(165)
  expect(sold.wallet.gold).toBe(9900)
  document.land.push({ x: 5, y: 4 })
  await expect(save(document, 1)).rejects.toThrow('ISLAND_STOCK_REQUIRED')
})
it('rolls back material stock deductions when the gold limit rejects a sale', async () => {
  await state()
  await trade('buy', 'land-piece', 2, 50)
  await owner(() =>
    db.query('update public.player_wallets set gold=1000000000 where user_id=$1', [uid]),
  )
  await expect(trade('sell', 'land-piece', 2, 25)).rejects.toThrow('GOLD_LIMIT')
  expect((await state()).stocks['land-piece']).toBe(166)
})
it('buys, places and sells every new village decoration and mosaic through the real SQL contracts',async()=>{
 const first=await state(),document=structuredClone(first.document),products=first.catalog
 document.layout=[];document.paving=[];let cost=0
 for(let i=0;i<villageDecorations.length;i++){
  const type=villageDecorations[i],price=products.find((p:any)=>p.id===type.id).price
  const result=await trade('buy',type.id,1,price);cost+=price
  document.layout.push({id:result.receipt.itemIds[0],x:14+i%4*3,y:12+Math.floor(i/4)*4,...(type.rotatable?{rotation:90}:{})})
 }
 const floors=['moonstone','star-mosaic','teal-glass','shell-mosaic']
 for(let i=0;i<floors.length;i++){
  const id='floor-'+floors[i],price=products.find((p:any)=>p.id===id).price
  await trade('buy',id,4,price);cost+=price*4
  for(let n=0;n<4;n++)document.paving.push({type:floors[i],x:14+i*3+n%2,y:20+Math.floor(n/2)})
 }
 const placed=await save(document,0);expect(placed.island.document.layout).toHaveLength(8);expect((await wallet()).gold).toBe(10000-cost)
 await expect(trade('sell','floor-teal-glass',1,15)).rejects.toThrow('ISLAND_STOCK_NOT_STORED')
 document.paving=document.paving.filter((_:any,i:number)=>i%4!==0);await save(document,1)
 let refund=0
 for(const floor of floors){const price=products.find((p:any)=>p.id==='floor-'+floor).price;refund+=price/2;const result=await trade('sell','floor-'+floor,1,price/2);expect(result.island.stocks['floor-'+floor]).toBe(3)}
 expect((await wallet()).gold).toBe(10000-cost+refund)
 for(const placement of document.layout){const item=(await state()).items.find((i:any)=>i.id===placement.id);await trade('sell',item.id,1,item.sellPrice)}
 expect((await state()).document.layout).toHaveLength(0)
})
it('charges ten gold per new plot exactly once and lets stored plots be placed again for free',async()=>{
 const first=await state(),operation=crypto.randomUUID()
 await trade('buy','farm-office',1,5000)
 await expect(trade('buy','farm-plot',2,0)).rejects.toThrow('ISLAND_PRICE_CHANGED')
 const bought=await trade('buy','farm-plot',2,10,operation)
 const retried=await trade('buy','farm-plot',2,10,operation)
 expect(bought.wallet.gold).toBe(4980)
 expect(retried.wallet.gold).toBe(4980)
 expect(retried.receipt.itemIds).toEqual(bought.receipt.itemIds)
 expect(bought.island.items.filter((i:any)=>i.type==='farm-plot')).toHaveLength(6)
 const document=structuredClone(first.document)
 const [one,two]=bought.receipt.itemIds
 document.layout.push({id:one,x:19,y:18},{id:two,x:20,y:18})
 const invalid=structuredClone(document);invalid.layout.at(-1).x=0
 await expect(save(invalid,0)).rejects.toThrow('INVALID_ISLAND_TERRAIN')
 await save(document,0)
 const stored={...document,layout:document.layout.filter((p:any)=>p.id!==one)}
 await save(stored,1)
 stored.layout.push({id:one,x:21,y:18})
 const replaced=await save(stored,2)
 expect(replaced.island.items).toEqual(bought.island.items)
 expect((await wallet()).gold).toBe(4980)
})
it('resets operator farm stock and receipts to defaults without changing gold, and rejects stale tabs',async()=>{
 const first=await state(),oldRevision=first.revision
 await trade('buy','bench',2,first.catalog.find((c:any)=>c.id==='bench').price)
 await save({...first.document,layout:[]},oldRevision)
 const balance=(await wallet()).gold
 await owner(()=>db.exec(readFileSync('supabase/migrations/20261030043428_operator_farm_reset_and_retire_navigation_buildings.sql','utf8')))
 const reset=await state()
 expect(reset.revision).toBeGreaterThan(oldRevision)
 expect(reset.items).toHaveLength(6)
 expect(reset.items.filter((i:any)=>i.type==='farm-plot')).toHaveLength(4)
 expect(reset.document.layout).toHaveLength(6)
 expect(reset.document.removedLand).toHaveLength(620)
 expect(reset.stocks).toEqual(catalog.island_starters[0].blueprint.stocks)
 expect(reset.catalog.some((c:any)=>c.family==='facility')).toBe(false)
 expect((await wallet()).gold).toBe(balance)
 expect(await owner(async()=>(await db.query('select count(*)::integer n from app_private.island_operations where user_id=$1',[uid])).rows[0].n)).toBe(0)
 await expect(save(first.document,oldRevision)).rejects.toThrow('ISLAND_REVISION_CHANGED')
})
it('keeps farm reads, purchases and saves closed to nonoperators',async()=>{
 await owner(()=>db.query('delete from app_private.notice_operators where user_id=$1',[uid]))
 await expect(state()).rejects.toThrow('FARM_PREPARING')
 await expect(trade('buy','farm-plot',1,10)).rejects.toThrow('FARM_PREPARING')
 await expect(save(catalog.island_starters[0].blueprint.document,0)).rejects.toThrow('FARM_PREPARING')
 expect((await wallet()).gold).toBe(10000)
 expect(await owner(async()=>(await db.query('select count(*)::integer n from app_private.player_islands where user_id=$1',[uid])).rows[0].n)).toBe(0)
})
it('rejects retired navigation buildings even when their former IDs are submitted manually',async()=>{
 const first=await state()
 expect(first.catalog.some((c:any)=>c.family==='facility')).toBe(false)
 await expect(trade('buy','aquarium-1~owned:hub',1,0)).rejects.toThrow('INVALID_ISLAND_ITEM')
 const forged={...first.document,layout:[...first.document.layout,{id:'aquarium-1~owned:hub',x:14,y:12}]}
 await expect(save(forged,first.revision)).rejects.toThrow('ISLAND_ITEM_NOT_OWNED')
})
