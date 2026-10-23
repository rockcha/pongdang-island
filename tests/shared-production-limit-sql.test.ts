// @vitest-environment node
import {it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

it('allows four fuel and four bait runs independently, including bulk starts, retries and completed slots',async()=>{
 const db=await createLocalDatabase(),u='00000000-0000-0000-0000-000000009884'
 try{
  await replayMigrations(db)
  await db.query('insert into auth.users(id) values($1)',[u])
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,10000,'{\"fuel\":100}') on conflict(user_id) do update set gold=10000,inventory='{\"fuel\":100}'",[u])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u]);await db.exec('set role authenticated')
  const fuel=(await db.query<{r:any}>("select public.production_purchase('shell-coal-mini-kiln',5,$1) r",[crypto.randomUUID()])).rows[0].r.sites
  const bait=(await db.query<{r:any}>("select public.bait_production_action('buy',$1,'wriggly-soil-box',5) r",[crypto.randomUUID()])).rows[0].r.sites
  await db.exec('reset role')
  await db.query("insert into public.player_collectibles(user_id,species_id) select $1,'shared-drift-scrap-wood' from generate_series(1,18)",[u])
  await db.exec('set role authenticated')
  const start=async(id:string,op=crypto.randomUUID())=>(await db.query<{r:any}>("select public.bait_production_action('start',$1,$2) r",[op,id])).rows[0].r
  const startFuel=async(id:string)=>db.query("select public.production_action('start',$1,$2,'{\"shared-drift-scrap-wood\":2}'::jsonb)",[crypto.randomUUID(),id])
  const first=crypto.randomUUID()
  await start(bait[0].siteId,first)
  for(const b of bait.slice(1,4))await start(b.siteId)
  await db.query("select public.production_bulk_action('start',$1,$2::jsonb)",[crypto.randomUUID(),JSON.stringify(fuel.slice(0,4).map((f:any)=>({facility:f.siteId,materials:{'shared-drift-scrap-wood':2}})))])
  for(const fn of ['production_state','bait_production_state'])expect((await db.query<{r:any}>(`select public.${fn}() r`)).rows[0].r.activeTotal).toBe(4)
  expect((await start(bait[0].siteId,first)).replayed).toBe(true)
  await expect(start(bait[4].siteId)).rejects.toThrow(/PRODUCTION_ACTIVE_LIMIT/)
  await expect(startFuel(fuel[4].siteId)).rejects.toThrow(/PRODUCTION_ACTIVE_LIMIT/)
  await db.exec('reset role')
  await db.query("update app_private.production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '1 hour' where id=$1",[fuel[0].siteId])
  await db.exec('set role authenticated')
  expect((await db.query<{r:any}>('select public.production_state() r')).rows[0].r.activeTotal).toBe(3)
  expect((await db.query<{r:any}>('select public.bait_production_state() r')).rows[0].r.activeTotal).toBe(4)
  await startFuel(fuel[4].siteId)
  await expect(start(bait[4].siteId)).rejects.toThrow(/PRODUCTION_ACTIVE_LIMIT/)
  await db.exec('reset role')
  await db.query("update app_private.bait_production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '1 hour' where id=$1",[bait[0].siteId])
  await db.exec('set role authenticated')
  expect((await db.query<{r:any}>('select public.bait_production_state() r')).rows[0].r.activeTotal).toBe(3)
  await start(bait[4].siteId)
  expect((await db.query<{r:any}>('select public.production_state() r')).rows[0].r.activeTotal).toBe(4)
  expect((await db.query<{r:any}>('select public.bait_production_state() r')).rows[0].r.activeTotal).toBe(4)
 }finally{await db.close()}
},60000)
