// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'
let db
const owner = crypto.randomUUID(),
  other = crypto.randomUUID()
async function menu(id: string | null) {
  await db.exec(id ? 'set role authenticated' : 'set role anon')
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ''])
    return (await db.query('select public.menu_status() value')).rows[0].value
  } finally {
    await db.exec('reset role')
  }
}
beforeAll(async () => {
  db = await createLocalDatabase()
  await replayMigrations(db)
  for (const id of [owner, other]) await db.query('insert into auth.users(id) values($1)', [id])
}, 60000)
afterAll(async () => {
  await db?.close()
})
it('returns caller-only counts and deadlines without initializing a wallet or returning catalogs', async () => {
  await db.query(
    'insert into app_private.production_sites(user_id,facility_id) select $1,id from public.production_facilities where enabled limit 1',
    [owner],
  )
  await db.query(
    "insert into app_private.production_sites(user_id,facility_id,started_at,completes_at,expires_at,run_output) select $1,id,now()-interval '1 minute',now()+interval '1 minute',now()+interval '1 hour',1 from public.production_facilities where enabled limit 1",
    [owner],
  )
  const data = await menu(owner)
  expect(data.production.total).toBe(2)
  expect(data.production.sites).toHaveLength(1)
  expect(Object.keys(data.production.sites[0]).sort()).toEqual(['completesAt', 'expiresAt'])
  expect(data.harbor).toEqual({total:0, dockSlots: 2, returnsAt: [] })
  expect(data.personalBait.completesAt).toBeNull()
  expect(data.expedition.returnsAt).toBeNull()
  expect(data.savings.account).toBeNull()
  expect((await menu(other)).production).toEqual({ total: 0, sites: [] })
  expect(
    (
      await db.query('select count(*)::int n from public.player_wallets where user_id in ($1,$2)', [
        owner,
        other,
      ])
    ).rows[0].n,
  ).toBe(0)
  expect(JSON.stringify(data)).not.toMatch(/inventory|facilities|history|vessels|nickname/)
})
it('blocks anonymous and missing-user access on the public wrapper and private helper', async () => {
  await expect(menu(null)).rejects.toThrow(/permission denied/)
  await db.exec('set role authenticated')
  try {
    await db.query("select set_config('request.jwt.claim.sub','',false)")
    await expect(db.query('select public.menu_status()')).rejects.toThrow('AUTH_REQUIRED')
    await expect(db.query('select app_private.menu_status()')).rejects.toThrow('AUTH_REQUIRED')
  } finally {
    await db.exec('reset role')
  }
})
it('counts unsold boat instances and only the caller unclaimed personal job',async()=>{
 await db.query("insert into public.harbor_boats(user_id,vessel_id,instance_no) select $1,id,1 from public.harbor_vessels order by id limit 1",[owner])
 await db.query("insert into app_private.personal_bait_jobs(user_id,bait_id,bait_name,image_path,quantity,production_minutes,unit_value,fuel_cost,started_at,completes_at) select $1,id,name,image_path,1,60,1,1,now(),now()+interval '60 minutes' from public.fishing_baits order by id limit 1",[owner])
 const data=await menu(owner),foreign=await menu(other)
 expect(data.harbor.total).toBe(1);expect(foreign.harbor.total).toBe(0)
 expect(data.personalBait.completesAt).toBeTruthy();expect(foreign.personalBait.completesAt).toBeNull()
})
