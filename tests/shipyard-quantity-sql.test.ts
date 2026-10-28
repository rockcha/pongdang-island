// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const owner=crypto.randomUUID(),other=crypto.randomUUID()
async function user(sql,args=[]){await db.exec('set role authenticated');const result=await db.query(sql,args);await db.exec('reset role');return result}
async function buy(quantity=1,operation=crypto.randomUUID(),vessel='fishing-raft'){
 return (await user("select public.harbor_action('buy',$1,$2,null,$3) s",[operation,vessel,quantity])).rows[0].s
}
async function gold(){return (await db.query('select gold from public.player_wallets where user_id=$1',[owner])).rows[0].gold}
async function rejected(fn,message){await db.exec('savepoint rejected');await expect(fn()).rejects.toThrow(message);await db.exec('rollback to rejected;reset role')}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [i,id] of [owner,other].entries()){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,'Shipyard'+i])
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,100000,'{\"fuel\":100}') on conflict(user_id) do update set gold=100000",[id])
 }
},60000)
beforeEach(async()=>{await db.exec('begin');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner])})
afterEach(async()=>{await db.exec('rollback;reset role')})
afterAll(async()=>{await db?.close()})
it('buys a batch atomically, fills only available docks and replays without another charge',async()=>{
 const op=crypto.randomUUID(),result=await buy(4,op)
 const price=result.vessels.find(v=>v.id==='fishing-raft').price
 expect(result.boatPurchaseLimit).toBe(100)
 expect(result.receipt).toMatchObject({quantity:4,unitPrice:price,gold:price*4})
 expect(result.receipt.boatIds).toHaveLength(4)
 expect(new Set(result.boats.map(b=>b.instance_no)).size).toBe(4)
 expect(result.boats.filter(b=>b.dock_slot!==null)).toHaveLength(2)
 expect((await db.query('select distinct paid_price from public.harbor_boats where user_id=$1',[owner])).rows).toEqual([{paid_price:price}])
 expect(await gold()).toBe(100000-price*4)
 const replay=await buy(4,op)
 expect(replay.replayed).toBe(true);expect(replay.receipt).toEqual(result.receipt)
 expect(replay.boats).toHaveLength(4);expect(await gold()).toBe(100000-price*4)
 expect((await db.query('select delta from public.gold_transactions where user_id=$1 and operation_id=$2',[owner,op])).rows).toEqual([{delta:-price*4}])
 await rejected(()=>buy(3,op),'OPERATION_CONFLICT')
})
it.each([0,-1,101,null])('rejects invalid quantity %s without any boats or charge',async quantity=>{
 await rejected(()=>buy(quantity),'INVALID_BOAT_QUANTITY')
 expect(await gold()).toBe(100000)
 expect((await db.query('select count(*)::int n from public.harbor_boats where user_id=$1',[owner])).rows[0].n).toBe(0)
})
it('checks total affordability and handles the maximum quantity with unique instance numbers',async()=>{
 await db.query("update public.player_wallets set gold=(select price from public.harbor_vessels where id='fishing-raft') where user_id=$1",[owner])
 const before=await gold()
 await rejected(()=>buy(2),'INSUFFICIENT_GOLD')
 expect(await gold()).toBe(before)
 expect((await db.query('select count(*)::int n from public.harbor_boats where user_id=$1',[owner])).rows[0].n).toBe(0)
 await db.query('update public.player_wallets set gold=1000000 where user_id=$1',[owner])
 const result=await buy(100)
 expect(result.boats).toHaveLength(100)
 expect(new Set(result.boats.map(b=>b.instance_no)).size).toBe(100)
 expect(await gold()).toBe(1000000-result.receipt.gold)
})
it('keeps default single purchases, account isolation and anonymous denial',async()=>{
 const single=(await user("select public.harbor_action('buy',$1,'fishing-raft') s",[crypto.randomUUID()])).rows[0].s
 expect(single.receipt.quantity).toBe(1);expect(single.receipt.boatId).toBe(single.boats[0].id)
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other])
 expect((await buy(2)).boats).toHaveLength(2)
 expect((await db.query('select count(*)::int n from public.harbor_boats where user_id=$1',[owner])).rows[0].n).toBe(1)
 await db.exec('savepoint anonymous;set role anon')
 await expect(db.query("select public.harbor_action('buy',$1,'fishing-raft',null,2)",[crypto.randomUUID()])).rejects.toThrow(/permission denied/)
 await db.exec('rollback to anonymous;reset role')
})
