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
  await db.query(`insert into public.player_wallets(user_id,gold,inventory) values($1,5000,'{"fuel":10,"bait_special":10,"bait":10}') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory`,[id])
 }
})
afterEach(async()=>{await db.exec('rollback')})

const sale=(kind='collectible',id='soft-sea-cucumber',quantity=1,price=300,operation=crypto.randomUUID())=>post(maker,'sell',kind,id,quantity,'gold','gold',price,operation)
const bundle=(items:unknown[],price=300,operation=crypto.randomUUID())=>user(maker,'select public.exchange_post_bundle($1::jsonb,$2,$3) value',[JSON.stringify(items),price,operation]).then(result=>result.rows[0].value)
const mixed=[{kind:'fuel',id:'fuel',quantity:2},{kind:'collectible',id:'soft-sea-cucumber',quantity:1}]
it('settles every bundle item and the total payment exactly once',async()=>{
 const item=await seedItem(maker),op=crypto.randomUUID(),listing=await bundle(mixed,700,op)
 expect(listing.offer.items).toHaveLength(2)
 expect((await bundle([...mixed].reverse(),700,op)).id).toBe(listing.id)
 expect((await wallet(maker)).inventory.fuel).toBe(8)
 await expect(bundle(mixed,701,op)).rejects.toThrow('OPERATION_CONFLICT')
 const search=(await user(taker,"select public.exchange_state('all','해삼',0) value")).rows[0].value
 expect(search.total).toBe(1)
 await expect(user(maker,'select * from app_private.exchange_bundle_gifts')).rejects.toThrow('permission denied')
 await act(listing.id);await act(listing.id)
 expect((await wallet(taker)).gold).toBe(4300)
 const parcels=(await db.query('select gift_id from app_private.exchange_bundle_gifts where listing_id=$1',[listing.id])).rows
 expect(parcels).toHaveLength(2)
 for(const parcel of parcels){await claim(taker,parcel.gift_id);await claim(taker,parcel.gift_id)}
 expect((await wallet(taker)).inventory.fuel).toBe(12)
 expect((await user(taker,'select id from public.player_collectibles where id=$1',[item])).rows).toHaveLength(1)
 const payments=(await db.query("select id from public.collectible_gifts where recipient_id=$1 and reward_kind='gold' and source='exchange'",[maker])).rows
 expect(payments).toHaveLength(1)
 await claim(maker,payments[0].id)
 expect((await wallet(maker)).gold).toBe(5700)
 await expect(act(listing.id,'accept',other)).rejects.toThrow('EXCHANGE_UNAVAILABLE')
})
it('rolls back all reservations on a missing bundle item and returns every cancelled item',async()=>{
 await expect(bundle(mixed)).rejects.toThrow('EXCHANGE_INSUFFICIENT_ITEMS')
 expect((await wallet(maker)).inventory.fuel).toBe(10)
 expect((await db.query("select * from public.collectible_gifts where source='exchange'")).rows).toHaveLength(0)
 await seedItem(maker)
 const listing=await bundle(mixed,6000)
 await expect(act(listing.id)).rejects.toThrow('INSUFFICIENT_GOLD')
 expect((await wallet(taker)).gold).toBe(5000)
 await expect(act(listing.id,'cancel',other)).rejects.toThrow('EXCHANGE_FORBIDDEN')
 await act(listing.id,'cancel',maker);await act(listing.id,'cancel',maker)
 const parcels=(await db.query('select gift_id from app_private.exchange_bundle_gifts where listing_id=$1',[listing.id])).rows
 for(const parcel of parcels)await claim(maker,parcel.gift_id)
 expect((await wallet(maker)).inventory.fuel).toBe(10)
 expect((await user(maker,'select * from public.player_collectibles')).rows).toHaveLength(1)
})
it('rejects malformed, duplicate and oversized bundles before reserving stock',async()=>{
 for(const items of [[],Array(11).fill(mixed[0]),[mixed[0],mixed[0]],[{kind:'gold',id:'gold',quantity:1}],[{kind:'collectible',id:'map-bluegrove',quantity:1}],mixed.map(a=>({...a,quantity:0})),[{kind:'collectible',id:'soft-sea-cucumber',quantity:20},{kind:'collectible',id:'glass-bottle',quantity:1}]]){
  await expect(bundle(items)).rejects.toThrow(/INVALID_EXCHANGE_ASSET|EXCHANGE_BUNDLE_LIMIT/)
 }
 expect((await wallet(maker)).inventory.fuel).toBe(10)
 expect((await db.query('select * from public.exchange_listings')).rows).toHaveLength(0)
})
it('shares only seller avatar through listings without broadening profile access',async()=>{
 const path=maker+'/avatar.webp'
 await db.query('update public.player_profiles set avatar_path=$1 where id=$2',[path,maker])
 await sale('fuel','fuel',1)
 expect((await user(taker,'select avatar_path from public.player_profiles where id=$1',[maker])).rows).toHaveLength(0)
 const page=(await user(taker,"select public.exchange_state('all','',0) value")).rows[0].value
 expect(page.items[0].owner_avatar_path).toBe(path)
 expect(page.items[0]).not.toHaveProperty('friend_code')
})
it('stores and searches custom titles and keeps retries atomic',async()=>{
 const op=crypto.randomUUID(),args=['sell','fuel','fuel',2,'gold','gold',300,op,'  레전드 해파리 팝니다  ']
 const sql='select public.exchange_post($1,$2,$3,$4,$5,$6,$7,$8,$9) value'
 const first=(await user(maker,sql,args)).rows[0].value
 expect(first.title).toBe('레전드 해파리 팝니다')
 expect((await user(maker,sql,args)).rows[0].value.id).toBe(first.id)
 expect((await wallet(maker)).inventory.fuel).toBe(8)
 await expect(user(maker,sql,[...args.slice(0,8),'다른 제목'])).rejects.toThrow(/CONFLICT/)
 const search=(await user(taker,"select public.exchange_state('all','레전드',0) s")).rows[0].s
 expect(search.total).toBe(1);expect(search.items[0].title).toBe(first.title)
 for(const title of ['x'.repeat(81),'줄바꿈\n제목'])await expect(user(maker,sql,[...args.slice(0,7),crypto.randomUUID(),title])).rejects.toThrow(/INVALID_EXCHANGE_TITLE/)
 expect((await wallet(maker)).inventory.fuel).toBe(8)
})
it('lets a non-friend buy an escrowed individual for gold and notifies both parties once',async()=>{
 const item=await seedItem(maker),listing=await sale()
 expect(listing.title).toBe('말랑 해삼 판매합니다')
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
it('sells fuel in a bundle and restores quantities through gifts',async()=>{
 const listing=await sale('fuel','fuel',3,500)
 expect((await wallet(maker)).inventory.fuel).toBe(7)
 await act(listing.id);await claim(taker,listing.escrow_gift_id);await claim(taker,listing.escrow_gift_id)
 expect((await wallet(taker)).inventory.fuel).toBe(13)
 expect((await wallet(taker)).gold).toBe(4500)
})
it('rejects buy orders, barter, gold offers and invalid quantities on the server',async()=>{
 await seedItem(maker)
 await expect(post()).rejects.toThrow('INVALID_EXCHANGE')
 await expect(post(maker,'sell','collectible','soft-sea-cucumber',1,'bait','bait',1)).rejects.toThrow('EXCHANGE_BAIT_DISABLED')
 await expect(post(maker,'sell','gold','gold',1,'gold','gold',2)).rejects.toThrow('INVALID_EXCHANGE')
 await expect(sale('collectible','map-bluegrove')).rejects.toThrow('INVALID_EXCHANGE_ASSET')
 await expect(sale('fuel','fuel',0)).rejects.toThrow('INVALID_EXCHANGE_ASSET')
 await expect(sale('fuel','fuel',1,0)).rejects.toThrow('INVALID_EXCHANGE_ASSET')
})
it('returns cancelled fuel by mail and protects against self purchases and unauthorized cancellation',async()=>{
 const listing=await sale('fuel','fuel',3)
 await expect(act(listing.id,'cancel',other)).rejects.toThrow('EXCHANGE_FORBIDDEN')
 await expect(act(listing.id,'accept',maker)).rejects.toThrow('EXCHANGE_SELF_TRADE')
 await act(listing.id,'cancel',maker);await act(listing.id,'cancel',maker)
 expect((await wallet(maker)).inventory.fuel).toBe(7)
 await claim(maker,listing.escrow_gift_id)
 expect((await wallet(maker)).inventory.fuel).toBe(10)
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
 const op=crypto.randomUUID(),first=await sale('fuel','fuel',1,300,op)
 expect((await sale('fuel','fuel',1,300,op)).id).toBe(first.id)
 expect((await wallet(maker)).inventory.fuel).toBe(9)
 await expect(sale('fuel','fuel',1,301,op)).rejects.toThrow('OPERATION_CONFLICT')
 for(let i=1;i<10;i++)await sale('fuel','fuel',1,300)
 await expect(sale('fuel','fuel',1,300)).rejects.toThrow('EXCHANGE_LISTING_LIMIT')
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


it('escrows fuel once, sells to a stranger and claims it once without collectible discovery',async()=>{
 await db.query(`update public.player_wallets set inventory=inventory||'{"fuel":10}'::jsonb where user_id=$1`,[maker])
 const inventory=(await user(maker,'select public.exchange_inventory() value')).rows[0].value
 expect(inventory.assets.find((a:any)=>a.kind==='fuel')).toMatchObject({id:'fuel',name:'기름',available:10})
 const op=crypto.randomUUID(),listing=await sale('fuel','fuel',4,300,op)
 expect((await sale('fuel','fuel',4,300,op)).id).toBe(listing.id)
 expect((await wallet(maker)).inventory.fuel).toBe(6)
 const search=(await user(taker,"select public.exchange_state('all','기름',0) value")).rows[0].value
 expect(search.total).toBe(1)
 expect(search.items[0].offer).toMatchObject({kind:'fuel',quantity:4})
 await expect(claim(maker,listing.escrow_gift_id)).rejects.toThrow('GIFT_NOT_FOUND')
 await act(listing.id);await act(listing.id)
 expect((await wallet(taker)).gold).toBe(4700)
 await expect(claim(other,listing.escrow_gift_id)).rejects.toThrow('GIFT_NOT_FOUND')
 await claim(taker,listing.escrow_gift_id);await claim(taker,listing.escrow_gift_id)
 expect((await wallet(taker)).inventory.fuel).toBe(14)
 expect((await db.query('select * from public.player_discoveries where user_id=$1',[taker])).rows).toHaveLength(0)
})
it('returns cancelled fuel once and rejects invalid or unavailable stock atomically',async()=>{
 await db.query(`update public.player_wallets set inventory=inventory||'{"fuel":5}'::jsonb where user_id=$1`,[maker])
 for(const [id,qty]of [['fuel',0],['fuel',10000],['bait',1]] as const)await expect(sale('fuel',id,qty)).rejects.toThrow('INVALID_EXCHANGE_ASSET')
 await expect(sale('fuel','fuel',6)).rejects.toThrow('EXCHANGE_INSUFFICIENT_ITEMS')
 expect((await wallet(maker)).inventory.fuel).toBe(5)
 const listing=await sale('fuel','fuel',5)
 await expect(sale('fuel','fuel',1)).rejects.toThrow('EXCHANGE_INSUFFICIENT_ITEMS')
 await act(listing.id,'cancel',maker);await act(listing.id,'cancel',maker)
 await claim(maker,listing.escrow_gift_id);await claim(maker,listing.escrow_gift_id)
 expect((await wallet(maker)).inventory.fuel).toBe(5)
 await expect(act(listing.id)).rejects.toThrow('EXCHANGE_UNAVAILABLE')
})
