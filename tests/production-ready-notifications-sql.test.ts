// @vitest-environment node
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const [owner,other]=[981,982].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`)
const sites=new Map()
async function asUser(uid,sql,args=[]){
 await db.exec(uid?'set role authenticated':'set role anon')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,args)}
 finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}
}
async function refresh(uid){return (await asUser(uid,'select public.refresh_return_notifications() s')).rows[0].s}
async function worker(){return (await db.query('select app_private.notify_due_production_sites() n')).rows[0].n}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const uid of [owner,other]){
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[uid,uid.slice(-3)])
 }
},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('truncate public.notifications,app_private.production_sites,app_private.production_operations')
 sites.clear()
 for(const uid of [owner,other]){
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,50000,'{}') on conflict(user_id) do update set gold=50000,inventory='{}'",[uid])
  await asUser(uid,"select public.production_action('buy',$1,'tin-grandpa-hearth')",[crypto.randomUUID()])
  const site=(await db.query('select id from app_private.production_sites where user_id=$1',[uid])).rows[0].id
  sites.set(uid,site)
  await db.query("update app_private.production_sites set started_at=clock_timestamp()-interval '1 hour',completes_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '1 hour',run_output=7 where id=$1",[site])
 }
})
it('catches up only the caller and schedules future production using server time',async()=>{
 expect((await refresh(owner)).created).toBe(1)
 expect((await refresh(owner)).created).toBe(0)
 const notices=(await asUser(owner,'select * from public.notifications where production_started_at is not null')).rows
 expect(notices).toHaveLength(1)
 expect(notices[0]).toMatchObject({category:'general',kind:'system',production_site_id:sites.get(owner),read_at:null})
 expect(notices[0].body).toContain('연료 7개')
 expect((await asUser(other,'select * from public.notifications where production_started_at is not null')).rows).toHaveLength(0)
 await db.query("update app_private.production_sites set completes_at=clock_timestamp()+interval '30 minutes' where id=$1",[sites.get(other)])
 const future=await refresh(other)
 expect(future.created).toBe(0)
 expect(Date.parse(future.nextAt)-Date.parse(future.serverNow)).toBeGreaterThan(1700000)
})
it('delivers offline completion once, excludes expired runs and denies direct client workers',async()=>{
 await db.query("update app_private.production_sites set expires_at=clock_timestamp()-interval '1 second' where id=$1",[sites.get(other)])
 expect(await worker()).toBe(1)
 expect(await worker()).toBe(0)
 expect((await refresh(other)).nextAt).toBeNull()
 for(const uid of [owner,other])await expect(asUser(uid,'select app_private.notify_due_production_sites()')).rejects.toThrow(/permission denied/)
 await expect(refresh(null)).rejects.toThrow(/permission denied/)
})
it('resets on claim, notifies the next run once and preserves historical notices on sale',async()=>{
 const site=sites.get(owner)
 await refresh(owner)
 await asUser(owner,"select public.production_action('claim',$1,$2)",[crypto.randomUUID(),site])
 expect((await db.query('select ready_notified_at from app_private.production_sites where id=$1',[site])).rows[0].ready_notified_at).toBeNull()
 expect((await refresh(owner)).created).toBe(0)
 await db.query("insert into public.player_collectibles(user_id,species_id) select $1,'shared-drift-scrap-wood' from generate_series(1,4)",[owner])
 await asUser(owner,"select public.production_action('start',$1,$2,'{\"shared-drift-scrap-wood\":4}')",[crypto.randomUUID(),site])
 await db.query("update app_private.production_sites set started_at=clock_timestamp()-interval '2 minutes',completes_at=clock_timestamp()-interval '1 second' where id=$1",[site])
 expect((await refresh(owner)).created).toBe(1)
 expect((await refresh(owner)).created).toBe(0)
 expect((await db.query('select count(*)::int n from public.notifications where production_site_id=$1',[site])).rows[0].n).toBe(2)
 await asUser(owner,"select public.production_action('claim',$1,$2)",[crypto.randomUUID(),site])
 await asUser(owner,"select public.production_action('sell',$1,$2)",[crypto.randomUUID(),site])
 const history=(await asUser(owner,'select production_site_id,production_started_at from public.notifications where production_started_at is not null')).rows
 expect(history).toHaveLength(2)
 expect(history.every(n=>n.production_site_id===null&&n.production_started_at)).toBe(true)
})
