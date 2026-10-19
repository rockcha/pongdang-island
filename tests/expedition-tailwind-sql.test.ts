// @vitest-environment node
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const players=Array.from({length:5},(_,i)=>`00000000-0000-0000-0000-00000000081${i}`)
const [owner,friend,second,third,stranger]=players
async function asUser(uid,sql,args=[]){await db.exec(uid?'set role authenticated':'set role anon');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return (await db.query(sql,args)).rows}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}}
async function depart(){return (await asUser(owner,"select public.expedition_action('depart',$1,'dinghy','pongdang','{\"bait\":3}') s",[crypto.randomUUID()]))[0].s.active}
async function boost(uid,id){return (await asUser(uid,'select public.boost_friend_expedition($1) s',[id]))[0].s}
async function state(uid=owner){return (await asUser(uid,'select public.expedition_state() s'))[0].s}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [i,u] of players.entries()){await db.query('insert into auth.users(id) values($1)',[u]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[u,`선원${i}`]);await db.query('insert into public.player_wallets(user_id) values($1) on conflict do nothing',[u])}
},60000)
beforeEach(async()=>{
 await db.exec(`delete from public.notifications;delete from public.fishing_expeditions;delete from public.friend_requests;delete from app_private.expedition_operations;
 update public.player_wallets set inventory='{"bait":100}',gold=10000;`)
 for(const uid of [friend,second,third])await db.query("insert into public.friend_requests(sender_id,recipient_id,status) values($1,$2,'accepted')",[uid,owner])
})
afterAll(async()=>{await db?.close()})
it('subtracts ten minutes once, preserves cargo, and records the helper and one linked notification',async()=>{
 const trip=await depart(),reply=await boost(friend,trip.id),current=(await state()).active
 expect(reply.replayed).toBe(false)
 expect(Date.parse(trip.returns_at)-Date.parse(current.returns_at)).toBe(600000)
 expect(current.cargo).toEqual({bait:3});expect(current.boosts).toMatchObject([{nickname:'선원1',minutes:10}])
 expect((await boost(friend,trip.id)).replayed).toBe(true)
 expect((await state()).active.returns_at).toBe(current.returns_at)
 const notices=await asUser(owner,'select actor_id,expedition_boost_id,read_at from public.notifications where expedition_boost_id is not null')
 expect(notices).toMatchObject([{actor_id:friend,expedition_boost_id:current.boosts[0].id,read_at:null}])
 expect(await asUser(stranger,'select id from public.notifications where expedition_boost_id is not null')).toHaveLength(0)
})
it('allows three different friends to help the same departure, without a global one-help limit',async()=>{
 const trip=await depart()
 await db.query("update public.fishing_expeditions set returns_at=returns_at+interval '1 hour' where id=$1",[trip.id])
 const before=(await state()).active
 for(const uid of [friend,second,third])await boost(uid,trip.id)
 const after=(await state()).active
 expect(Date.parse(before.returns_at)-Date.parse(after.returns_at)).toBe(1800000)
 expect(after.boosts).toHaveLength(3)
})
it('clamps the last ten minutes to now and retains both boost and unique return notices',async()=>{
 const trip=await depart()
 await db.query("update public.fishing_expeditions set returns_at=clock_timestamp()+interval '5 minutes' where id=$1",[trip.id])
 await boost(friend,trip.id)
 const s=await state()
 expect(Date.parse(s.active.returns_at)).toBeLessThanOrEqual(Date.parse(s.serverNow))
 expect((await db.query('select count(*)::int n from public.notifications where expedition_id=$1',[trip.id])).rows[0].n).toBe(1)
 expect((await db.query('select count(*)::int n from public.notifications where expedition_boost_id is not null')).rows[0].n).toBe(1)
 expect((await boost(friend,trip.id)).replayed).toBe(true)
 await expect(boost(second,trip.id)).rejects.toThrow(/NOT_SAILING/)
})
it('requires an active friendship, disallows self-help and anonymous or direct table writes',async()=>{
 const trip=await depart()
 await expect(boost(owner,trip.id)).rejects.toThrow(/FRIENDSHIP_REQUIRED/)
 await expect(boost(stranger,trip.id)).rejects.toThrow(/FRIENDSHIP_REQUIRED/)
 await expect(boost(null,trip.id)).rejects.toThrow(/permission denied/)
 await expect(asUser(friend,'select * from app_private.expedition_boosts')).rejects.toThrow(/permission denied/)
 await expect(asUser(friend,'update public.fishing_expeditions set returns_at=now() where id=$1',[trip.id])).rejects.toThrow(/permission denied/)
 await db.query("update public.friend_requests set status='removed' where sender_id=$1",[friend])
 await expect(boost(friend,trip.id)).rejects.toThrow(/FRIENDSHIP_REQUIRED/)
})
it('exposes only accepted friends and their current availability without cargo or result data',async()=>{
 const trip=await depart()
 const status=(await asUser(friend,'select public.friend_expedition_status() s'))[0].s
 expect(status.friends).toEqual([{friend_id:owner,expedition_id:trip.id,returns_at:trip.returns_at,boosted:false}])
 expect((await asUser(stranger,'select public.friend_expedition_status() s'))[0].s.friends).toEqual([])
 await boost(friend,trip.id)
 expect((await asUser(friend,'select public.friend_expedition_status() s'))[0].s.friends[0].boosted).toBe(true)
 expect((await asUser(second,'select public.friend_expedition_status() s'))[0].s.friends[0].boosted).toBe(false)
})
it('allows another help on a new trip while an old response retry never helps the new one',async()=>{
 const first=await depart();await boost(friend,first.id)
 await db.query("update public.fishing_expeditions set returns_at=clock_timestamp() where id=$1",[first.id])
 await asUser(owner,"select public.expedition_action('claim',$1,null,null,null,$2)",[crypto.randomUUID(),first.id])
 const next=await depart()
 expect((await boost(friend,first.id)).replayed).toBe(true)
 expect((await state()).active.boosts).toHaveLength(0)
 await boost(friend,next.id)
 expect((await state()).active.boosts).toHaveLength(1)
 expect((await state()).history[0].boosts).toHaveLength(1)
})
it('rolls the help back if notification delivery fails',async()=>{
 const trip=await depart()
 await db.exec("alter table public.notifications add constraint test_no_boost check (expedition_boost_id is null)")
 try{await expect(boost(friend,trip.id)).rejects.toThrow(/test_no_boost/)}finally{await db.exec('alter table public.notifications drop constraint test_no_boost')}
 expect((await state()).active.returns_at).toBe(trip.returns_at)
 expect((await state()).active.boosts).toHaveLength(0)
})
it('excludes returned unclaimed trips from assistance and rejects late help',async()=>{
 const trip=await depart()
 await db.query('update public.fishing_expeditions set returns_at=clock_timestamp() where id=$1',[trip.id])
 const returned=(await asUser(friend,'select public.friend_expedition_status() s'))[0].s
 expect(returned.friends[0]).toMatchObject({expedition_id:null,returns_at:null})
 await expect(boost(friend,trip.id)).rejects.toThrow(/NOT_SAILING/)
 await asUser(owner,"select public.expedition_action('claim',$1,null,null,null,$2)",[crypto.randomUUID(),trip.id])
 const claimed=(await asUser(friend,'select public.friend_expedition_status() s'))[0].s
 expect(claimed.friends[0]).toMatchObject({expedition_id:null,returns_at:null})
})
it('allows accepted friends to visit only the current sailing trip with no result or wallet data',async()=>{
 const trip=await depart()
 const visit=(await asUser(friend,'select public.friend_expedition($1) s',[owner]))[0].s
 expect(visit.owner).toEqual({id:owner,nickname:'선원0',avatar_path:null})
 expect(visit.active).toMatchObject({id:trip.id,cargo:{bait:3}})
 expect(visit.active.result).toBeUndefined();expect(visit.active.user_id).toBeUndefined();expect(visit.history).toBeUndefined();expect(visit.wallet).toBeUndefined()
 expect(visit.baits.map(b=>b.id)).toEqual(['bait'])
 expect(visit.boosted).toBe(false)
 await boost(friend,trip.id)
 expect((await asUser(friend,'select public.friend_expedition($1) s',[owner]))[0].s.boosted).toBe(true)
 await expect(asUser(stranger,'select public.friend_expedition($1)',[owner])).rejects.toThrow(/FRIENDSHIP_REQUIRED/)
 await expect(asUser(owner,'select public.friend_expedition($1)',[owner])).rejects.toThrow(/FRIENDSHIP_REQUIRED/)
 await expect(asUser(null,'select public.friend_expedition($1)',[owner])).rejects.toThrow(/permission denied/)
 await db.query('update public.fishing_expeditions set returns_at=clock_timestamp() where id=$1',[trip.id])
 const returned=(await asUser(friend,'select public.friend_expedition($1) s',[owner]))[0].s
 expect(returned.active).toBeNull();expect(returned.baits).toEqual([])
})
