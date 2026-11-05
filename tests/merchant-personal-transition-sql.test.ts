// @vitest-environment node
import {expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'

it('preserves paid shared receipts and lets each player finish the transition board independently',async()=>{
 const db=await createLocalDatabase()
 try{
  const files=migrationFiles(),transition=files.findIndex(f=>f.endsWith('_personalize_sea_merchant.sql'))
  expect(transition).toBeGreaterThan(0)
  for(const file of files.slice(0,transition))await db.exec(readSql(`supabase/migrations/${file}`))
  const me=crypto.randomUUID(),other=crypto.randomUUID(),op=crypto.randomUUID()
  for(const id of [me,other]){
   await db.query('insert into auth.users(id) values($1)',[id])
   await db.query("insert into public.player_profiles(id,nickname) values($1,'기존납품자')",[id])
   await db.query('insert into public.player_wallets(user_id,gold) values($1,1000) on conflict(user_id) do update set gold=1000',[id])
  }
  async function as(user,sql,args=[]){
   await db.exec('set role authenticated')
   try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);return (await db.query(sql,args)).rows[0].s}
   finally{await db.exec('reset role')}
  }
  const state=user=>as(user,'select public.merchant_state() s')
  const deliver=(user,id,operation=crypto.randomUUID())=>as(user,'select public.deliver_merchant_order($1,$2,$3) s',[id,operation,'보존할 한마디'])
  const original=await state(me),order=original.orders[0]
  async function stock(user){for(const item of order.items)await db.query('insert into public.player_collectibles(user_id,species_id) select $1,$2 from generate_series(1,$3)',[user,item.speciesId,item.quantity])}
  await stock(me);await stock(other)
  const paid=await deliver(me,order.id,op)
  const prior=(await db.query('select * from app_private.merchant_deliveries where user_id=$1',[me])).rows[0]
  const wallet=(await db.query('select gold from public.player_wallets where user_id=$1',[me])).rows[0].gold
  const sold=(await db.query('select id,sold_at from public.player_collectibles where user_id=$1 order by id',[me])).rows
  for(const file of files.slice(transition))await db.exec(readSql(`supabase/migrations/${file}`))
  const mine=await state(me),theirs=await state(other)
  expect(mine.orders.map(o=>o.id)).toEqual(original.orders.map(o=>o.id))
  expect(mine.orders.find(o=>o.id===order.id)).toMatchObject({completed:true,mine:true,rewardGold:order.rewardGold,delivery:{nickname:'기존납품자',message:'보존할 한마디'}})
  expect(theirs.orders.find(o=>o.id===order.id)).toMatchObject({completed:false,mine:false,delivery:null})
  expect((await deliver(me,order.id,op)).receipt).toEqual(paid.receipt)
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[me])).rows[0].gold).toBe(wallet)
  expect((await db.query('select id,sold_at from public.player_collectibles where user_id=$1 order by id',[me])).rows).toEqual(sold)
  expect((await db.query('select * from app_private.merchant_deliveries where user_id=$1',[me])).rows[0]).toMatchObject(prior)
  expect((await as(other,'select public.menu_status() s')).merchant.ready).toBeGreaterThan(0)
  const second=await deliver(other,order.id)
  expect(second.orders.find(o=>o.id===order.id)).toMatchObject({completed:true,mine:true})
  expect((await db.query('select count(*)::int n from app_private.merchant_deliveries where order_id=$1',[order.id])).rows[0].n).toBe(2)
  for(const id of [me,other])expect((await db.query('select app_private.challenge_title_metrics($1) m',[id])).rows[0].m.challenge_deliveries).toBe(1)
  expect((await db.query('select completed_by from app_private.merchant_orders where id=$1',[order.id])).rows[0].completed_by).toBe(me)
  await expect(deliver(me,order.id)).rejects.toThrow('MERCHANT_ORDER_TAKEN')
  // Advancing the transition boundary simulates the next day's personal generation.
  await db.exec("update app_private.merchant_settings set transition_day=transition_day-1")
  const nextMine=await state(me),nextOther=await state(other)
  expect(nextMine.orders).toHaveLength(35);expect(nextOther.orders).toHaveLength(35)
  expect(nextMine.orders.map(o=>o.id)).not.toEqual(nextOther.orders.map(o=>o.id))
  expect(nextMine.orders.some(o=>original.orders.some(p=>p.id===o.id))).toBe(false)
  expect((await deliver(me,order.id,op)).replayed).toBe(true)
  await expect(deliver(me,nextOther.orders[0].id)).rejects.toThrow('MERCHANT_ORDER_NOT_FOUND')
 }finally{await db.close()}
},60000)
