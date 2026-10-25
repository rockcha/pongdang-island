// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const [owner,other]=[crypto.randomUUID(),crypto.randomUUID()]
async function user(sql,args=[]){await db.exec('set role authenticated');const r=await db.query(sql,args);await db.exec('reset role');return r}
async function state(){return (await user('select public.aquarium_state() s')).rows[0].s}
async function upgrade(tank,capacity,op=crypto.randomUUID()){return (await user('select public.expand_aquarium_tank($1,$2,$3) s',[tank,capacity,op])).rows[0].s}
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
it('charges 1000 per twenty places on only one tank, with idempotent receipts',async()=>{
 const t=(await state()).tanks[0].id,op=crypto.randomUUID()
 await db.query('insert into public.aquarium_tanks(user_id) values($1)',[owner])
 let result=await upgrade(t,70,op)
 expect(result.tanks.find(x=>x.id===t)).toMatchObject({capacity:70,nextCapacityExpansion:{capacity:90,price:1000}})
 expect(result.tanks.find(x=>x.id!==t).capacity).toBe(50);expect(await gold()).toBe(14000)
 await upgrade(t,70,op);expect(await gold()).toBe(14000)
 await rejected(()=>upgrade(t,90,op),'OPERATION_CONFLICT')
 await upgrade(t,90);result=await upgrade(t,110);expect(result.tanks.find(x=>x.id===t).capacity).toBe(110)
 expect(await gold()).toBe(12000);await upgrade(t,70,op);expect(await gold()).toBe(12000)
 await db.query('insert into public.aquarium_tanks(user_id) values($1)',[owner]);expect((await state()).tanks.filter(x=>x.capacity===50)).toHaveLength(2)
})
it('preserves legacy account-wide benefits for existing and future tanks and recovers old receipts',async()=>{
 const op=crypto.randomUUID()
 await db.query('insert into app_private.player_aquarium_capacity(user_id,capacity) values($1,70)',[owner])
 await db.query("insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values($1,$2,'buy','aquarium-capacity:70',-5000)",[owner,op])
 const t=(await state()).tanks[0].id
 expect((await state()).tanks[0].capacity).toBe(70)
 await user('select public.expand_aquarium_capacity(70,$1)',[op]);expect(await gold()).toBe(15000)
 await rejected(()=>user('select public.expand_aquarium_capacity(70,$1)',[crypto.randomUUID()]),'AQUARIUM_EXPANSION_CHANGED')
 await upgrade(t,90);await db.query('insert into public.aquarium_tanks(user_id) values($1)',[owner])
 expect((await state()).tanks.map(x=>x.capacity).sort()).toEqual([70,90]);expect(await gold()).toBe(14000)
})
it('enforces per-tank admissions and allows more than 100 across multiple batches',async()=>{
 const t=(await state()).tanks[0].id,ids=await items(111)
 await rejected(()=>move(ids.slice(0,51),t),'TANK_FULL')
 await upgrade(t,70);await move(ids.slice(0,70),t);await rejected(()=>move([ids[70]],t),'TANK_FULL')
 await upgrade(t,90);await upgrade(t,110);await move(ids.slice(70,110),t);await rejected(()=>move([ids[110]],t),'TANK_FULL')
 expect((await state()).inhabitants).toHaveLength(110)
 await move(ids.slice(0,100),null);expect((await state()).inhabitants).toHaveLength(10)
})
it('rejects stale targets, insufficient gold, foreign tanks and reused operations atomically',async()=>{
 const t=(await state()).tanks[0].id
 await rejected(()=>upgrade(t,90),'CAPACITY_CHANGED')
 await db.query('update public.player_wallets set gold=999 where user_id=$1',[owner])
 await rejected(()=>upgrade(t,70),'INSUFFICIENT_GOLD');expect((await state()).tanks[0].capacity).toBe(50);expect(await gold()).toBe(999)
 await db.query('update public.player_wallets set gold=15000 where user_id=$1',[owner])
 await db.exec('savepoint purchase');await upgrade(t,70);await db.exec('rollback to purchase');expect(await gold()).toBe(15000)
 const foreign=(await db.query('insert into public.aquarium_tanks(user_id) values($1) returning id',[other])).rows[0].id
 await rejected(()=>upgrade(foreign,70),'TANK_NOT_FOUND')
 const op=crypto.randomUUID();await db.query("insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values($1,$2,'buy','other',-1)",[owner,op])
 await rejected(()=>upgrade(t,70,op),'OPERATION_CONFLICT')
 await upgrade(t,70);await rejected(()=>upgrade(t,70),'CAPACITY_CHANGED');expect(await gold()).toBe(14000)
})
it('denies direct capacity edits and anonymous purchases',async()=>{
 const t=(await state()).tanks[0].id
 await rejected(()=>user('update public.aquarium_tanks set capacity_bonus=20'),'permission denied')
 await rejected(()=>user('update app_private.player_aquarium_capacity set capacity=100'),'permission denied')
 await db.exec('savepoint anon;set role anon');await expect(db.query('select public.expand_aquarium_tank($1,70,$2)',[t,crypto.randomUUID()])).rejects.toThrow(/permission denied/)
 await db.exec('rollback to anon;reset role');expect(await gold()).toBe(15000)
})
