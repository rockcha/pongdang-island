// @vitest-environment node
import {expect,it} from 'vitest'
import fs from 'node:fs'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
it('trades the pirate rod at 1500, preserves equipped ownership on catalog replay, and uses its own habitat bonus',async()=>{
 const db=await createLocalDatabase(),uid=crypto.randomUUID()
 try{
  await replayMigrations(db)
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  await db.query('select public.fishing_rod_state()')
  await db.query('update public.player_wallets set gold=4000 where user_id=$1',[uid])
  await expect(db.query("select public.equip_fishing_rod('plunder')")).rejects.toThrow('ROD_NOT_OWNED')
  const operation=crypto.randomUUID()
  await db.query("select public.trade_fishing_rod('plunder','buy',$1)",[operation])
  await db.query("select public.trade_fishing_rod('plunder','buy',$1)",[operation])
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(2500)
  await db.query("select public.equip_fishing_rod('plunder')")
  await db.exec(fs.readFileSync('supabase/migrations/20261027013420_plunder_rod_and_theme_rod_prices.sql','utf8'))
  const state=(await db.query('select public.fishing_rod_state() value')).rows[0].value
  expect(state.owned).toContain('plunder');expect(state.selected).toBe('plunder')
  expect(state.catalog.find(r=>r.id==='plunder')).toMatchObject({price:1500,region_id:'plunder',native_bonus_bp:200,wait_reduction_seconds:1})
  expect(state.catalog.find(r=>r.id==='nyamnyam')).toMatchObject({price:1500,region_id:'nyamnyam'})
  for(const [primary,current,w] of [['plunder','plunder',2.2],['plunder','pongdang',.15],['coral','plunder',.05]] as const)
   expect((await db.query("select app_private.rod_habitat_weight($1,$2,'plunder')::float8 w",[primary,current])).rows[0].w).toBe(w)
  await db.query("select public.trade_fishing_rod('plunder','sell',$1)",[crypto.randomUUID()])
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(3250)
  expect((await db.query('select public.fishing_rod_state() value')).rows[0].value.selected).toBe('basic')
 }finally{await db.close()}
},60000)
