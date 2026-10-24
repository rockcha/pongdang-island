// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const [owner,other]=[crypto.randomUUID(),crypto.randomUUID()]
async function user(sql,args=[]){await db.exec('set role authenticated');const r=await db.query(sql,args);await db.exec('reset role');return r}
async function action(kind,extras={},op=crypto.randomUUID()){
 return (await user('select public.harbor_action($1,$2,$3,null,1,$4,$5) s',[kind,op,extras.vessel??null,extras.boat??null,extras.slot??null])).rows[0].s
}
async function state(){return (await user('select public.harbor_state() s')).rows[0].s}
async function gold(){return (await db.query('select gold from public.player_wallets where user_id=$1',[owner])).rows[0].gold}
async function rejected(fn,message){await db.exec('savepoint rejected');await expect(fn()).rejects.toThrow(message);await db.exec('rollback to rejected;reset role')}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [i,id] of [owner,other].entries()){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,'Dock'+i])
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,100000,'{\"fuel\":100}') on conflict(user_id) do update set gold=100000,inventory=excluded.inventory",[id])
 }
},60000)
beforeEach(async()=>{await db.exec('begin');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner])})
afterEach(async()=>{await db.exec('rollback;reset role')})
afterAll(async()=>{await db?.close()})
it('starts at two and purchases permanent slots for a cumulative 40000, with replay-safe charges',async()=>{
 expect(await state()).toMatchObject({dockSlots:2,nextDockExpansion:{slot:3,price:10000}})
 const first=crypto.randomUUID(),second=crypto.randomUUID()
 expect(await action('expand',{slot:3},first)).toMatchObject({dockSlots:3,nextDockExpansion:{slot:4,price:30000},receipt:{action:'expand',gold:10000}})
 expect(await gold()).toBe(90000)
 expect((await action('expand',{slot:3},first)).replayed).toBe(true);expect(await gold()).toBe(90000)
 await rejected(()=>action('expand',{slot:4},first),'OPERATION_CONFLICT')
 expect(await action('expand',{slot:4},second)).toMatchObject({dockSlots:4,nextDockExpansion:null})
 expect(await gold()).toBe(60000)
 expect((await action('expand',{slot:3},first)).dockSlots).toBe(4)
 await rejected(()=>action('expand',{slot:5}),'HARBOR_FULLY_EXPANDED')
 expect(await gold()).toBe(60000)
 expect((await db.query("select count(*)::int n from public.gold_transactions where user_id=$1 and item_id like 'harbor-dock:%'",[owner])).rows[0].n).toBe(2)
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);expect((await state()).dockSlots).toBe(2)
})
it('blocks skipped/stale upgrades and insufficient gold without leaving charges or capacity',async()=>{
 await rejected(()=>action('expand',{slot:4}),'HARBOR_EXPANSION_CHANGED')
 await db.query('update public.player_wallets set gold=9999 where user_id=$1',[owner])
 await rejected(()=>action('expand',{slot:3}),'INSUFFICIENT_GOLD');expect((await state()).dockSlots).toBe(2);expect(await gold()).toBe(9999)
 await db.query('update public.player_wallets set gold=40000 where user_id=$1',[owner])
 await action('expand',{slot:3});await rejected(()=>action('expand',{slot:3}),'HARBOR_EXPANSION_CHANGED')
 expect(await gold()).toBe(30000)
 await action('expand',{slot:4});expect(await gold()).toBe(0)
})
it('allows four independent voyages, preserves active snapshots and claims all four once',async()=>{
 const boats=[]
 for(const vessel of ['fishing-raft','fishing-raft','current-rider','current-rider'])boats.push((await action('buy',{vessel})).receipt.boatId)
 expect((await state()).boats.filter(b=>b.dock_slot===null)).toHaveLength(2)
 await rejected(()=>action('dock',{boat:boats[2],slot:3}),'INVALID_DOCK_SLOT')
 const trip=(await action('depart',{boat:boats[0]})).voyages[0]
 await action('expand',{slot:3});await action('dock',{boat:boats[2],slot:3})
 await action('expand',{slot:4});await action('dock',{boat:boats[3],slot:4})
 for(const boat of boats.slice(1))await action('depart',{boat})
 const s=await state();expect(s.voyages).toHaveLength(4);expect(s.voyages.find(t=>t.id===trip.id)).toEqual(trip)
 await rejected(()=>action('store',{boat:boats[2]}),'VOYAGE_ACTIVE')
 await db.exec("update public.harbor_voyages set departed_at=clock_timestamp()-interval '1 day',returns_at=clock_timestamp()-interval '1 minute'")
 const op=crypto.randomUUID(),result=await action('claim_all',{},op)
 expect(result.receipt.results).toHaveLength(4);expect(result.voyages).toHaveLength(0)
 expect((await action('claim_all',{},op)).receipt).toEqual(result.receipt)
})
it('auto-assigns newly bought boats to unlocked slots and rolls back an expansion atomically',async()=>{
 await action('buy',{vessel:'fishing-raft'});await action('buy',{vessel:'fishing-raft'})
 const before=await gold();await db.exec('savepoint expansion')
 await action('expand',{slot:3});expect((await action('buy',{vessel:'current-rider'})).boats.find(b=>b.vessel_id==='current-rider').dock_slot).toBe(3)
 await db.exec('rollback to expansion');expect(await gold()).toBe(before);expect((await state()).dockSlots).toBe(2)
})
it('denies anonymous actions and direct capacity changes',async()=>{
 await rejected(()=>user('update app_private.player_harbor_capacity set dock_slots=4'),'permission denied')
 await db.exec('savepoint anonymous;set role anon')
 await expect(db.query("select public.harbor_action('expand',$1,null,null,1,null,3)",[crypto.randomUUID()])).rejects.toThrow(/permission denied/)
 await db.exec('rollback to anonymous;reset role');expect((await state()).dockSlots).toBe(2)
})
