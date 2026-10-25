// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations,migrationFiles,readSql} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
it('starts with ten worms immediately and never credits them again on reconnect or retry',async()=>{
 const id='00000000-0000-0000-0000-000000000991'
 await db.query("insert into auth.users(id,raw_user_meta_data) values($1,'{\"game_nickname\":\"환영친구\"}')",[id])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'환영친구')",[id])
 await db.query('select app_private.send_welcome_gift($1)',[id])
 const gifts=(await db.query('select * from public.collectible_gifts where recipient_id=$1',[id])).rows
 expect(gifts).toHaveLength(1)
 expect(gifts.find(g=>g.reward_kind==='gold')).toMatchObject({quantity:500,status:'pending'})
 expect((await db.query('select inventory,gold from public.player_wallets where user_id=$1',[id])).rows[0]).toEqual({inventory:{bait:10},gold:0})
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id])
 await db.exec('set role authenticated')
 await db.query('select public.get_gold_wallet()')
 await db.query('select public.sync_player_profile()')
 await db.exec('reset role')
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[id])).rows[0].inventory.bait).toBe(10)
 await db.query('select app_private.send_welcome_gift($1)',[id])
 expect((await db.query("select count(*)::int n from public.collectible_gifts where recipient_id=$1 and reward_kind='bait'",[id])).rows[0].n).toBe(0)
 expect((await db.query('select quantity from app_private.starter_bait_receipts where user_id=$1',[id])).rows).toEqual([{quantity:10}])
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[id])).rows[0].inventory.bait).toBe(10)
})

it('adds the initial worms to a wallet created before nickname selection without replacing other inventory',async()=>{
 const id=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[id])
 await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,123,'{\"bait\":3,\"fuel\":7}')",[id])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'먼저접속')",[id])
 await db.query('select app_private.send_welcome_gift($1)',[id])
 expect((await db.query('select inventory,gold from public.player_wallets where user_id=$1',[id])).rows[0]).toEqual({inventory:{bait:13,fuel:7},gold:123})
})

it('preserves existing unclaimed five-worm gifts and wallets when installing the direct grant',async()=>{
 const previous=await createLocalDatabase(),migration='20261025043922_starter_worms_direct_inventory.sql'
 try{
 for(const file of migrationFiles()){if(file===migration)break;await previous.exec(readSql(`supabase/migrations/${file}`))}
 const id=crypto.randomUUID()
 await previous.query('insert into auth.users(id) values($1)',[id])
 await previous.query("insert into public.player_profiles(id,nickname) values($1,'기존친구')",[id])
 await previous.exec(readSql(`supabase/migrations/${migration}`))
 await previous.query('select app_private.send_welcome_gift($1)',[id])
 expect((await previous.query("select quantity,status from public.collectible_gifts where recipient_id=$1 and reward_kind='bait'",[id])).rows).toEqual([{quantity:5,status:'pending'}])
 expect((await previous.query('select inventory from public.player_wallets where user_id=$1',[id])).rows).toHaveLength(0)
 expect((await previous.query('select quantity from app_private.starter_bait_receipts where user_id=$1',[id])).rows).toEqual([{quantity:0}])
 await previous.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await previous.exec('set role authenticated')
 await previous.query("select public.claim_collectible_gift(id) from public.collectible_gifts where recipient_id=$1 and reward_kind='bait'",[id]);await previous.exec('reset role')
 expect((await previous.query('select inventory from public.player_wallets where user_id=$1',[id])).rows[0].inventory.bait).toBe(5)
 }finally{await previous.close()}
},60000)
