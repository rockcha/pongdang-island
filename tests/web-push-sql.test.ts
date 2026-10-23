// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const owner='00000000-0000-0000-0000-000000007701',other='00000000-0000-0000-0000-000000007702'
const endpoint='https://fcm.googleapis.com/fcm/send/test-device-1'
const subscription={endpoint,keys:{p256dh:'B'+'a'.repeat(86),auth:'a'.repeat(22)}}
async function asUser(id,sql,args=[]){await db.exec('set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return await db.query(sql,args)}finally{await db.exec('reset role')}}
async function device(id,action,sub=subscription,categories=['production','bait-production','expedition','harbor']){return (await asUser(id,'select public.web_push_device($1,$2,$3) result',[action,sub,categories])).rows[0].result}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);for(const id of [owner,other]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,id.slice(-4)])}},60000)
afterAll(async()=>{await db?.close()})
it('keeps subscriptions private and prevents cross-account endpoint transfer and SSRF',async()=>{
 expect(await device(owner,'save')).toMatchObject({registered:true})
 expect(await device(other,'state')).toEqual({registered:false,categories:[]})
 await expect(device(other,'save')).rejects.toThrow('PUSH_DEVICE_CONFLICT')
 await expect(device(owner,'save',{...subscription,endpoint:'https://127.0.0.1/private'})).rejects.toThrow('INVALID_PUSH_DEVICE')
 await expect(device(owner,'save',subscription,['admin'])).rejects.toThrow('INVALID_PUSH_DEVICE')
 await expect(asUser(owner,'select * from app_private.push_subscriptions')).rejects.toThrow('permission denied')
 await expect(asUser(owner,'select public.claim_web_push()')).rejects.toThrow('permission denied')
 await expect(asUser(owner,"select public.configure_web_push_worker('a','b')")).rejects.toThrow('permission denied')
})
it('queues one test with a rate limit and uses leases, retry and dead-subscription removal',async()=>{
 expect(await device(owner,'test')).toEqual({queued:true})
 await expect(device(owner,'test')).rejects.toThrow('PUSH_TEST_RATE_LIMIT')
 const first=(await db.query('select public.claim_web_push() items')).rows[0].items
 expect(first).toHaveLength(1)
 expect((await db.query('select public.claim_web_push() items')).rows[0].items).toEqual([])
 await db.query('select public.finish_web_push($1,$2,503)',[first[0].id,first[0].leaseToken])
 expect((await db.query('select status,attempts from app_private.push_deliveries')).rows[0]).toMatchObject({status:'pending',attempts:1})
 await db.exec("update app_private.push_deliveries set available_at=now()-interval '1 minute'")
 const retry=(await db.query('select public.claim_web_push() items')).rows[0].items[0]
 await db.query('select public.finish_web_push($1,$2,201)',[retry.id,first[0].leaseToken])
 expect((await db.query('select status from app_private.push_deliveries')).rows[0].status).toBe('sending')
 await db.query('select public.finish_web_push($1,$2,410)',[retry.id,retry.leaseToken])
 expect(await device(owner,'state')).toMatchObject({registered:false})
})
it('enqueues future completion notifications and suppresses claimed or expired bait runs',async()=>{
 await device(owner,'save')
 const facility=(await db.query('select id from public.bait_production_facilities limit 1')).rows[0].id
 const make=async(minutes=30)=>(await db.query("insert into app_private.bait_production_sites(user_id,facility_id,started_at,completes_at,expires_at,run_output,run_bait_id) select $1,id,now()-interval '1 hour',now()-interval '5 minutes',now()+make_interval(mins=>$3),3,bait_id from public.bait_production_facilities where id=$2 returning id",[owner,facility,minutes])).rows[0].id
 const id=await make()
 expect((await db.query('select app_private.notify_due_bait_production_sites() n')).rows[0].n).toBe(1)
 expect((await db.query('select app_private.notify_due_bait_production_sites() n')).rows[0].n).toBe(0)
 expect((await db.query('select count(*)::integer n from public.notifications where bait_production_site_id=$1',[id])).rows[0].n).toBe(1)
 await db.query('update app_private.bait_production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null,run_bait_id=null where id=$1',[id])
 expect((await db.query('select public.claim_web_push() items')).rows[0].items).toEqual([])
 const valid=await make();await make(-1)
 await db.query('select app_private.notify_due_bait_production_sites()')
 const items=(await db.query('select public.claim_web_push() items')).rows[0].items
 expect(items).toHaveLength(1);expect(items[0].payload.url).toBe('/bait-production')
 await db.query('select public.finish_web_push($1,$2,201)',[items[0].id,items[0].leaseToken])
 expect((await db.query('select status from app_private.push_deliveries where id=$1',[items[0].id])).rows[0].status).toBe('sent')
 await device(owner,'delete');expect(await device(owner,'state')).toMatchObject({registered:false})
 expect(valid).toBeTruthy()
})
it('opts into each expiry reminder separately, sends once per run and rechecks collection and expiry',async()=>{
 const all=['production','bait-production','expedition','harbor','production-expiring','bait-production-expiring']
 await device(owner,'save')
 const fuel=async(minutes=4,uid=owner)=>(await db.query("insert into app_private.production_sites(user_id,facility_id,started_at,completes_at,expires_at,run_output) select $1,id,now()-interval '1 hour',now()-interval '10 minutes',now()+make_interval(mins=>$2),2 from public.production_facilities limit 1 returning id",[uid,minutes])).rows[0].id
 const bait=async(minutes=4)=>(await db.query("insert into app_private.bait_production_sites(user_id,facility_id,started_at,completes_at,expires_at,run_output,run_bait_id) select $1,id,now()-interval '1 hour',now()-interval '10 minutes',now()+make_interval(mins=>$2),3,bait_id from public.bait_production_facilities limit 1 returning id",[owner,minutes])).rows[0].id
 const fuelId=await fuel(),baitId=await bait(5)
 await fuel(6);await fuel(-1);await fuel(4,other)
 expect((await db.query('select app_private.enqueue_expiring_production_push() n')).rows[0].n).toBe(0)
 expect(await device(owner,'save',subscription,all)).toMatchObject({categories:all})
 await expect(asUser(owner,'select app_private.enqueue_expiring_production_push()')).rejects.toThrow('permission denied')
 expect((await db.query('select app_private.enqueue_expiring_production_push() n')).rows[0].n).toBe(2)
 expect((await db.query('select app_private.enqueue_expiring_production_push() n')).rows[0].n).toBe(0)
 const queued=(await db.query("select category,payload,expires_at from app_private.push_deliveries where category like '%-expiring' order by category")).rows
 expect(queued.map(q=>q.payload.url)).toEqual(['/bait-production','/production'])
 for(const q of queued)expect(Date.parse(q.payload.expiresAt)).toBe(new Date(q.expires_at).getTime())
 await device(owner,'save',subscription,['production-expiring'])
 const claimed=(await db.query('select public.claim_web_push() items')).rows[0].items
 expect(claimed).toHaveLength(1);expect(claimed[0].payload.url).toBe('/production')
 await db.query('select public.finish_web_push($1,$2,201)',[claimed[0].id,claimed[0].leaseToken])
 await device(owner,'save',subscription,all)
 expect((await db.query('select app_private.enqueue_expiring_production_push() n')).rows[0].n).toBe(0)
 // A later run on the same site has its own reminder; collecting suppresses it.
 await db.query("update app_private.production_sites set started_at=now()-interval '2 hours' where id=$1",[fuelId])
 expect((await db.query('select app_private.enqueue_expiring_production_push() n')).rows[0].n).toBe(1)
 await db.query('update app_private.production_sites set started_at=null,completes_at=null,expires_at=null,run_output=null where id=$1',[fuelId])
 expect((await db.query('select public.claim_web_push() items')).rows[0].items).toEqual([])
 // The reminder becomes stale at the actual expiry, rather than an hour later.
 const expiring=await bait();await db.query('select app_private.enqueue_expiring_production_push()')
 await db.query("update app_private.bait_production_sites set expires_at=now()-interval '1 second' where id=$1",[expiring])
 expect((await db.query('select public.claim_web_push() items')).rows[0].items).toEqual([])
 expect(baitId).toBeTruthy()
})
