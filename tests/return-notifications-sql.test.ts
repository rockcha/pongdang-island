// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const [owner,other]=[971,972].map(n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`)
const trips=new Map()
async function asUser(uid,sql,args=[]){
 await db.exec(uid?'set role authenticated':'set role anon')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,args)}
 finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}
}
async function refresh(uid){return (await asUser(uid,'select public.refresh_return_notifications() s')).rows[0].s}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const uid of [owner,other]){
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[uid,uid.slice(-3)])
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,50000,'{\"fuel\":10,\"bait\":100}') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory",[uid])
  const buy=(await asUser(uid,"select public.harbor_action('buy',$1,'fishing-raft') s",[crypto.randomUUID()])).rows[0].s
  const depart=(await asUser(uid,"select public.harbor_action('depart',$1,'fishing-raft',null,1,$2,null,'pongdang') s",[crypto.randomUUID(),buy.receipt.boatId])).rows[0].s
  const trap=(await db.query("insert into public.fishing_expeditions(user_id,vessel_id,region_id,cargo,vessel_snapshot,returns_at) select $1,'dinghy','pongdang','{\"bait\":3}',to_jsonb(v),clock_timestamp()+interval '1 hour' from public.fishing_vessels v where id='dinghy' returning id",[uid])).rows[0].id
  trips.set(uid,{voyage:depart.receipt.voyageId,trap})
 }
 // Reproduce a due trip whose cron notification has not run yet.
 await db.exec('alter table public.fishing_expeditions disable trigger user')
 await db.exec("update public.fishing_expeditions set departed_at=clock_timestamp()-interval '4 hours',returns_at=clock_timestamp()-interval '1 minute';alter table public.fishing_expeditions enable trigger user;update public.harbor_voyages set departed_at=clock_timestamp()-interval '4 hours',returns_at=clock_timestamp()-interval '1 minute'")
},60000)
afterAll(async()=>{await db?.close()})
it('creates both return notices once for the caller and leaves other accounts untouched',async()=>{
 expect((await refresh(owner)).created).toBe(2)
 const notifications=(await asUser(owner,'select * from public.notifications where expedition_id is not null or harbor_voyage_id is not null')).rows
 expect(notifications.filter(n=>n.expedition_id===trips.get(owner).trap)).toHaveLength(1)
 expect(notifications.filter(n=>n.harbor_voyage_id===trips.get(owner).voyage)).toHaveLength(1)
 expect(notifications.every(n=>n.category==='general'&&n.kind==='system'&&n.read_at===null)).toBe(true)
 expect((await refresh(owner)).created).toBe(0)
 expect((await asUser(other,'select * from public.notifications where expedition_id is not null or harbor_voyage_id is not null')).rows).toHaveLength(0)
})
it('allows the server scheduler to deliver offline returns without duplicate notices',async()=>{
 expect((await db.query('select app_private.notify_due_harbor_voyages() n')).rows[0].n).toBe(1)
 expect((await db.query('select app_private.notify_due_harbor_voyages() n')).rows[0].n).toBe(0)
 expect((await db.query('select app_private.notify_due_expeditions() n')).rows[0].n).toBe(1)
 expect((await refresh(other)).created).toBe(0)
 expect((await asUser(other,'select * from public.notifications where expedition_id is not null or harbor_voyage_id is not null')).rows).toHaveLength(2)
})
it('denies anonymous refresh and direct player access to global workers',async()=>{
 await expect(refresh(null)).rejects.toThrow(/permission denied/)
 for(const uid of [owner,other])await expect(asUser(uid,'select app_private.notify_due_harbor_voyages()')).rejects.toThrow(/permission denied/)
})
it('supplies the next future deadline without notifying or re-notifying claimed voyages',async()=>{
 const trip=trips.get(owner)
 await db.query('delete from public.notifications where harbor_voyage_id=$1',[trip.voyage])
 await db.query("update public.harbor_voyages set notified_at=null,returns_at=clock_timestamp()+interval '1 hour' where id=$1",[trip.voyage])
 const future=await refresh(owner)
 expect(future.created).toBe(0)
 expect(Date.parse(future.nextAt)-Date.parse(future.serverNow)).toBeGreaterThan(3500000)
 await db.query("update public.harbor_voyages set claimed_at=clock_timestamp(),returns_at=clock_timestamp()-interval '1 minute' where id=$1",[trip.voyage])
 expect((await refresh(owner)).nextAt).toBeNull()
 expect((await db.query('select app_private.notify_due_harbor_voyages() n')).rows[0].n).toBe(0)
})
