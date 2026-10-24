// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const [owner,other]=[crypto.randomUUID(),crypto.randomUUID()]
async function user(sql,args=[]){await db.exec('set role authenticated');const r=await db.query(sql,args);await db.exec('reset role');return r}
async function state(){return (await user('select public.aquarium_state() s')).rows[0].s}
async function upgrade(capacity,op=crypto.randomUUID()){return (await user('select public.expand_aquarium_capacity($1,$2) s',[capacity,op])).rows[0].s}
async function gold(){return (await db.query('select gold from public.player_wallets where user_id=$1',[owner])).rows[0].gold}
async function rejected(fn,error){await db.exec('savepoint rejected');await expect(fn()).rejects.toThrow(error);await db.exec('rollback to rejected;reset role')}
async function items(n){return (await db.query("insert into public.player_collectibles(user_id,species_id) select $1,'pongul' from generate_series(1,$2) returning id",[owner,n])).rows.map(r=>r.id)}
async function move(ids,tank){return user('select public.move_collectibles($1,$2)',[ids,tank])}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [i,id]of [owner,other].entries()){
  await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,'Tank'+i])
  await db.query('insert into public.player_wallets(user_id,gold) values($1,15000) on conflict(user_id) do update set gold=15000',[id])
 }
},60000)
beforeEach(async()=>{await db.exec('begin');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner])})
afterEach(async()=>{await db.exec('rollback;reset role')})
afterAll(async()=>{await db?.close()})
it('charges 5000 then 10000 once, applies account-wide and preserves old receipts',async()=>{
 expect(await state()).toMatchObject({tankCapacity:50,nextCapacityExpansion:{capacity:70,price:5000}})
 const first=crypto.randomUUID(),second=crypto.randomUUID()
 expect(await upgrade(70,first)).toMatchObject({tankCapacity:70,nextCapacityExpansion:{capacity:100,price:10000}})
 expect(await gold()).toBe(10000);await upgrade(70,first);expect(await gold()).toBe(10000)
 await rejected(()=>upgrade(100,first),'OPERATION_CONFLICT')
 expect(await upgrade(100,second)).toMatchObject({tankCapacity:100,nextCapacityExpansion:null});expect(await gold()).toBe(0)
 expect((await upgrade(70,first)).tankCapacity).toBe(100);expect(await gold()).toBe(0)
 await db.query('insert into public.aquarium_tanks(user_id) values($1)',[owner]);expect((await state()).tanks).toHaveLength(2)
 const hundred=await items(100);await move(hundred,(await state()).tanks[1].id)
 expect((await state()).inhabitants).toHaveLength(100)
 await rejected(()=>upgrade(100),'AQUARIUM_FULLY_EXPANDED')
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);expect((await state()).tankCapacity).toBe(50)
})
it('enforces 50/70/100 admissions, including full batches and all existing tanks',async()=>{
 const t=(await state()).tanks[0].id,ids=await items(101)
 await rejected(()=>move(ids.slice(0,51),t),'TANK_FULL')
 await move(ids.slice(0,50),t)
 await rejected(()=>move([ids[50]],t),'TANK_FULL')
 await upgrade(70);await move(ids.slice(50,70),t)
 await rejected(()=>move([ids[70]],t),'TANK_FULL')
 await upgrade(100);await move(ids.slice(70,100),t)
 await rejected(()=>move([ids[100]],t),'TANK_FULL')
 expect((await state()).inhabitants).toHaveLength(100)
 await move(ids.slice(0,100),null);expect((await state()).inhabitants).toHaveLength(0)
 await move(ids.slice(0,100),t);expect((await state()).inhabitants).toHaveLength(100)
})
it('rejects stale and unaffordable upgrades and rolls back charge and capacity together',async()=>{
 await rejected(()=>upgrade(100),'CAPACITY_CHANGED')
 await db.query('update public.player_wallets set gold=4999 where user_id=$1',[owner])
 await rejected(()=>upgrade(70),'INSUFFICIENT_GOLD');expect((await state()).tankCapacity).toBe(50);expect(await gold()).toBe(4999)
 await db.query('update public.player_wallets set gold=15000 where user_id=$1',[owner])
 await db.exec('savepoint purchase');await upgrade(70);await db.exec('rollback to purchase')
 expect(await gold()).toBe(15000);expect((await state()).tankCapacity).toBe(50)
 await upgrade(70);await rejected(()=>upgrade(70),'CAPACITY_CHANGED');expect(await gold()).toBe(10000)
 await db.query('update public.player_wallets set gold=9999 where user_id=$1',[owner]);await rejected(()=>upgrade(100),'INSUFFICIENT_GOLD')
})
it('denies direct edits, anonymous purchases and cross-feature operation reuse',async()=>{
 await rejected(()=>user('update app_private.player_aquarium_capacity set capacity=100'),'permission denied')
 const op=crypto.randomUUID()
 await db.query("insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values($1,$2,'buy','other',-1)",[owner,op])
 await rejected(()=>upgrade(70,op),'OPERATION_CONFLICT')
 await db.exec('savepoint anon;set role anon')
 await expect(db.query('select public.expand_aquarium_capacity(70,$1)',[crypto.randomUUID()])).rejects.toThrow(/permission denied/)
 await db.exec('rollback to anon;reset role');expect(await gold()).toBe(15000)
})
