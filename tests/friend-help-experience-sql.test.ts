// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const [visitor,owner,other]=Array.from({length:3},()=>crypto.randomUUID())
let tank,tank2,otherTank
async function user(sql,args=[]){await db.exec('set role authenticated');const result=await db.query(sql,args);await db.exec('reset role');return result}
async function xp(id=visitor){return Number((await db.query('select coalesce((select total_xp from app_private.player_experience where user_id=$1),0) xp',[id])).rows[0].xp)}
async function step(kind,t,op,n){return user(`select public.${kind}_friend_aquarium($1,$2,$3)`,[t,op,n])}
async function complete(kind,t){const op=crypto.randomUUID();for(const n of [1,2,3])await step(kind,t,op,n);return op}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [i,id] of [visitor,owner,other].entries()){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,'XP'+i])
  await db.query("insert into public.player_wallets(user_id,inventory) values($1,'{\"bait\":100}') on conflict(user_id) do update set inventory=excluded.inventory",[id])
 }
 for(const id of [owner,other])await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[visitor,id])
 const tanks=[];for(const id of [owner,owner,other])tanks.push((await db.query('insert into public.aquarium_tanks(user_id) values($1) returning id',[id])).rows[0].id)
 ;[tank,tank2,otherTank]=tanks
},60000)
beforeEach(async()=>{await db.exec('begin');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[visitor])})
afterEach(async()=>{await db.exec('rollback;reset role')})
afterAll(async()=>{await db?.close()})
it('awards completion only, once per friend/activity/Korean day across tanks and retries',async()=>{
 const op=crypto.randomUUID()
 await step('feed',tank,op,1);await step('feed',tank,op,2);expect(await xp()).toBe(0)
 await step('feed',tank,op,3);expect(await xp()).toBe(1)
 await step('feed',tank,op,3);await complete('feed',tank2);expect(await xp()).toBe(1)
 await complete('clean',tank);await complete('clean',tank2);expect(await xp()).toBe(2)
 await complete('feed',otherTank);await complete('clean',otherTank);expect(await xp()).toBe(4)
 expect(await xp(owner)).toBe(0)
 const notices=await db.query("select notice_day::text d from app_private.aquarium_feed_notices where visitor_id=$1",[visitor])
 const today=(await db.query("select (transaction_timestamp() at time zone 'Asia/Seoul')::date::text d")).rows[0].d
 expect(notices.rows.every(r=>r.d===today)).toBe(true)
 // A later day's unique completion marker rewards again; its replay does not.
 await db.query("insert into app_private.aquarium_feed_notices values($1,$2,($3::date+1)) on conflict do nothing",[visitor,owner,today])
 await db.query("insert into app_private.aquarium_feed_notices values($1,$2,($3::date+1)) on conflict do nothing",[visitor,owner,today])
 expect(await xp()).toBe(5)
})
it('awards lure to the helper once per expedition and rolls back with the action',async()=>{
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner])
 const departure=(await user("select public.expedition_action('depart',$1,'dinghy','pongdang','{\"bait\":3}') s",[crypto.randomUUID()])).rows[0].s
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[visitor])
 await db.exec('savepoint help')
 await user('select public.boost_friend_expedition($1)',[departure.active.id]);expect(await xp()).toBe(1)
 await user('select public.boost_friend_expedition($1)',[departure.active.id]);expect(await xp()).toBe(1)
 expect(await xp(owner)).toBe(0)
 await db.exec('rollback to help');expect(await xp()).toBe(0)
 await user('select public.boost_friend_expedition($1)',[departure.active.id]);expect(await xp()).toBe(1)
})
it('rejects skipped completion and direct XP access without awarding',async()=>{
 await db.exec('savepoint denied')
 await expect(step('clean',tank,crypto.randomUUID(),3)).rejects.toThrow('CLEANING_STEP_REQUIRED')
 await db.exec('rollback to denied');expect(await xp()).toBe(0)
 await expect(user('select app_private.friend_help_experience_event()')).rejects.toThrow(/permission denied/)
 await db.exec('rollback to denied');expect(await xp()).toBe(0)
 await expect(user("insert into app_private.aquarium_feed_notices values($1,$2,current_date)",[visitor,owner])).rejects.toThrow(/permission denied/)
 await db.exec('rollback to denied');expect(await xp()).toBe(0)
 await complete('clean',tank);expect(await xp()).toBe(1)
 await db.exec('rollback to denied');expect(await xp()).toBe(0)
})
