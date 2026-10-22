// @vitest-environment node
import {it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

it('shares four running slots between fuel and bait facilities and frees slots at completion',async()=>{
 const db=await createLocalDatabase(),u='00000000-0000-0000-0000-000000009884'
 try{
  await replayMigrations(db)
  await db.query('insert into auth.users(id) values($1)',[u])
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,10000,'{\"fuel\":100}') on conflict(user_id) do update set gold=10000,inventory='{\"fuel\":100}'",[u])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[u]);await db.exec('set role authenticated')
  const fuel=(await db.query<{r:any}>("select public.production_purchase('shell-coal-mini-kiln',2,$1) r",[crypto.randomUUID()])).rows[0].r.sites
  const bait=(await db.query<{r:any}>("select public.bait_production_action('buy',$1,'wriggly-soil-box',4) r",[crypto.randomUUID()])).rows[0].r.sites
  await db.exec('reset role')
  await db.query("update app_private.production_sites set started_at=clock_timestamp(),completes_at=clock_timestamp()+interval '1 hour',expires_at=clock_timestamp()+interval '2 hours',run_output=1 where id=$1",[fuel[0].siteId])
  await db.exec('set role authenticated')
  const start=async(id:string)=>db.query("select public.bait_production_action('start',$1,$2) r",[crypto.randomUUID(),id])
  for(const b of bait.slice(0,3))await start(b.siteId)
  for(const fn of ['production_state','bait_production_state'])expect((await db.query<{r:any}>(`select public.${fn}() r`)).rows[0].r.activeTotal).toBe(4)
  await expect(start(bait[3].siteId)).rejects.toThrow(/PRODUCTION_ACTIVE_LIMIT/)
  await expect(db.query("select public.production_action('start',$1,$2,'{}'::jsonb)",[crypto.randomUUID(),fuel[1].siteId])).rejects.toThrow(/PRODUCTION_ACTIVE_LIMIT/)
  await db.exec('reset role')
  await db.query("update app_private.production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '1 hour' where id=$1",[fuel[0].siteId])
  await db.exec('set role authenticated')
  await start(bait[3].siteId)
  expect((await db.query<{r:any}>('select public.production_state() r')).rows[0].r.activeTotal).toBe(4)
 }finally{await db.close()}
},60000)
