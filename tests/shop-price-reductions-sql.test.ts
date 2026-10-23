// @vitest-environment node
import {expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'

it('reduces only shop prices, charges new prices and preserves paid-operation replays',async()=>{
 const db=await createLocalDatabase(),migration='20261023022940_lower_bait_and_fuel_shop_prices.sql',uid=crypto.randomUUID()
 try{
  for(const f of migrationFiles().filter(f=>f<migration))await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))
  await db.exec('update app_private.fishing_maintenance set released_at=starts_at')
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  await db.exec('select app_private.get_gold_wallet()')
  await db.query('update public.player_wallets set gold=10000 where user_id=$1',[uid])
  const oldBait=crypto.randomUUID(),oldFuel=crypto.randomUUID()
  await db.query("select public.buy_fishing_bait('bait_grubby_magnet',$1)",[oldBait])
  await db.query("select public.harbor_action('fuel',$1)",[oldFuel])
  const before=(await db.query('select id,to_jsonb(b)-\'price\' attributes,price from public.fishing_baits b order by id')).rows
  const oldGold=(await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold
  await db.exec(readFileSync('supabase/migrations/'+migration,'utf8'))
  const after=(await db.query('select id,to_jsonb(b)-\'price\' attributes,price from public.fishing_baits b order by id')).rows
  for(let i=0;i<before.length;i++){
   expect(after[i].attributes).toEqual(before[i].attributes)
   expect(after[i].price).toBe(before[i].price===null?null:before[i].id==='bait_grubby_magnet'?15:Math.round(before[i].price*.95))
  }
  await db.query("select public.buy_fishing_bait('bait_grubby_magnet',$1)",[oldBait])
  await db.query("select public.harbor_action('fuel',$1)",[oldFuel])
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(oldGold)
  await db.query("select public.buy_fishing_bait('bait_grubby_magnet',$1)",[crypto.randomUUID()])
  await db.query("select public.buy_fishing_bait('bait',$1)",[crypto.randomUUID()])
  const state=(await db.query("select public.harbor_action('fuel',$1,null,null,2) r",[crypto.randomUUID()])).rows[0].r
  expect(state.fuelPrice).toBe(57)
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(oldGold-15-48-114)
  expect((await db.query('select b.id from public.fishing_baits b join app_private.fishing_bait_balance_profiles p using(id) where b.price is distinct from p.price')).rows).toEqual([])
 }finally{await db.close()}
},60000)
