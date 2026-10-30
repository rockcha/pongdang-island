// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createLocalDatabase, migrationFiles } from '../scripts/db/local.mjs'
it('replaces only legacy island decorations while preserving gold, office upgrades, plot IDs and receipts', async () => {
  const db = await createLocalDatabase()
  try {
    for (const file of migrationFiles().filter((f) => f < '20261030053506'))
      await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'))
    const uid = crypto.randomUUID()
    await db.query('insert into auth.users(id) values($1)', [uid])
    await db.query('insert into app_private.notice_operators(user_id) values($1)', [uid])
    await db.query(
      'insert into public.player_wallets(user_id,gold) values($1,100000) on conflict(user_id) do update set gold=100000',
      [uid],
    )
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid])
    const state = async () => (await db.query('select public.my_island_state() s')).rows[0].s
    const buy = async (id: string, price: number) =>
      (
        await db.query("select public.trade_island('buy',$1,1,$2,$3) s", [
          id,
          price,
          crypto.randomUUID(),
        ])
      ).rows[0].s
    await state()
    await buy('farm-office', 5000)
    await buy('farm-office', 10000)
    const s = await state(),
      price = s.catalog.find((c: any) => c.id === 'bench').price
    await buy('bench', price)
    const before = await state(),
      balance = (await db.query('select gold from public.player_wallets where user_id=$1', [uid]))
        .rows[0].gold,
      receiptCount = (
        await db.query('select count(*) n from app_private.island_operations where user_id=$1', [
          uid,
        ])
      ).rows[0].n
    for (const file of migrationFiles().filter((f) => f >= '20261030053506'))
      await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'))
    const after = await state()
    expect(after.farm).toMatchObject({
      officeLevel: 2,
      plotLimit: 16,
      storeLevel: 0,
      barnLevel: 0,
      inventory: {},
    })
    expect(after.items.find((i: any) => i.type === 'farm-office').id).toBe(
      before.items.find((i: any) => i.type === 'farm-office').id,
    )
    expect(after.items.filter((i: any) => i.type === 'farm-plot')).toEqual(
      before.items.filter((i: any) => i.type === 'farm-plot'),
    )
    expect(after.items.filter((i: any) => i.type === 'farm-white-fence')).toHaveLength(4)
    expect(
      after.items.some((i: any) => ['bench', 'hydrangea-pink', 'wood-arrow-sign'].includes(i.type)),
    ).toBe(false)
    expect(
      (await db.query('select gold from public.player_wallets where user_id=$1', [uid])).rows[0]
        .gold,
    ).toBe(balance)
    expect(
      (
        await db.query('select count(*) n from app_private.island_operations where user_id=$1', [
          uid,
        ])
      ).rows[0].n,
    ).toBe(receiptCount)
    expect(after.revision).toBeGreaterThan(before.revision)
  } finally {
    await db.close()
  }
}, 60000)
