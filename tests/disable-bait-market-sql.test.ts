// @vitest-environment node
import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'
it('closes legacy bait sales and buy requests, returns all bundle lines and money once, and preserves fuel-only sales',async()=>{
 const db=await createLocalDatabase(),owner='00000000-0000-0000-0000-000000000911'
 try{
  const stop=migrationFiles().find(f=>f.endsWith('_disable_bait_market_trading.sql'))!
  for(const file of migrationFiles()){if(file===stop)break;await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))}
  await db.query('insert into auth.users(id) values($1)',[owner])
  await db.query("insert into public.player_profiles(id,nickname) values($1,'정리퐁')",[owner])
  await db.query(`insert into public.player_wallets(user_id,gold,inventory) values($1,1000,'{"fuel":10,"bait":10}') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory`,[owner])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner])
  const mixed=(await db.query("select public.exchange_post_bundle($1,100,$2) value",[JSON.stringify([{kind:'bait',id:'bait',quantity:2},{kind:'fuel',id:'fuel',quantity:3}]),crypto.randomUUID()])).rows[0].value
  const valid=(await db.query("select public.exchange_post('sell','fuel','fuel',1,'gold','gold',10,$1) value",[crypto.randomUUID()])).rows[0].value
  const held=(await db.query("select app_private.exchange_reserve($1,app_private.exchange_asset('gold','gold',200)) id",[owner])).rows[0].id
  // Model a historical buy escrow; current sales-only constraints prevent creating one normally.
  await db.exec('alter table public.exchange_listings drop constraint exchange_active_sale_only')
  await db.query("insert into public.exchange_listings(owner_id,owner_name,side,operation_id,offer,wanted,escrow_gift_id) values($1,'정리퐁','buy',$2,app_private.exchange_asset('gold','gold',200),app_private.exchange_asset('bait','bait',5),$3)",[owner,crypto.randomUUID(),held])
  await db.exec(readFileSync('supabase/migrations/'+stop,'utf8'))
  expect((await db.query('select status from public.exchange_listings where id=$1',[mixed.id])).rows[0].status).toBe('cancelled')
  expect((await db.query('select status from public.exchange_listings where id=$1',[valid.id])).rows[0].status).toBe('active')
  const returns=(await db.query("select id from public.collectible_gifts where not exchange_hold and source='exchange'")).rows
  expect(returns).toHaveLength(3)
  for(const parcel of returns){await db.query('select public.claim_collectible_gift($1)',[parcel.id]);await db.query('select public.claim_collectible_gift($1)',[parcel.id])}
  const wallet=(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[owner])).rows[0]
  expect(wallet.gold).toBe(1000);expect(wallet.inventory.bait).toBe(10);expect(wallet.inventory.fuel).toBe(9)
  await expect(db.query("select public.exchange_post_bundle($1,100,$2)",[JSON.stringify([{kind:'fuel',id:'fuel',quantity:1},{kind:'bait',id:'bait',quantity:1}]),crypto.randomUUID()])).rejects.toThrow('EXCHANGE_BAIT_DISABLED')
 }finally{await db.close()}
},60000)
