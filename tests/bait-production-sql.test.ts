// @vitest-environment node
import { it, expect } from 'vitest'
import { createLocalDatabase, replayMigrations } from '../scripts/db/local.mjs'

it('allows repeated ownership, limits concurrent starts, snapshots output and settles retries once', async () => {
  const db = await createLocalDatabase(),
    u = '00000000-0000-0000-0000-000000009881',
    other = '00000000-0000-0000-0000-000000009882'
  try {
    await replayMigrations(db)
    await db.query('insert into auth.users(id) values($1),($2)', [u, other])
    await db.query(
      'insert into public.player_wallets(user_id,gold,inventory) values($1,10000,\'{"fuel":100}\') on conflict(user_id) do update set gold=10000,inventory=\'{"fuel":100}\'',
      [u],
    )
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [u])
    await db.exec('set role authenticated')
    const call = async (a: string, f: string, q = 1, op = crypto.randomUUID()) =>
      (
        await db.query<{ r: any }>('select public.bait_production_action($1,$2,$3,$4) r', [
          a,
          op,
          f,
          q,
        ])
      ).rows[0].r
    await expect(db.query('select * from app_private.bait_production_sites')).rejects.toThrow()
    const buy = crypto.randomUUID()
    let s = await call('buy', 'wriggly-soil-box', 5, buy)
    expect(s.sites).toHaveLength(5)
    expect(s.gold).toBe(8500)
    expect((await call('buy', 'wriggly-soil-box', 5, buy)).sites).toHaveLength(5)
    await expect(call('buy', 'wriggly-soil-box', 4, buy)).rejects.toThrow(/OPERATION_CONFLICT/)
    const started = await call('start', s.sites[0].siteId)
    expect(started.fuel).toBe(99)
    const running = started.sites.find((site: any) => site.siteId === s.sites[0].siteId)
    expect(running.runOutput).toBe(3)
    expect(Date.parse(running.completesAt) - Date.parse(running.startedAt)).toBe(30 * 60000)
    expect(Date.parse(running.expiresAt) - Date.parse(running.completesAt)).toBe(30 * 60000)
    for (const site of s.sites.slice(1, 4)) await call('start', site.siteId)
    await expect(call('start', s.sites[4].siteId)).rejects.toThrow(/ACTIVE_LIMIT/)
    await expect(call('claim', s.sites[0].siteId)).rejects.toThrow(/NOT_READY/)
    await db.exec('reset role')
    await db.query(
      "update app_private.bait_production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '30 minutes' where id=$1",
      [s.sites[0].siteId],
    )
    await db.query(
      "update public.bait_production_facilities set output_count=99,bait_id='bait_cloud_dough' where id='wriggly-soil-box'",
    )
    await db.exec('set role authenticated')
    await call('start', s.sites[4].siteId)
    const claim = crypto.randomUUID()
    await call('claim', s.sites[0].siteId, 1, claim)
    await call('claim', s.sites[0].siteId, 1, claim)
    await db.exec('reset role')
    const w = (
      await db.query<{ inventory: any }>(
        'select inventory from public.player_wallets where user_id=$1',
        [u],
      )
    ).rows[0].inventory
    expect(w.bait).toBe(3)
    expect(w.fuel).toBe(95)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other])
    await db.exec('set role authenticated')
    await expect(call('claim', s.sites[1].siteId)).rejects.toThrow(/NOT_OWNED/)
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [u])
    await db.query(
      "update app_private.bait_production_sites set started_at=clock_timestamp()-interval '3 hours',completes_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 hour' where id=$1",
      [s.sites[1].siteId],
    )
    await db.exec('set role authenticated')
    await expect(call('claim', s.sites[1].siteId)).rejects.toThrow(/EXPIRED/)
    await call('discard', s.sites[1].siteId)
  } finally {
    await db.close()
  }
}, 60000)
