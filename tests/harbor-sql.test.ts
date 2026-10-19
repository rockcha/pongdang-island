// @vitest-environment node
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const owner='00000000-0000-0000-0000-000000000901',other='00000000-0000-0000-0000-000000000902'
async function asUser(uid,sql,args=[]){await db.exec(uid?'set role authenticated':'set role anon');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,args)}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}}
async function action(kind,vessel=null,voyage=null,quantity=1,op=crypto.randomUUID(),uid=owner){return (await asUser(uid,'select public.harbor_action($1,$2,$3,$4,$5) s',[kind,op,vessel,voyage,quantity])).rows[0].s}
async function wallet(){return (await db.query('select gold,inventory from public.player_wallets where user_id=$1',[owner])).rows[0]}
async function fleetAction(kind,boat,slot=null,uid=owner,op=crypto.randomUUID()){return (await asUser(uid,'select public.harbor_action($1,$2,null,null,1,$3,$4) s',[kind,op,boat,slot])).rows[0].s}
async function ready(){await db.exec("update public.harbor_voyages set departed_at=clock_timestamp()-interval '4 hours',returns_at=clock_timestamp()-interval '1 minute'")}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);for(const id of [owner,other]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,id===owner?'항구선장':'다른선장']);await db.query('insert into public.player_wallets(user_id,gold) values($1,10000) on conflict(user_id) do update set gold=10000',[id])}},60000)
beforeEach(async()=>{await db.exec(`truncate public.harbor_voyages,public.harbor_boats,public.player_harbor_vessels,app_private.harbor_operations;update public.player_wallets set gold=10000,inventory='{"bait":40,"fuel":10}'`)})
afterAll(async()=>{await db?.close()})
it('operates two boats of the same kind independently and keeps both dock reservations',async()=>{
 await action('buy','fishing-raft');const purchased=await action('buy','fishing-raft')
 expect(purchased.boats.map(b=>b.instance_no).sort()).toEqual([1,2])
 expect(purchased.boats.map(b=>b.dock_slot).sort()).toEqual([1,2])
 for(const boat of purchased.boats)await fleetAction('depart',boat.id)
 const state=(await asUser(owner,'select public.harbor_state() s')).rows[0].s
 expect(new Set(state.voyages.map(v=>v.boat_id)).size).toBe(2)
 expect((await wallet()).inventory.fuel).toBe(8)
 for(const boat of state.boats)await expect(fleetAction('store',boat.id)).rejects.toThrow(/ACTIVE/)
})
it('stores extra boats in the inventory and only replaces a dock after the occupying boat is harvested',async()=>{
 await action('buy','fishing-raft');await action('buy','neoul-boat');const owned=await action('buy','haeneomi-trawler')
 const long=owned.boats.find(b=>b.vessel_id==='haeneomi-trawler'),first=owned.boats.find(b=>b.dock_slot===1)
 expect(long.dock_slot).toBeNull()
 await expect(fleetAction('depart',long.id)).rejects.toThrow(/DOCK_REQUIRED/)
 await fleetAction('depart',first.id)
 await expect(fleetAction('dock',long.id,1)).rejects.toThrow(/DOCK_RESERVED/)
 await ready()
 await expect(fleetAction('dock',long.id,1)).rejects.toThrow(/DOCK_RESERVED/)
 await action('claim_all')
 const swapped=await fleetAction('dock',long.id,1)
 expect(swapped.boats.find(b=>b.id===first.id).dock_slot).toBeNull()
 expect(swapped.boats.find(b=>b.id===long.id).dock_slot).toBe(1)
 const op=crypto.randomUUID(),departed=await fleetAction('depart',long.id,null,owner,op)
 await fleetAction('depart',long.id,null,owner,op)
 const trip=departed.voyages[0]
 expect(trip.vessel_snapshot).toMatchObject({duration_minutes:360,fuel_cost:5,fishing_count:15})
 expect((await wallet()).inventory.fuel).toBe(4)
})
it('isolates physical boats and rejects invalid dock numbers and direct edits',async()=>{
 const state=await action('buy','fishing-raft'),boat=state.boats[0]
 await expect(fleetAction('store',boat.id,null,other)).rejects.toThrow(/NOT_OWNED/)
 expect((await asUser(other,'select * from public.harbor_boats')).rows).toEqual([])
 for(const slot of [0,3,null])await expect(fleetAction('dock',boat.id,slot)).rejects.toThrow(/INVALID_DOCK_SLOT/)
 await expect(asUser(owner,'update public.harbor_boats set dock_slot=null')).rejects.toThrow(/permission denied/)
 await expect(asUser(owner,"select app_private.settle_legacy_harbor('buy',gen_random_uuid(),'fishing-raft')")).rejects.toThrow(/permission denied/)
})
it('lists three boat types and limits each type to two physical boats with an idempotent receipt',async()=>{
 const initial=(await asUser(owner,'select public.harbor_state() s')).rows[0].s
 expect(initial.vessels.map(v=>[v.name,v.duration_minutes,v.fuel_cost,v.fishing_count])).toEqual([['낚시용 뗏목',30,1,2],['너울 낚싯배',120,2,5],['해넘이 원양어선',360,5,15]])
 const op=crypto.randomUUID();await action('buy','fishing-raft',null,1,op);expect((await action('buy','fishing-raft',null,1,op)).replayed).toBe(true)
 expect((await wallet()).gold).toBe(9700)
 await action('buy','fishing-raft');await expect(action('buy','fishing-raft')).rejects.toThrow(/OWNERSHIP_LIMIT/)
 await expect(action('buy','neoul-boat',null,1,op)).rejects.toThrow(/CONFLICT/)
})
it('buys fuel atomically, validates bounds and never double charges a retry',async()=>{
 const op=crypto.randomUUID();await action('fuel',null,null,5,op);await action('fuel',null,null,5,op)
 expect(await wallet()).toMatchObject({gold:9750,inventory:{fuel:15,bait:40}})
 for(const count of [0,-1,101,null])await expect(action('fuel',null,null,count)).rejects.toThrow(/QUANTITY/)
 await db.exec('update public.player_wallets set gold=0')
 await expect(action('fuel')).rejects.toThrow(/INSUFFICIENT_GOLD/)
 expect((await wallet()).inventory.fuel).toBe(15)
})
it('requires ownership and fuel, schedules per-boat trips and consumes fuel only once',async()=>{
 await expect(action('depart','fishing-raft')).rejects.toThrow(/NOT_OWNED/)
 await action('buy','fishing-raft');await action('buy','neoul-boat')
 const op=crypto.randomUUID(),a=await action('depart','fishing-raft',null,1,op)
 await action('depart','fishing-raft',null,1,op)
 expect(Date.parse(a.voyages[0].returns_at)-Date.parse(a.voyages[0].departed_at)).toBeCloseTo(30*60000,-2)
 await expect(action('depart','fishing-raft')).rejects.toThrow(/ACTIVE/)
 const b=await action('depart','neoul-boat')
 expect(b.voyages).toHaveLength(2);expect((await wallet()).inventory).toEqual({bait:40,fuel:7})
 const second=b.voyages.find(v=>v.vessel_id==='neoul-boat')
 expect(Date.parse(second.returns_at)-Date.parse(second.departed_at)).toBeCloseTo(120*60000,-2)
 await expect(action('claim',null,second.id)).rejects.toThrow(/NOT_READY/)
 await expect(action('arrive',null,second.id)).rejects.toThrow(/NOT_READY/)
 await ready();await action('claim_all');await db.exec("update public.player_wallets set inventory='{}'")
 await expect(action('depart','fishing-raft')).rejects.toThrow(/INSUFFICIENT_FUEL/)
})
it('marks arrival without claiming and harvests all ready boats exactly once using their snapshots',async()=>{
 const countBefore=(await db.query('select count(*)::int n from public.player_collectibles where user_id=$1',[owner])).rows[0].n
 await action('buy','fishing-raft');await action('buy','neoul-boat');await action('depart','fishing-raft');const s=await action('depart','neoul-boat')
 await ready();const arrival=await action('arrive',null,s.voyages[0].id)
 expect(arrival.voyages.find(v=>v.id===s.voyages[0].id).arrival_seen_at).toBeTruthy()
 // Catalog edits after departure must not increase or decrease reserved attempts.
 await db.exec('update public.harbor_vessels set fishing_count=99')
 const op=crypto.randomUUID(),claim=await action('claim_all',null,null,1,op)
 await db.exec("update public.harbor_vessels set fishing_count=case id when 'fishing-raft' then 2 when 'neoul-boat' then 5 else 15 end")
 expect(claim.voyages).toEqual([])
 expect(claim.receipt.results.map(r=>r.attempted).sort()).toEqual([2,5])
 for(const result of claim.receipt.results)expect(result.items.length+result.failed).toBe(result.attempted)
 expect((await action('claim_all',null,null,1,op)).receipt).toEqual(claim.receipt)
 const again=await action('claim',null,s.voyages[0].id)
 expect(again.receipt.results[0]).toEqual(claim.receipt.results.find(r=>r.voyageId===s.voyages[0].id))
 expect((await action('claim_all')).receipt.results).toEqual([])
 expect((await wallet()).inventory.bait).toBe(40)
 const total=claim.receipt.results.reduce((n,r)=>n+r.items.length,0)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1',[owner])).rows[0].n).toBe(countBefore+total)
 await action('depart','fishing-raft')
})
it('isolates owners and denies anonymous, direct writes and legacy settlement bypasses',async()=>{
 await action('buy','fishing-raft');const s=await action('depart','fishing-raft')
 expect((await asUser(other,'select * from public.harbor_voyages')).rows).toEqual([])
 expect((await asUser(other,'select * from public.player_harbor_vessels')).rows).toEqual([])
 await expect(action('claim',null,s.voyages[0].id,1,crypto.randomUUID(),other)).rejects.toThrow(/NOT_FOUND/)
 await expect(action('fuel',null,null,1,crypto.randomUUID(),null)).rejects.toThrow(/permission denied/)
 await expect(asUser(owner,'update public.harbor_voyages set claimed_at=now()')).rejects.toThrow(/permission denied/)
 await expect(asUser(owner,'update public.player_wallets set gold=999999')).rejects.toThrow(/permission denied/)
 await expect(asUser(owner,"select app_private.settle_legacy_expedition('buy',gen_random_uuid(),'starlit')")).rejects.toThrow(/permission denied/)
})
it('fixes new expeditions to dinghy, caps cargo at 30 and schedules 10 minutes per loaded bait',async()=>{
 const run=async(vessel,cargo,op=crypto.randomUUID())=>(await asUser(owner,"select public.expedition_action('depart',$1,$2,'pongdang',$3,null) s",[op,vessel,cargo])).rows[0].s
 for(const cargo of [{bait:0},{bait:31},{bait:-1},{bait:1.5}])await expect(run('dinghy',cargo)).rejects.toThrow(/CARGO/)
 await expect(run('starlit',{bait:12})).rejects.toThrow(/RETIRED/)
 await expect(asUser(owner,"select public.expedition_action('buy',gen_random_uuid(),'starlit')")).rejects.toThrow(/RETIRED/)
 const op=crypto.randomUUID(),s=await run('dinghy',{bait:30},op)
 expect(s.vessels).toHaveLength(1);expect(s.active.vessel_snapshot.duration_minutes).toBe(300)
 expect(Date.parse(s.active.returns_at)-Date.parse(s.active.departed_at)).toBe(300*60000)
 const replay=await run('dinghy',{bait:30},op)
 expect(replay.active.returns_at).toBe(s.active.returns_at);expect((await wallet()).inventory.bait).toBe(10)
})
