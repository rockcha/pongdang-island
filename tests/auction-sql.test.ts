// @vitest-environment node
import {beforeAll,afterAll,beforeEach,afterEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const seller='00000000-0000-0000-0000-000000000201',first='00000000-0000-0000-0000-000000000202',second='00000000-0000-0000-0000-000000000203'
async function user(id:string,sql:string,args:unknown[]=[]){
 await db.exec('savepoint request;set role authenticated')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return (await db.query(sql,args)).rows[0]?.value}
 catch(error){await db.exec('rollback to savepoint request');throw error}
 finally{await db.exec('reset role;release savepoint request')}
}
const post=(op=crypto.randomUUID())=>user(seller,'select public.auction_post($1,$2,$3,$4,$5,$6,$7,$8) as value',['bait','bait_special',2,'Test auction','Description',300,1,op])
const bid=(id:string,who=first,amount=500,op=crypto.randomUUID())=>user(who,'select public.auction_bid($1,$2,$3) as value',[id,amount,op])
const claim=(who:string,id:string)=>user(who,'select public.claim_collectible_gift($1) as value',[id])
const cancel=(id:string)=>user(seller,'select public.auction_cancel($1) as value',[id])
async function gold(who:string){return (await db.query('select gold from public.player_wallets where user_id=$1',[who])).rows[0].gold}
async function expire(id:string){await db.query("update public.auction_listings set ends_at=clock_timestamp()-interval '1 second' where id=$1",[id])}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
beforeEach(async()=>{await db.exec('begin');for(const [id,name] of [[seller,'Seller'],[first,'First'],[second,'Second']]){
 await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name]);await db.query(`insert into public.player_wallets(user_id,gold,inventory) values($1,5000,'{"bait_special":10}')`,[id])
}})
afterEach(async()=>{await db.exec('rollback')})
it('reserves stock once and prevents claiming held stock',async()=>{
 const op=crypto.randomUUID(),a=await post(op)
 expect((await post(op)).id).toBe(a.id)
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[seller])).rows[0].inventory.bait_special).toBe(8)
 await expect(claim(seller,a.escrow_gift_id)).rejects.toThrow('GIFT_NOT_FOUND')
})
it('refunds outbid gold only through a claimable gift, once',async()=>{
 const a=await post(),op=crypto.randomUUID()
 await bid(a.id,first,500,op);await bid(a.id,first,500,op)
 expect(await gold(first)).toBe(4500)
 const next=await bid(a.id,second,600)
 const gift=(await db.query('select * from public.collectible_gifts where recipient_id=$1 and not exchange_hold',[first])).rows[0]
 expect(gift.quantity).toBe(500);expect(await gold(first)).toBe(4500)
 await expect(claim(second,gift.id)).rejects.toThrow()
 await claim(first,gift.id);await claim(first,gift.id)
 expect(await gold(first)).toBe(5000);expect(await gold(second)).toBe(4400)
 expect(next.highest_amount).toBe(600)
})
it('charges only the difference for a self raise and retries idempotently',async()=>{
 const a=await post(),initial=await bid(a.id),op=crypto.randomUUID()
 const raised=await bid(a.id,first,800,op);await bid(a.id,first,800,op)
 expect(raised.highest_gift_id).toBe(initial.highest_gift_id);expect(await gold(first)).toBe(4200)
 expect((await db.query('select quantity from public.collectible_gifts where id=$1',[raised.highest_gift_id])).rows[0].quantity).toBe(800)
 expect((await db.query('select * from public.collectible_gifts where not exchange_hold')).rows).toHaveLength(0)
})
it('rolls back unaffordable bids and protects the current bidder',async()=>{
 const a=await post();await bid(a.id)
 await expect(bid(a.id,second,6000)).rejects.toThrow('INSUFFICIENT_GOLD')
 expect(await gold(second)).toBe(5000)
 expect((await db.query('select highest_amount from public.auction_listings where id=$1',[a.id])).rows[0].highest_amount).toBe(500)
 await expect(cancel(a.id)).rejects.toThrow('AUCTION_HAS_BIDS')
 await expect(bid(a.id,seller,600)).rejects.toThrow('AUCTION_SELF_BID')
})
it('settles exactly once and delivers both item and proceeds through gifts',async()=>{
 const a=await post(),b=await bid(a.id)
 await expire(a.id);await db.exec('select app_private.auction_settle_due();select app_private.auction_settle_due()')
 expect(await gold(seller)).toBe(5000)
 expect((await db.query('select status from public.auction_listings where id=$1',[a.id])).rows[0].status).toBe('sold')
 await claim(seller,b.highest_gift_id);await claim(first,a.escrow_gift_id)
 expect(await gold(seller)).toBe(5500)
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[first])).rows[0].inventory.bait_special).toBe(12)
 expect((await db.query('select * from public.notifications where gift_id in ($1,$2)',[a.escrow_gift_id,b.highest_gift_id])).rows).toHaveLength(2)
})
it('returns cancelled and unsold items by mail and rejects bids after the deadline',async()=>{
 const a=await post();await cancel(a.id);await cancel(a.id);await claim(seller,a.escrow_gift_id)
 const unsold=await post();await expire(unsold.id)
 await expect(bid(unsold.id)).rejects.toThrow('AUCTION_ENDED')
 await user(first,"select public.auction_state('all','',0) as value")
 await claim(seller,unsold.escrow_gift_id)
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[seller])).rows[0].inventory.bait_special).toBe(10)
})
it('denies direct writes and settlement helper execution',async()=>{
 await expect(user(first,"update public.auction_listings set status='sold'")).rejects.toThrow('permission denied')
 await expect(user(first,'select app_private.auction_settle_due()')).rejects.toThrow('permission denied')
})
