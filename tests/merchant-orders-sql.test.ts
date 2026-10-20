// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const me='00000000-0000-0000-0000-000000009901',other='00000000-0000-0000-0000-000000009902'
async function asUser(user,sql,args=[]){await db.exec('savepoint merchant_call');await db.exec(user?'set role authenticated':'set role anon');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);return await db.query(sql,args)}catch(error){await db.exec('rollback to merchant_call');throw error}finally{await db.exec('reset role;release merchant_call')}}
const state=async(user=me)=>(await asUser(user,'select public.merchant_state() s')).rows[0].s
const deliver=async(id,op=crypto.randomUUID(),user=me)=>(await asUser(user,'select public.deliver_merchant_order($1,$2) s',[id,op])).rows[0].s
async function stock(order,user=me){for(const item of order.items)await db.query('insert into public.player_collectibles(user_id,species_id) select $1,$2 from generate_series(1,$3)',[user,item.speciesId,item.quantity])}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [id,name] of [[me,'납품퐁이'],[other,'다른상인']]){
  await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name]);
  await db.query('insert into public.player_wallets(user_id,gold) values($1,1000) on conflict(user_id) do update set gold=1000',[id])
 }
},60000)
beforeEach(async()=>{await db.exec('begin')})
afterEach(async()=>{await db.exec('rollback')})
afterAll(async()=>{await db?.close()})
it('generates exactly 40 shared daily orders with bounded recipes and stable snapshots',async()=>{
 const a=await state(),b=await state(other)
 expect(a.orders.map(o=>o.id)).toEqual(b.orders.map(o=>o.id));expect(a.orders).toHaveLength(40)
 const uses=new Map()
 for(const order of a.orders){
  expect(order.items.length).toBeGreaterThanOrEqual(1)
  expect(new Set(order.items.map(i=>i.speciesId)).size).toBe(order.items.length)
  expect(order.baseGold).toBe(order.items.reduce((s,i)=>s+i.quantity*i.unitGold,0))
  expect(order.rewardGold).toBeGreaterThan(order.baseGold)
  expect(order.items.every(i=>i.rarity==='common')).toBe(order.tier==='small')
  expect(order.items.some(i=>i.kind==='map')).toBe(false)
  expect(order.items.length).toBeLessThanOrEqual(3)
  expect(order.rewardGold).toBe(order.baseGold+(await db.query('select app_private.merchant_order_bonus($1::jsonb) n',[JSON.stringify(order.items)])).rows[0].n)
  expect(order.regionName).toBeNull()
  for(const item of order.items)if(item.quantity===2)expect(item.rarity).toBe('common')
  if(order.items.length>1){expect(order.items.filter(i=>i.quantity>1).length).toBeLessThanOrEqual(1);expect(order.items.reduce((s,i)=>s+i.quantity,0)).toBeLessThanOrEqual(order.items.length+1)}
  for(const item of order.items){expect(item.quantity).toBeGreaterThanOrEqual(1);expect(item.quantity).toBeLessThanOrEqual(item.rarity==='common'?2:1)}
  for(const item of order.items){uses.set(item.speciesId,(uses.get(item.speciesId)??0)+1);expect(item.owned).toBe(0)}
 }
 expect(Math.max(...uses.values())).toBeLessThanOrEqual(2)
 expect(new Date(a.resetsAt).getTime()).toBeGreaterThan(new Date(a.serverNow).getTime())
})
it('awards once, consumes exact storage quantities and closes the order to everyone',async()=>{
 const o=(await state()).orders[0];await stock(o);await stock(o,other)
 const op=crypto.randomUUID(),first=await deliver(o.id,op),again=await deliver(o.id,op)
 expect(first.receipt).toEqual({orderId:o.id,gold:o.rewardGold});expect(again.replayed).toBe(true)
 expect(again.deliveredToday).toBe(1);expect(again.orders.find(x=>x.id===o.id)).toMatchObject({completed:true,mine:true})
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[me])).rows[0].gold).toBe(1000+o.rewardGold)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and sold_at is not null',[me])).rows[0].n).toBe(o.items.reduce((s,i)=>s+i.quantity,0))
 await expect(deliver(o.id,crypto.randomUUID(),other)).rejects.toThrow('MERCHANT_ORDER_TAKEN')
 await expect(deliver((await state()).orders[1].id,op)).rejects.toThrow('OPERATION_CONFLICT')
})
it('rolls back incomplete stock without consuming anything or paying gold',async()=>{
 const o=(await state()).orders.find(o=>o.items.length>1||o.items[0].quantity>1)
 await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2)',[me,o.items[0].speciesId])
 // Use a savepoint because expected SQL errors abort an explicit transaction.
 await db.exec('savepoint failed_delivery')
 await expect(deliver(o.id)).rejects.toThrow('MERCHANT_INSUFFICIENT_ITEMS')
 await db.exec('rollback to failed_delivery')
 expect((await db.query('select count(*)::int n from public.player_collectibles where sold_at is not null')).rows[0].n).toBe(0)
 expect((await state()).deliveredToday).toBe(0)
})
it('allows one player to deliver all 40 orders without a personal cap',async()=>{
 const orders=(await state()).orders
 for(const o of orders){await stock(o);await deliver(o.id)}
 const final=await state()
 expect(final.deliveredToday).toBe(40);expect(final.dailyLimit).toBeNull()
 expect(final.orders.every(o=>o.completed&&o.mine)).toBe(true)
},30000)
it('excludes displayed aquarium items and other players stock from delivery',async()=>{
 const o=(await state()).orders[0];await stock(o,other)
 await expect(deliver(o.id)).rejects.toThrow('MERCHANT_INSUFFICIENT_ITEMS')
 await stock(o)
 await asUser(me,'select public.aquarium_state()')
 await db.query('update public.player_collectibles set tank_id=(select id from public.aquarium_tanks where user_id=$1 limit 1) where id=(select id from public.player_collectibles where user_id=$1 and species_id=$2 limit 1)',[me,o.items[0].speciesId])
 const current=(await state()).orders.find(x=>x.id===o.id)
 expect(current.items[0].owned).toBe(o.items[0].quantity-1)
 await expect(deliver(o.id)).rejects.toThrow('MERCHANT_INSUFFICIENT_ITEMS')
 expect((await db.query('select count(*)::int n from public.player_collectibles where sold_at is not null')).rows[0].n).toBe(0)
})
it('keeps gold ledger operation ids unique across features',async()=>{
 const o=(await state()).orders[0];await stock(o)
 const op=crypto.randomUUID()
 await db.query("insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values($1,$2,'sell','existing:sale',1)",[me,op])
 await expect(deliver(o.id,op)).rejects.toThrow('OPERATION_CONFLICT')
})
it('rejects yesterday orders and wallet overflow',async()=>{
 const o=(await state()).orders[0];await stock(o)
 await db.exec("insert into app_private.merchant_days(day) values((clock_timestamp() at time zone 'Asia/Seoul')::date-1)")
 await db.query("update app_private.merchant_orders set day=(clock_timestamp() at time zone 'Asia/Seoul')::date-1 where id=$1",[o.id])
 await db.exec('savepoint expired')
 await expect(deliver(o.id)).rejects.toThrow('MERCHANT_ORDER_EXPIRED');await db.exec('rollback to expired')
 await db.query("update app_private.merchant_orders set day=(clock_timestamp() at time zone 'Asia/Seoul')::date where id=$1",[o.id])
 await db.query('update public.player_wallets set gold=1000000000 where user_id=$1',[me])
 await expect(deliver(o.id)).rejects.toThrow('GOLD_LIMIT')
})
it('denies anonymous access and direct writes or generation',async()=>{
 await expect(state(null)).rejects.toThrow()
 await expect(asUser(me,'select app_private.ensure_merchant_orders()')).rejects.toThrow('permission denied')
 await expect(asUser(me,'select * from app_private.merchant_orders')).rejects.toThrow('permission denied')
})

it('resolves the exact daily mix and highest-grade odds without multiplying chances by item count',async()=>{
 const shapes=(await state()).orders.map(o=>o.items.map(i=>i.quantity).join(','))
 expect(shapes.filter(s=>s==='1')).toHaveLength(10)
 expect(shapes.filter(s=>s==='1,1')).toHaveLength(20)
 expect(shapes.filter(s=>s==='1,2')).toHaveLength(7)
 expect(shapes.filter(s=>s==='1,1,2')).toHaveLength(3)
 const grades=(await db.query("select app_private.merchant_order_grade(n)::text rarity,count(*)::int count from generate_series(0,9999)n group by 1 order by 1")).rows
 expect(grades).toEqual([{rarity:'common',count:7600},{rarity:'epic',count:370},{rarity:'mythic',count:30},{rarity:'rare',count:2000}])
})
it('stores the deliverer identity and message as an immutable receipt snapshot',async()=>{
 const o=(await state()).orders[0];await stock(o)
 const op=crypto.randomUUID(),args=[o.id,op,'첫 의뢰 완료!']
 const first=(await asUser(me,'select public.deliver_merchant_order($1,$2,$3) s',args)).rows[0].s
 expect(first.orders.find(x=>x.id===o.id).delivery).toEqual({nickname:'납품퐁이',avatarPath:null,message:'첫 의뢰 완료!'})
 await db.query("update public.player_profiles set nickname='새이름' where id=$1",[me])
 const again=(await asUser(me,'select public.deliver_merchant_order($1,$2,$3) s',args)).rows[0].s
 expect(again.replayed).toBe(true)
 expect(again.orders.find(x=>x.id===o.id).delivery).toEqual(first.orders.find(x=>x.id===o.id).delivery)
 await db.query("update public.player_profiles set avatar_path=$2 where id=$1",[me,me+'/current.webp'])
 expect((await state()).orders.find(x=>x.id===o.id).delivery).toEqual({nickname:'납품퐁이',avatarPath:me+'/current.webp',message:'첫 의뢰 완료!'})
 await expect(asUser(me,'select public.deliver_merchant_order($1,$2,$3) s',[o.id,op,'다른 말'])).rejects.toThrow('OPERATION_CONFLICT')
})
it('rejects oversized messages before consuming items',async()=>{
 const o=(await state()).orders[0];await stock(o)
 await expect(asUser(me,'select public.deliver_merchant_order($1,$2,$3)',[o.id,crypto.randomUUID(),'가'.repeat(81)])).rejects.toThrow('MERCHANT_MESSAGE_TOO_LONG')
 expect((await state()).deliveredToday).toBe(0)
})
it('replaces unfinished old-rule orders while preserving completed orders and replay receipts',async()=>{
 const before=await state(),o=before.orders[0];await stock(o)
 const op=crypto.randomUUID(),first=await deliver(o.id,op)
 await db.exec("update app_private.merchant_days set rules_version=1 where day=(clock_timestamp() at time zone 'Asia/Seoul')::date")
 const upgraded=await state()
 expect(upgraded.orders).toHaveLength(40)
 expect(upgraded.orders.find(x=>x.id===o.id)).toMatchObject({completed:true,rewardGold:o.rewardGold})
 expect(upgraded.orders.filter(x=>before.orders.some(p=>p.id===x.id))).toHaveLength(1)
 expect((await deliver(o.id,op)).receipt).toEqual(first.receipt)
 await expect(deliver(before.orders[1].id)).rejects.toThrow('MERCHANT_ORDER_NOT_FOUND')
})

it('computes every agreed bonus including multiple rares and epic or mythic supplements',async()=>{
 const bonus=async(grades,quantities)=> (await db.query('select app_private.merchant_order_bonus($1::jsonb) n',[JSON.stringify(grades.map((rarity,i)=>({rarity,quantity:quantities[i]})))])).rows[0].n
 for(const [rarity,expected] of [['common',80],['rare',100],['epic',250],['mythic',600]])expect(await bonus([rarity],[1])).toBe(expected)
 for(const [grades,quantities,expected] of [
  [['common','common'],[1,1],120],[['rare','common'],[1,1],200],[['rare','rare'],[1,1],250],
  [['common','common'],[1,2],200],[['rare','common'],[1,2],300],[['common','rare'],[1,2],380],[['rare','rare'],[1,2],500],
  [['common','common','common'],[1,1,2],300],[['rare','common','common'],[1,1,2],400],[['rare','rare','common'],[1,1,2],500],
  [['epic','common'],[1,1],370],[['mythic','common'],[1,2],800],[['epic','common','common'],[1,1,2],550],
 ])expect(await bonus(grades,quantities)).toBe(expected)
 await expect(asUser(me,'select app_private.merchant_order_bonus($1::jsonb)',[JSON.stringify([{rarity:'common',quantity:1}])])).rejects.toThrow('permission denied')
})
it('preserves receipts but replaces outdated v5 orders when upgrading to the fixed daily mix',async()=>{
 const before=await state(),completed=before.orders[0];await stock(completed)
 const op=crypto.randomUUID(),paid=await deliver(completed.id,op)
 await db.exec("update app_private.merchant_days set rules_version=5 where day=(clock_timestamp() at time zone 'Asia/Seoul')::date")
 const after=await state()
 expect(after.orders).toHaveLength(40)
 expect(after.orders.find(o=>o.id===completed.id)).toMatchObject({completed:true,rewardGold:completed.rewardGold})
 expect(after.orders.filter(o=>before.orders.some(p=>p.id===o.id))).toHaveLength(1)
 expect((await deliver(completed.id,op)).receipt).toEqual(paid.receipt)
 await expect(deliver(before.orders[1].id)).rejects.toThrow('MERCHANT_ORDER_NOT_FOUND')
})
