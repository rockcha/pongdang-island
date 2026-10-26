// @vitest-environment node
import {expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

it('buys, equips and sells the food-sea rod once, with its own habitat bonus',async()=>{
 const db=await createLocalDatabase(),uid=crypto.randomUUID()
 try{
  await replayMigrations(db)
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  await db.query('select public.fishing_rod_state()')
  await db.query('update public.player_wallets set gold=1000 where user_id=$1',[uid])
  await expect(db.query("select public.equip_fishing_rod('nyamnyam')")).rejects.toThrow('ROD_NOT_OWNED')
  const op=crypto.randomUUID()
  await db.query("select public.trade_fishing_rod('nyamnyam','buy',$1)",[op])
  await db.query("select public.trade_fishing_rod('nyamnyam','buy',$1)",[op])
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(200)
  await db.query("select public.equip_fishing_rod('nyamnyam')")
  const state=(await db.query('select public.fishing_rod_state() as value')).rows[0].value
  expect(state.selected).toBe('nyamnyam')
  expect(state.catalog.find(r=>r.id==='nyamnyam')).toMatchObject({price:800,region_id:'nyamnyam',native_bonus_bp:200,wait_reduction_seconds:1})
  for(const [primary,current,w] of [['nyamnyam','nyamnyam',2.2],['nyamnyam','pongdang',.15],['coral','nyamnyam',.05]] as const){
   expect((await db.query("select app_private.rod_habitat_weight($1,$2,'nyamnyam')::float8 as w",[primary,current])).rows[0].w).toBe(w)
  }
  const sell=crypto.randomUUID()
  await db.query("select public.trade_fishing_rod('nyamnyam','sell',$1)",[sell])
  await db.query("select public.trade_fishing_rod('nyamnyam','sell',$1)",[sell])
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(600)
  expect((await db.query('select public.fishing_rod_state() as value')).rows[0].value.selected).toBe('basic')
 }finally{await db.close()}
},60000)
