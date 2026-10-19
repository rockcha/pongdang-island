// @vitest-environment node
import {beforeAll,afterAll,beforeEach,afterEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations,migrationFiles} from '../scripts/db/local.mjs'
import {readFileSync} from 'node:fs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const maker='00000000-0000-0000-0000-000000000101',taker='00000000-0000-0000-0000-000000000102',other='00000000-0000-0000-0000-000000000103'
async function user(id:string,sql:string,args:unknown[]=[]){
 await db.exec('savepoint request')
 await db.exec('set role authenticated')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return await db.query(sql,args)}catch(error){await db.exec('rollback to savepoint request');throw error}finally{await db.exec('reset role;release savepoint request')}
}
async function post(owner=maker,side='buy',offerKind='gold',offerId='gold',offerQty=300,wantKind='collectible',wantId='soft-sea-cucumber',wantQty=1,operation=crypto.randomUUID()){
 return (await user(owner,'select public.exchange_post($1,$2,$3,$4,$5,$6,$7,$8) as value',[side,offerKind,offerId,offerQty,wantKind,wantId,wantQty,operation])).rows[0].value
}
async function act(id:string,action='accept',who=taker){return (await user(who,'select public.exchange_action($1,$2) as value',[id,action])).rows[0].value}
async function wallet(id:string){return (await db.query('select gold,inventory from public.player_wallets where user_id=$1',[id])).rows[0]}
async function claim(who:string,id:string){return (await user(who,'select public.claim_collectible_gift($1) as value',[id])).rows[0].value}
async function seedItem(who=taker,species='soft-sea-cucumber'){
 return (await db.query('insert into public.player_collectibles(user_id,species_id,tank_id) values($1,$2,null) returning id',[who,species])).rows[0].id
}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
beforeEach(async()=>{
 await db.exec('begin')
 for(const [id,nickname] of [[maker,'판매자'],[taker,'교환자'],[other,'구경꾼']]){
  await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,nickname])
  await db.query(`insert into public.player_wallets(user_id,gold,inventory) values($1,5000,'{"bait_special":10,"bait":10}') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory`,[id])
 }
})
afterEach(async()=>{await db.exec('rollback')})

const sale=(kind='collectible',id='soft-sea-cucumber',quantity=1,price=300,operation=crypto.randomUUID())=>post(maker,'sell',kind,id,quantity,'gold','gold',price,operation)
it('lets a non-friend buy an escrowed individual for gold and notifies both parties once',async()=>{
 const item=await seedItem(maker),listing=await sale()
 expect((await user(maker,'select * from public.player_collectibles where id=$1',[item])).rows).toHaveLength(0)
 await expect(claim(maker,listing.escrow_gift_id)).rejects.toThrow('GIFT_NOT_FOUND')
 expect((await db.query('select * from public.friend_requests')).rows).toHaveLength(0)
 await act(listing.id);await act(listing.id)
 expect((await wallet(taker)).gold).toBe(4700)
 expect((await wallet(maker)).gold).toBe(5000)
 const parcels=(await db.query('select * from public.collectible_gifts where not exchange_hold')).rows
 const payment=parcels.find((g:any)=>g.recipient_id===maker&&g.source==='exchange')
 await claim(maker,payment.id);await claim(maker,payment.id)
 expect((await wallet(maker)).gold).toBe(5300)
 await claim(taker,listing.escrow_gift_id)
 expect((await user(taker,'select * from public.player_collectibles where id=$1',[item])).rows).toHaveLength(1)
 expect((await db.query("select title from public.notifications where kind='gift_received' and gift_id in (select id from public.collectible_gifts where source='exchange') order by title")).rows.map((r:any)=>r.title)).toEqual(['구매가 완료됐어요','판매가 성사됐어요'])
 await expect(act(listing.id,'accept',other)).rejects.toThrow('EXCHANGE_UNAVAILABLE')
})
it('sells bait in a bundle and restores quantities through gifts',async()=>{
 const listing=await sale('bait','bait_special',3,500)
 expect((await wallet(maker)).inventory.bait_special).toBe(7)
 await act(listing.id);await claim(taker,listing.escrow_gift_id);await claim(taker,listing.escrow_gift_id)
 expect((await wallet(taker)).inventory.bait_special).toBe(13)
 expect((await wallet(taker)).gold).toBe(4500)
})
it('rejects buy orders, barter, gold offers and invalid quantities on the server',async()=>{
 await seedItem(maker)
 await expect(post()).rejects.toThrow('INVALID_EXCHANGE')
 await expect(post(maker,'sell','collectible','soft-sea-cucumber',1,'bait','bait',1)).rejects.toThrow('INVALID_EXCHANGE')
 await expect(post(maker,'sell','gold','gold',1,'gold','gold',2)).rejects.toThrow('INVALID_EXCHANGE')
 await expect(sale('collectible','map-bluegrove')).rejects.toThrow('INVALID_EXCHANGE_ASSET')
 await expect(sale('bait','bait_special',0)).rejects.toThrow('INVALID_EXCHANGE_ASSET')
 await expect(sale('bait','bait_special',1,0)).rejects.toThrow('INVALID_EXCHANGE_ASSET')
})
it('returns cancelled bait by mail and protects against self purchases and unauthorized cancellation',async()=>{
 const listing=await sale('bait','bait_special',3)
 await expect(act(listing.id,'cancel',other)).rejects.toThrow('EXCHANGE_FORBIDDEN')
 await expect(act(listing.id,'accept',maker)).rejects.toThrow('EXCHANGE_SELF_TRADE')
 await act(listing.id,'cancel',maker);await act(listing.id,'cancel',maker)
 expect((await wallet(maker)).inventory.bait_special).toBe(7)
 await claim(maker,listing.escrow_gift_id)
 expect((await wallet(maker)).inventory.bait_special).toBe(10)
 await expect(act(listing.id)).rejects.toThrow('EXCHANGE_UNAVAILABLE')
})
it('keeps stock reserved after an unaffordable purchase and blocks selling it twice',async()=>{
 const item=await seedItem(maker),listing=await sale('collectible','soft-sea-cucumber',1,6000)
 await expect(act(listing.id)).rejects.toThrow('INSUFFICIENT_GOLD')
 await expect(user(maker,'select public.sell_collectibles($1,$2)',[[item],crypto.randomUUID()])).rejects.toThrow()
 expect((await db.query('select status from public.exchange_listings where id=$1',[listing.id])).rows[0].status).toBe('active')
 expect((await wallet(taker)).gold).toBe(5000)
})
it('preserves post idempotency and the active listing limit',async()=>{
 const op=crypto.randomUUID(),first=await sale('bait','bait_special',1,300,op)
 expect((await sale('bait','bait_special',1,300,op)).id).toBe(first.id)
 expect((await wallet(maker)).inventory.bait_special).toBe(9)
 await expect(sale('bait','bait_special',1,301,op)).rejects.toThrow('OPERATION_CONFLICT')
 for(let i=1;i<10;i++)await sale('bait','bait_special',1,300)
 await expect(sale('bait','bait',1,300)).rejects.toThrow('EXCHANGE_LISTING_LIMIT')
})
it('protects tables and internal helpers from direct client access',async()=>{
 await expect(user(maker,"update public.exchange_listings set status='cancelled'")).rejects.toThrow('permission denied')
 await expect(user(maker,"select app_private.exchange_reserve($1,'{}')",[maker])).rejects.toThrow('permission denied')
})
it('returns legacy buy and barter escrow while preserving valid sales during migration',async()=>{
 const legacy=await createLocalDatabase()
 try{
  for(const file of migrationFiles()){
   if(file==='20261016164527_exchange_sales_only.sql')break
   await legacy.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  }
  await legacy.query('insert into auth.users(id) values($1)',[maker])
  await legacy.query("insert into public.player_profiles(id,nickname) values($1,'판매자')",[maker])
  await legacy.query("insert into public.player_wallets(user_id,gold,inventory) values($1,5000,'{\"bait\":10}') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory",[maker])
  await legacy.query("select set_config('request.jwt.claim.sub',$1,false)",[maker])
  await legacy.query('insert into public.player_collectibles(user_id,species_id) values($1,$2)',[maker,'glass-bottle'])
  await legacy.query('insert into public.player_collectibles(user_id,species_id) values($1,$2)',[maker,'soft-sea-cucumber'])
  for(const args of [['buy','gold','gold',300,'collectible','soft-sea-cucumber',1],['sell','collectible','glass-bottle',1,'bait','bait',1],['sell','collectible','soft-sea-cucumber',1,'gold','gold',300]]){
   await legacy.query('select public.exchange_post($1,$2,$3,$4,$5,$6,$7,$8)',[...args,crypto.randomUUID()])
  }
  await legacy.exec(readFileSync('supabase/migrations/20261016164527_exchange_sales_only.sql','utf8'))
  expect((await legacy.query("select status,count(*)::int n from public.exchange_listings group by status order by status")).rows).toEqual([{status:'active',n:1},{status:'cancelled',n:2}])
  const parcels=(await legacy.query("select public.gift_mailbox('received',0) as value")).rows[0].value.items
  expect(parcels).toHaveLength(2)
  expect((await legacy.query("select public.exchange_state('mine','',0) as value")).rows[0].value.items).toHaveLength(1)
  for(const gift of parcels)await legacy.query('select public.claim_collectible_gift($1)',[gift.id])
  expect((await legacy.query('select gold from public.player_wallets')).rows[0].gold).toBe(5000)
 }finally{await legacy.close()}
},60000)

