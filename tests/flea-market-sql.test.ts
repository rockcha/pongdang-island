// @vitest-environment node
import {beforeAll,afterAll,beforeEach,afterEach,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const maker='00000000-0000-0000-0000-000000000901',taker='00000000-0000-0000-0000-000000000902',other='00000000-0000-0000-0000-000000000903'
async function user(id:string,sql:string,args:unknown[]=[]){
 await db.exec('savepoint request;set role authenticated')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return (await db.query(sql,args)).rows[0]?.value}
 catch(e){await db.exec('rollback to savepoint request');throw e}
 finally{await db.exec('reset role;release savepoint request')}
}
const items=[{kind:'fuel',id:'fuel',quantity:10,unit_price:20},{kind:'collectible',id:'soft-sea-cucumber',quantity:10,unit_price:30}]
const post=(side='sell',data=items,op=crypto.randomUUID())=>user(maker,'select public.flea_post($1,$2,$3,$4) value',[side,'연료와 해삼',JSON.stringify(data),op])
const trade=(id:string,lines:unknown[],op=crypto.randomUUID(),who=taker)=>user(who,'select public.flea_trade($1,$2,$3) value',[id,JSON.stringify(lines),op])
const cancel=(id:string,op=crypto.randomUUID(),who=maker)=>user(who,'select public.flea_cancel($1,$2) value',[id,op])
const wallet=async(id:string)=>(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[id])).rows[0]
async function claimAll(id:string){for(const g of (await db.query('select id from public.collectible_gifts where recipient_id=$1 and not exchange_hold and claimed_at is null',[id])).rows)await user(id,'select public.claim_collectible_gift($1) value',[g.id])}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
beforeEach(async()=>{
 await db.exec('begin')
 for(const [id,name] of [[maker,'상점퐁'],[taker,'손님퐁'],[other,'이웃퐁']]){
  await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name])
  await db.query(`insert into public.player_wallets(user_id,gold,inventory) values($1,5000,'{"fuel":20,"bait":20}') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory`,[id])
  await db.query("insert into public.player_collectibles(user_id,species_id,tank_id) select $1,'soft-sea-cucumber',null from generate_series(1,10)",[id])
 }
})
afterEach(async()=>{await db.exec('rollback')})
it('reserves mixed sale stock, partially sells exact instances, retries once and returns only leftovers',async()=>{
 const op=crypto.randomUUID(),p=await post('sell',items,op)
 expect((await post('sell',items,op)).id).toBe(p.id)
 expect((await wallet(maker)).inventory.fuel).toBe(10)
 const quantities=p.items.map((l:any)=>({id:l.id,quantity:l.asset.kind==='fuel'?2:3})),receipt=crypto.randomUUID()
 const result=await trade(p.id,quantities,receipt);expect(result.items.map((l:any)=>l.remaining).sort()).toEqual([7,8])
 expect((await wallet(taker)).gold).toBe(4870);expect((await wallet(maker)).gold).toBe(5130)
 await trade(p.id,quantities,receipt)
 expect((await wallet(taker)).gold).toBe(4870)
 await expect(trade(p.id,[{...quantities[0],quantity:1}],receipt)).rejects.toThrow('OPERATION_CONFLICT')
 await claimAll(taker)
 expect((await wallet(taker)).inventory.fuel).toBe(22)
 const stop=crypto.randomUUID();await cancel(p.id,stop);await cancel(p.id,stop);await claimAll(maker)
 expect((await wallet(maker)).inventory.fuel).toBe(18)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and escrow_gift_id is null',[maker])).rows[0].n).toBe(7)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and escrow_gift_id is null',[taker])).rows[0].n).toBe(13)
 await expect(trade(p.id,quantities)).rejects.toThrow('FLEA_CLOSED')
})
it('escrows the sum of a buy order, pays suppliers immediately and refunds only unused gold',async()=>{
 const p=await post('buy');expect(p.escrow_gold).toBe(500);expect((await wallet(maker)).gold).toBe(4500)
 const result=await trade(p.id,p.items.map((l:any)=>({id:l.id,quantity:l.asset.kind==='fuel'?3:2})))
 expect(result.escrow_gold).toBe(380);expect((await wallet(taker)).gold).toBe(5120)
 await cancel(p.id);expect((await wallet(maker)).gold).toBe(4880)
 await claimAll(maker);expect((await wallet(maker)).inventory.fuel).toBe(23)
})
it('rejects stale quantities, self-trades, wrong ownership, duplicate lines and rolls back failed mixed trades',async()=>{
 const p=await post(),fuel=p.items.find((l:any)=>l.asset.kind==='fuel'),fish=p.items.find((l:any)=>l.asset.kind==='collectible')
 await expect(trade(p.id,[{id:fuel.id,quantity:11}])).rejects.toThrow('FLEA_STOCK_CHANGED')
 await expect(trade(p.id,[{id:fuel.id,quantity:1},{id:fuel.id,quantity:1}])).rejects.toThrow('INVALID_FLEA')
 await expect(trade(p.id,[{id:fuel.id,quantity:1}],crypto.randomUUID(),maker)).rejects.toThrow('FLEA_SELF_TRADE')
 await expect(cancel(p.id,crypto.randomUUID(),other)).rejects.toThrow('FLEA_FORBIDDEN')
 await db.query('update public.player_wallets set gold=0 where user_id=$1',[taker])
 await expect(trade(p.id,[{id:fuel.id,quantity:1},{id:fish.id,quantity:1}])).rejects.toThrow('INSUFFICIENT_GOLD')
 expect((await db.query('select remaining from app_private.flea_lines where post_id=$1',[p.id])).rows.every((l:any)=>l.remaining===10)).toBe(true)
 const buy=await post('buy');await db.query('update public.player_wallets set inventory=$2 where user_id=$1',[taker,JSON.stringify({fuel:0})])
 await expect(trade(buy.id,buy.items.map((l:any)=>({id:l.id,quantity:1})))).rejects.toThrow('EXCHANGE_INSUFFICIENT_ITEMS')
 expect((await wallet(maker)).gold).toBe(4500)
})
it('never oversells when another buyer consumes the remaining amount',async()=>{
 const p=await post('sell',[items[0]]),line=p.items[0]
 await trade(p.id,[{id:line.id,quantity:7}])
 await expect(trade(p.id,[{id:line.id,quantity:4}],crypto.randomUUID(),other)).rejects.toThrow('FLEA_STOCK_CHANGED')
 expect((await wallet(other)).gold).toBe(5000)
 const result=await trade(p.id,[{id:line.id,quantity:3}],crypto.randomUUID(),other)
 expect(result.status).toBe('completed');expect(result.items[0].remaining).toBe(0)
})
it('searches title and item names, filters tabs and protects every private table and helper',async()=>{
 await db.query('update public.player_profiles set avatar_path=$1 where id=$2',[maker+'/avatar.png',maker])
 await post();await post('buy')
 for(const q of ['연료와','말랑 해삼'])expect((await user(taker,"select public.flea_state('sell',$1,'all',false,0) value",[q])).total).toBe(1)
 const feed=await user(taker,"select public.flea_state('buy','','fuel',false,0) value")
 expect(feed.total).toBe(1)
 expect(feed.items[0].owner_avatar_path).toBe(maker+'/avatar.png')
 expect((await user(taker,"select public.flea_state('sell','','all',true,0) value")).total).toBe(0)
 for(const sql of ['select * from app_private.flea_posts','select * from app_private.flea_receipts',`select app_private.flea_gold('${taker}',100,null)`])await expect(user(taker,sql)).rejects.toThrow('permission denied')
 await db.exec("savepoint anon_call;set role anon")
 await expect(db.query('select public.flea_state()')).rejects.toThrow('permission denied')
 await db.exec('rollback to savepoint anon_call;release savepoint anon_call')
})
it('rejects bait, relics, maps, invalid prices and stock not in storage without consuming anything',async()=>{
 for(const data of [[{...items[0],kind:'bait',id:'bait'}],[{...items[1],id:'map-bluegrove'}],[{...items[0],unit_price:0}],[items[0],items[0]],[{...items[0],quantity:9999,unit_price:1000000000}]])await expect(post('buy',data)).rejects.toThrow(/INVALID_FLEA|INVALID_EXCHANGE_ASSET/)
 await expect(post('buy',[{...items[0],unit_price:1000}])).rejects.toThrow('INSUFFICIENT_GOLD')
 expect((await wallet(maker)).gold).toBe(5000)
 await expect(user(maker,"select public.exchange_post('sell','bait','bait',1,'gold','gold',10,$1) value",[crypto.randomUUID()])).rejects.toThrow('EXCHANGE_BAIT_DISABLED')
 const inventory=await user(maker,'select public.exchange_inventory() value')
 expect(inventory.assets.some((a:any)=>a.kind==='bait')).toBe(false)
})
