// @vitest-environment node
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
import catalog from '../supabase/catalog/catalog.json'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const owner='00000000-0000-0000-0000-000000000901',other='00000000-0000-0000-0000-000000000902'
async function asUser(uid,sql,args=[]){await db.exec(uid?'set role authenticated':'set role anon');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid??'']);return await db.query(sql,args)}finally{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)")}}
async function action(kind,vessel=null,voyage=null,quantity=1,op=crypto.randomUUID(),uid=owner){return (await asUser(uid,'select public.harbor_action($1,$2,$3,$4,$5) s',[kind,op,vessel,voyage,quantity])).rows[0].s}
async function wallet(){return (await db.query('select gold,inventory from public.player_wallets where user_id=$1',[owner])).rows[0]}
async function fleetAction(kind,boat,slot=null,uid=owner,op=crypto.randomUUID()){return (await asUser(uid,'select public.harbor_action($1,$2,null,null,1,$3,$4) s',[kind,op,boat,slot])).rows[0].s}
async function ready(){await db.exec("update public.harbor_voyages set departed_at=clock_timestamp()-interval '4 hours',returns_at=clock_timestamp()-interval '1 minute'")}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);for(const id of [owner,other]){await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,id===owner?'항구선장':'다른선장']);await db.query('insert into public.player_wallets(user_id,gold) values($1,10000) on conflict(user_id) do update set gold=10000',[id])}},60000)
beforeEach(async()=>{for(const v of catalog.harbor_vessels)await db.query('update public.harbor_vessels set catch_rule=$2 where id=$1',[v.id,JSON.stringify(v.catch_rule)]);await db.exec(`truncate app_private.push_deliveries,public.notifications,public.harbor_voyages,public.harbor_boats,public.player_harbor_vessels,app_private.harbor_operations;update public.player_wallets set gold=10000,inventory='{"bait":40,"fuel":10}'`)})
afterAll(async()=>{await db?.close()})
it('guarantees twelve catches for the full-catch boat and charges fuel only once',async()=>{
 await action('buy','full-catch')
 const op=crypto.randomUUID(),departed=await action('depart','full-catch',null,1,op)
 expect((await wallet()).inventory.fuel).toBe(0)
 expect((await action('depart','full-catch',null,1,op)).replayed).toBe(true)
 await ready()
 const claimOp=crypto.randomUUID(),result=await action('claim',null,departed.receipt.voyageId,1,claimOp)
 expect(result.receipt.results[0]).toMatchObject({attempted:12,succeeded:12,failed:0})
 expect((await action('claim',null,departed.receipt.voyageId,1,claimOp)).receipt).toEqual(result.receipt)
})
it('validates both twin-net destinations, snapshots them, and settles eleven attempts per region',async()=>{
 await db.exec("update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}','30')")
 const region=(await db.query("select id from public.regions where id<>'pongdang' order by id limit 1")).rows[0].id
 await action('buy','twin-net')
 const op=crypto.randomUUID()
 const depart=(second,operation=op)=>(asUser(owner,'select public.harbor_action($1,$2,$3,null,1,null,null,$4,$5) s',['depart',operation,'twin-net','pongdang',second])).then(r=>r.rows[0].s)
 await expect(depart(null)).rejects.toThrow('SECOND_REGION_REQUIRED')
 await expect(depart('pongdang')).rejects.toThrow('SECOND_REGION_REQUIRED')
 await expect(depart('missing-region')).rejects.toThrow('REGION_NOT_FOUND')
 await db.query('update public.regions set requires_map_fragment=true where id=$1',[region])
 await expect(depart(region)).rejects.toThrow('REGION_LOCKED')
 expect((await wallet()).inventory.fuel).toBe(30)
 await db.query('update public.regions set requires_map_fragment=false where id=$1',[region])
 const original=(await db.query("select pg_get_functiondef('app_private.harbor_draw(text,jsonb)'::regprocedure) definition")).rows[0].definition
 try{
  const departed=await depart(region),trip=departed.voyages[0]
  expect(trip.vessel_snapshot).toMatchObject({secondary_region_id:region,fishing_count:22,catch_rule:{region_count:2,success_bp:9000}})
  expect((await wallet()).inventory.fuel).toBe(15)
  expect((await depart(region)).replayed).toBe(true)
  await expect(depart('missing-region')).rejects.toThrow('OPERATION_CONFLICT')
  await db.exec("create temporary table harbor_test_regions(region text);create or replace function app_private.harbor_draw(p_region text,p_rule jsonb) returns text language plpgsql set search_path='' as $$begin insert into pg_temp.harbor_test_regions values(p_region);return (select id from public.collectible_species where kind='fish' limit 1);end$$")
  await ready();const result=await action('claim',null,trip.id)
  expect(result.receipt.results[0]).toMatchObject({attempted:22,succeeded:22})
  const counts=(await db.query('select region,count(*)::integer n from harbor_test_regions group by region')).rows
  expect(counts).toEqual(expect.arrayContaining([{region:'pongdang',n:11},{region,n:11}]))
 }finally{await db.exec(original);await db.exec('drop table if exists pg_temp.harbor_test_regions');await db.query('update public.regions set requires_map_fragment=$2 where id=$1',[region,catalog.regions.find(r=>r.id===region).requires_map_fragment])}
})
it('sells at half price once, frees the slot, and reuses an available instance number',async()=>{
 const first=await action('buy','current-rider');await action('buy','current-rider')
 const boat=first.receipt.boatId,op=crypto.randomUUID()
 const sold=await fleetAction('sell',boat,null,owner,op)
 expect(sold.receipt).toMatchObject({action:'sell',boatId:boat,gold:350})
 expect(sold.boats.some(b=>b.id===boat)).toBe(false)
 expect((await wallet()).gold).toBe(8950)
 expect((await fleetAction('sell',boat,null,owner,op)).replayed).toBe(true)
 expect((await wallet()).gold).toBe(8950)
 await expect(fleetAction('sell',boat)).rejects.toThrow('VESSEL_NOT_OWNED')
 const again=await action('buy','current-rider')
 expect(again.boats.filter(b=>b.vessel_id==='current-rider').map(b=>b.instance_no).sort()).toEqual([1,2])
 expect(again.boats.find(b=>b.id===again.receipt.boatId).dock_slot).toBe(1)
})
it('rejects foreign, active and unclaimed boats, preserving voyage history after sale',async()=>{
 const bought=await action('buy','current-rider'),boat=bought.receipt.boatId
 await expect(fleetAction('sell',boat,null,other)).rejects.toThrow('VESSEL_NOT_OWNED')
 const departed=await action('depart','current-rider')
 await expect(fleetAction('sell',boat)).rejects.toThrow('VOYAGE_ACTIVE')
 await ready()
 await expect(fleetAction('sell',boat)).rejects.toThrow('VOYAGE_ACTIVE')
 await action('claim',null,departed.receipt.voyageId)
 await fleetAction('sell',boat)
 expect((await db.query('select count(*)::integer n from public.harbor_voyages where boat_id=$1',[boat])).rows[0].n).toBe(1)
 await expect(fleetAction('dock',boat,1)).rejects.toThrow('VESSEL_NOT_OWNED')
})
it('sells stored boats and rejects a wallet overflow without losing the boat',async()=>{
 const bought=await action('buy','current-rider'),boat=bought.receipt.boatId
 await fleetAction('store',boat)
 await db.query('update public.player_wallets set gold=1000000000 where user_id=$1',[owner])
 await expect(fleetAction('sell',boat)).rejects.toThrow('GOLD_LIMIT')
 expect((await wallet()).gold).toBe(1000000000)
 await db.query('update public.player_wallets set gold=10000 where user_id=$1',[owner])
 expect((await fleetAction('sell',boat)).receipt.gold).toBe(350)
 const raft=await action('buy','fishing-raft')
 expect((await fleetAction('sell',raft.receipt.boatId)).receipt.gold).toBe(200)
})
it('uses a weighted discovery profile and can finish when everything is discovered',async()=>{
 const chance=(await db.query("select pg_get_functiondef('app_private.expedition_success_chance_bp(text,integer)'::regprocedure) definition")).rows[0].definition
 await db.exec("update public.harbor_vessels set catch_rule=jsonb_set(catch_rule,'{success_bp}','10000')")
 try{
  await db.exec("update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}','100')")
  await action('buy','conch-explorer')
  const departed=await action('depart','conch-explorer'),trip=departed.voyages[0]
  expect(trip.vessel_snapshot).toMatchObject({price:2200,duration_minutes:420,fuel_cost:6,fishing_count:5,catch_bait_id:'bait_first_greeting'})
  await ready();const result=(await action('claim',null,trip.id)).receipt.results[0]
  expect(result.items).toHaveLength(5)
  expect(result.items.every(item=>['fish','trash','decoration'].includes(item.species.kind))).toBe(true)
  expect(trip.vessel_snapshot.catch_rule).toMatchObject({kind:'discovery_weighted',discovery_weight:2})
  await db.query('insert into public.player_discoveries(user_id,species_id) select $1,id from public.collectible_species on conflict do nothing',[owner])
  const again=await action('depart','conch-explorer');await ready()
  const empty=(await action('claim',null,again.voyages[0].id)).receipt.results[0]
  expect(empty).toMatchObject({attempted:5,failed:0})
  expect((await wallet()).inventory.bait).toBe(40)
 }finally{
  await db.exec(chance)
  await db.query('delete from public.player_discoveries where user_id=$1',[owner])
 }
})
it('uses shrimp for luxury voyages and worms for quick boats without spending bait inventory',async()=>{
 const chance=(await db.query("select pg_get_functiondef('app_private.expedition_success_chance_bp(text,integer)'::regprocedure) definition")).rows[0].definition
 await db.exec("update public.harbor_vessels set catch_rule=jsonb_set(catch_rule,'{success_bp}','10000')")
 try{
  for(const [id,price,minutes,fuel,count,bait] of [['moonpearl-luxury',3200,630,10,10,'bait_special'],['current-rider',700,15,1,4,'bait']]){
   await db.exec("update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}','100')")
   await action('buy',id)
   const departed=await action('depart',id),trip=departed.voyages.find(v=>v.vessel_id===id)
   expect(trip.vessel_snapshot).toMatchObject({price,duration_minutes:minutes,fuel_cost:fuel,fishing_count:count,catch_bait_id:bait})
   expect(Date.parse(trip.returns_at)-Date.parse(trip.departed_at)).toBeCloseTo(minutes*60000,-2)
   await ready();const claimed=await action('claim',null,trip.id),result=claimed.receipt.results[0]
   expect(result.items).toHaveLength(count)
   if(bait==='bait_special')expect(result.items.every(item=>['rare','epic','mythic'].includes(item.species.rarity))).toBe(true)
   expect((await wallet()).inventory.bait).toBe(40)
  }
 }finally{await db.exec(chance)}
})
it('saves the two new boats with their requested random attempt ranges',async()=>{
 for(const [id,price,minutes,fuel,min,max] of [['billow-rider',1600,360,5,12,24],['golden-luck',2500,480,7,18,32]]){
  await db.exec("update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}','100')")
  await action('buy',id)
  const op=crypto.randomUUID(),state=await action('depart',id,null,1,op)
  const trip=state.voyages.find(v=>v.vessel_id===id)
  expect(trip.vessel_snapshot).toMatchObject({price,duration_minutes:minutes,fuel_cost:fuel,fishing_count_max:max})
  expect(trip.vessel_snapshot.fishing_count).toBeGreaterThanOrEqual(min)
  expect(trip.vessel_snapshot.fishing_count).toBeLessThanOrEqual(max)
  const replay=await action('depart',id,null,1,op)
  expect(replay.voyages.find(v=>v.id===trip.id).vessel_snapshot).toEqual(trip.vessel_snapshot)
 }
})
it('snapshots specialized bait and native effects and settles their matching catch pools',async()=>{
 const pick=(await db.query("select pg_get_functiondef('app_private.expedition_pick(text,text,boolean,boolean)'::regprocedure) definition")).rows[0].definition
 const chance=(await db.query("select pg_get_functiondef('app_private.expedition_success_chance_bp(text,integer)'::regprocedure) definition")).rows[0].definition
 await db.exec("update public.harbor_vessels set catch_rule=jsonb_set(catch_rule,'{success_bp}','10000')")
 try{
  for(const [id,bait,native,count] of [['waterway-explorer','bait',true,10],['pearl-salvager','bait_magnet',false,8],['scrap-gobbler','bait_grubby_magnet',false,18],['starlit-cruiser','bait',false,null]]){
   await db.exec('update public.player_wallets set gold=10000,inventory=jsonb_build_object(\'fuel\',10)')
   const bought=await action('buy',id),boat=bought.boats.find(b=>b.vessel_id===id)
   if(boat.dock_slot===null)await fleetAction('dock',boat.id,1)
   const departed=await fleetAction('depart',boat.id),trip=departed.voyages.find(v=>v.boat_id===boat.id)
   expect(trip.vessel_snapshot).toMatchObject({catch_bait_id:bait,native_bonus:native})
   if(count)expect(trip.vessel_snapshot.fishing_count).toBe(count)
   else expect(trip.vessel_snapshot.fishing_count).toBeGreaterThanOrEqual(30)
   expect(trip.vessel_snapshot.fishing_count).toBeLessThanOrEqual(40)
   expect(trip.vessel_snapshot.catch_rule.home_multiplier).toBe(native?1.5:1)
   await ready();const claimed=await action('claim',null,trip.id),result=claimed.receipt.results[0]
   expect(result.attempted).toBe(trip.vessel_snapshot.fishing_count)
   expect(result.items).toHaveLength(result.attempted)
   if(bait==='bait_magnet')expect(result.items.every(item=>item.species.kind==='decoration')).toBe(true)
   if(bait==='bait_grubby_magnet')expect(result.items.every(item=>['fish','trash'].includes(item.species.kind))).toBe(true)
   await db.exec(pick)
   await fleetAction('store',boat.id)
  }
 }finally{await db.exec(pick);await db.exec(chance)}
})
it('never counts harbor departures or claimed catches toward fishing quests',async()=>{
 const progress=async()=>{
  const s=(await asUser(owner,'select public.quest_state() s')).rows[0].s
  return ['daily','weekly'].flatMap(period=>s[period].quests.filter(q=>['fish','weekly_fish','rare','epic','trash','decor','depart'].includes(q.id)).map(q=>[period,q.id,q.progress]))
 }
 const before=await progress()
 await action('buy','fishing-raft');await action('depart','fishing-raft')
 expect(await progress()).toEqual(before)
 // Force a successful settlement in this fixture so quest exclusion is exercised.
 const original=(await db.query("select pg_get_functiondef('app_private.expedition_success_chance_bp(text,integer)'::regprocedure) definition")).rows[0].definition
 await db.exec("update public.harbor_voyages set vessel_snapshot=jsonb_set(vessel_snapshot,'{catch_rule,success_bp}','10000') where claimed_at is null")
 try{
  await ready();const claim=await action('claim_all')
  expect(claim.receipt.results[0].succeeded).toBe(2)
  expect(await progress()).toEqual(before)
 }finally{
  await db.exec(original)
 }
})
it('operates two boats of the same kind independently and keeps both dock reservations',async()=>{
 await action('buy','fishing-raft');const purchased=await action('buy','fishing-raft')
 expect(purchased.boats.map(b=>b.instance_no).sort()).toEqual([1,2])
 expect(purchased.boats.map(b=>b.dock_slot).sort()).toEqual([1,2])
 for(const boat of purchased.boats)await fleetAction('depart',boat.id)
 const state=(await asUser(owner,'select public.harbor_state() s')).rows[0].s
 expect(new Set(state.voyages.map(v=>v.boat_id)).size).toBe(2)
 expect((await wallet()).inventory.fuel).toBe(10)
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
 expect(trip.vessel_snapshot).toMatchObject({price:1500,duration_minutes:480,fuel_cost:9,fishing_count:28})
 expect((await wallet()).inventory.fuel).toBe(1)
})
it('isolates physical boats and rejects invalid dock numbers and direct edits',async()=>{
 const state=await action('buy','fishing-raft'),boat=state.boats[0]
 await expect(fleetAction('store',boat.id,null,other)).rejects.toThrow(/NOT_OWNED/)
 expect((await asUser(other,'select * from public.harbor_boats')).rows).toEqual([])
 for(const slot of [0,3,null])await expect(fleetAction('dock',boat.id,slot)).rejects.toThrow(/INVALID_DOCK_SLOT/)
 await expect(asUser(owner,'update public.harbor_boats set dock_slot=null')).rejects.toThrow(/permission denied/)
 await expect(asUser(owner,"select app_private.settle_legacy_harbor('buy',gen_random_uuid(),'fishing-raft')")).rejects.toThrow(/permission denied/)
})
it('buys more than two boats of one type, stores overflow, and never double charges retries',async()=>{
 const initial=(await asUser(owner,'select public.harbor_state() s')).rows[0].s
 expect(initial.vessels.slice(0,4).map(v=>[v.name,v.duration_minutes,v.fuel_cost,v.fishing_count])).toEqual([['낚시용 뗏목',40,0,2],['낚시용 드론',60,1,4],['너울 낚싯배',120,4,10],['해넘이 원양어선',480,9,28]])
 const op=crypto.randomUUID();await action('buy','fishing-raft',null,1,op);expect((await action('buy','fishing-raft',null,1,op)).replayed).toBe(true)
 expect((await wallet()).gold).toBe(9600)
 let purchased
 for(let i=0;i<5;i++)purchased=await action('buy','fishing-raft')
 expect(purchased.boats.map(b=>b.instance_no).sort((a,b)=>a-b)).toEqual([1,2,3,4,5,6])
 expect(purchased.boats.filter(b=>b.dock_slot!==null)).toHaveLength(2)
 expect(purchased.boats.filter(b=>b.dock_slot===null)).toHaveLength(4)
 expect(purchased.vessels.find(v=>v.id==='fishing-raft').ownedCount).toBe(6)
 expect((await wallet()).gold).toBe(7600)
 expect((await action('buy','fishing-raft',null,1,op)).replayed).toBe(true)
 expect((await wallet()).gold).toBe(7600)
 const third=purchased.boats.find(b=>b.instance_no===3)
 await fleetAction('sell',third.id)
 const replacement=await action('buy','fishing-raft')
 expect(replacement.boats.find(b=>b.id===replacement.receipt.boatId).instance_no).toBe(3)
 expect(new Set(replacement.boats.map(b=>b.instance_no)).size).toBe(6)
 await expect(action('buy','neoul-boat',null,1,op)).rejects.toThrow(/CONFLICT/)
})
it('buys fuel atomically, validates bounds and never double charges a retry',async()=>{
 const op=crypto.randomUUID();await action('fuel',null,null,5,op);await action('fuel',null,null,5,op)
 expect(await wallet()).toMatchObject({gold:9715,inventory:{fuel:15,bait:40}})
 for(const count of [0,-1,101,null])await expect(action('fuel',null,null,count)).rejects.toThrow(/QUANTITY/)
 await db.exec('update public.player_wallets set gold=0')
 await expect(action('fuel')).rejects.toThrow(/FUEL_DAILY_LIMIT/)
 expect((await wallet()).inventory.fuel).toBe(15)
})
it('enforces the cumulative Korean-day fuel allowance, isolates accounts and resets at midnight',async()=>{
 await action('fuel',null,null,2)
 const before=await wallet()
 await expect(action('fuel',null,null,4)).rejects.toThrow(/FUEL_DAILY_LIMIT/)
 expect(await wallet()).toEqual(before)
 const full=await action('fuel',null,null,3)
 expect(full).toMatchObject({fuelPrice:57,fuelDailyLimit:5,fuelPurchasedToday:5})
 await expect(action('fuel')).rejects.toThrow(/FUEL_DAILY_LIMIT/)
 expect((await action('fuel',null,null,5,crypto.randomUUID(),other)).fuelPurchasedToday).toBe(5)
 await db.query("update app_private.harbor_operations set created_at=((clock_timestamp() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')-interval '1 second' where user_id=$1",[owner])
 const next=await action('fuel')
 expect(next.fuelPurchasedToday).toBe(1)
 expect((await wallet()).inventory.fuel).toBe(16)
})
it('requires ownership and fuel, schedules per-boat trips and consumes fuel only once',async()=>{
 await expect(action('depart','fishing-raft')).rejects.toThrow(/NOT_OWNED/)
 await action('buy','fishing-raft');await action('buy','neoul-boat')
 const op=crypto.randomUUID(),a=await action('depart','fishing-raft',null,1,op)
 await action('depart','fishing-raft',null,1,op)
 expect(Date.parse(a.voyages[0].returns_at)-Date.parse(a.voyages[0].departed_at)).toBeCloseTo(40*60000,-2)
 await expect(action('depart','fishing-raft')).rejects.toThrow(/ACTIVE/)
 const b=await action('depart','neoul-boat')
 expect(b.voyages).toHaveLength(2);expect((await wallet()).inventory).toEqual({bait:40,fuel:6})
 const second=b.voyages.find(v=>v.vessel_id==='neoul-boat')
 expect(Date.parse(second.returns_at)-Date.parse(second.departed_at)).toBeCloseTo(120*60000,-2)
 await expect(action('claim',null,second.id)).rejects.toThrow(/NOT_READY/)
 await expect(action('arrive',null,second.id)).rejects.toThrow(/NOT_READY/)
 await ready();await action('claim_all');await db.exec("update public.player_wallets set inventory='{}'")
 await expect(action('depart','neoul-boat')).rejects.toThrow(/INSUFFICIENT_FUEL/)
})
it('marks arrival without claiming and harvests all ready boats exactly once using their snapshots',async()=>{
 const countBefore=(await db.query('select count(*)::int n from public.player_collectibles where user_id=$1',[owner])).rows[0].n
 await action('buy','fishing-raft');await action('buy','neoul-boat');await action('depart','fishing-raft');const s=await action('depart','neoul-boat')
 await ready();const arrival=await action('arrive',null,s.voyages[0].id)
 expect(arrival.voyages.find(v=>v.id===s.voyages[0].id).arrival_seen_at).toBeTruthy()
 // Catalog edits after departure must not increase or decrease reserved attempts.
 const catalog=(await db.query('select id,fishing_count,fishing_count_max from public.harbor_vessels')).rows
 await db.exec("update public.harbor_vessels set fishing_count=99,fishing_count_max=null where coalesce((catch_rule->>'region_count')::integer,1)=1")
 const op=crypto.randomUUID(),claim=await action('claim_all',null,null,1,op)
 for(const v of catalog)await db.query('update public.harbor_vessels set fishing_count=$2,fishing_count_max=$3 where id=$1',[v.id,v.fishing_count,v.fishing_count_max])
 expect(claim.voyages).toEqual([])
 expect(claim.receipt.results.map(r=>r.attempted).sort((a,b)=>a-b)).toEqual([2,10])
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
it('fixes new expeditions to dinghy, caps cargo at 30 and schedules 15 minutes per loaded bait',async()=>{
 const run=async(vessel,cargo,op=crypto.randomUUID())=>(await asUser(owner,"select public.expedition_action('depart',$1,$2,'pongdang',$3,null) s",[op,vessel,cargo])).rows[0].s
 for(const cargo of [{bait:0},{bait:31},{bait:-1},{bait:1.5}])await expect(run('dinghy',cargo)).rejects.toThrow(/CARGO/)
 await expect(run('starlit',{bait:12})).rejects.toThrow(/RETIRED/)
 await expect(asUser(owner,"select public.expedition_action('buy',gen_random_uuid(),'starlit')")).rejects.toThrow(/RETIRED/)
 const op=crypto.randomUUID(),s=await run('dinghy',{bait:30},op)
 expect(s.vessels).toHaveLength(1);expect(s.active.vessel_snapshot.duration_minutes).toBe(450)
 expect(Date.parse(s.active.returns_at)-Date.parse(s.active.departed_at)).toBe(450*60000)
 const replay=await run('dinghy',{bait:30},op)
 expect(replay.active.returns_at).toBe(s.active.returns_at);expect((await wallet()).inventory.bait).toBe(10)
})

it('allows a raft without fuel and snapshots the random drone attempts exactly once',async()=>{
 await db.exec("update public.player_wallets set inventory='{}'")
 await action('buy','fishing-raft');await action('depart','fishing-raft')
 expect((await wallet()).inventory.fuel??0).toBe(0)
 await action('buy','fishing-drone');await action('fuel')
 const op=crypto.randomUUID(),state=await action('depart','fishing-drone',null,1,op)
 const trip=state.voyages.find(v=>v.vessel_id==='fishing-drone')
 expect([4,5]).toContain(trip.vessel_snapshot.fishing_count)
 expect(trip.vessel_snapshot.fishing_count_max).toBe(5)
 const replay=await action('depart','fishing-drone',null,1,op)
 expect(replay.voyages.find(v=>v.id===trip.id).vessel_snapshot).toEqual(trip.vessel_snapshot)
 expect((await wallet()).inventory.fuel).toBe(0)
 await ready();const claim=await action('claim',null,trip.id)
 expect(claim.receipt.results[0].attempted).toBe(trip.vessel_snapshot.fishing_count)
})
