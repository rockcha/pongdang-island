// @vitest-environment node
import {beforeAll,afterAll,beforeEach,afterEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const seller='00000000-0000-0000-0000-000000001401',buyer='00000000-0000-0000-0000-000000001402',other='00000000-0000-0000-0000-000000001403'
async function asUser(id:string,sql:string,args:unknown[]=[]):Promise<any>{
 await db.exec('savepoint request;set local role authenticated')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return await db.query(sql,args)}
 catch(error){await db.exec('rollback to savepoint request');throw error}
 finally{await db.exec('reset role;release savepoint request')}
}
const value=async(user:string,sql:string,args:unknown[]=[])=> (await asUser(user,sql,args)).rows[0].value
async function post(){return value(seller,"select public.exchange_post('sell','bait','bait',1,'gold','gold',100,$1,'미끼 판매해요') value",[crypto.randomUUID()])}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
beforeEach(async()=>{
 await db.exec('begin')
 for(const [id,name] of [[seller,'판매자'],[buyer,'구매자'],[other,'다른친구']]){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,name])
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,5000,'{\"bait\":100}') on conflict(user_id) do update set gold=5000,inventory=excluded.inventory",[id])
 }
})
afterEach(async()=>{await db.exec('rollback')})
it('enriches payment display without modifying the payment record and blocks unrelated users',async()=>{
 const l=await post()
 await value(buyer,"select public.exchange_action($1,'accept') value",[l.id])
 const getPayment=async()=> (await db.query("select * from public.collectible_gifts where source='exchange' and reward_kind='gold' and recipient_id=$1",[seller])).rows[0] as any
 const payment=await getPayment()
 const detail=await value(seller,'select public.gift_detail($1) value',[payment.id])
 expect(detail.species.exchange_offer).toEqual(l.offer)
 expect(await getPayment()).toEqual(payment)
 await expect(value(other,'select public.gift_detail($1) value',[payment.id])).rejects.toThrow('GIFT_NOT_FOUND')
 await value(seller,'select public.claim_collectible_gift($1) value',[payment.id])
 expect((await value(seller,'select public.gift_detail($1) value',[payment.id])).species.exchange_offer).toEqual(l.offer)
 const second=await post()
 await value(buyer,"select public.exchange_action($1,'accept') value",[second.id])
 expect((await value(seller,'select public.gift_detail($1) value',[payment.id])).species).not.toHaveProperty('exchange_offer')
})
it('only lets the seller edit active titles while preserving trade conditions',async()=>{
 const l=await post()
 await expect(value(buyer,'select public.edit_exchange_listing_title($1,$2) value',[l.id,'다른 제목'])).rejects.toThrow('EXCHANGE_FORBIDDEN')
 for(const title of ['', '   ', '\t', 'a'.repeat(81), '줄\n바꿈'])await expect(value(seller,'select public.edit_exchange_listing_title($1,$2) value',[l.id,title])).rejects.toThrow('INVALID_EXCHANGE_TITLE')
 const before=(await db.query('select * from public.exchange_listings where id=$1',[l.id])).rows[0]
 await value(seller,'select public.edit_exchange_listing_title($1,$2) value',[l.id,'  새 판매 제목  '])
 const after=(await db.query('select * from public.exchange_listings where id=$1',[l.id])).rows[0]
 expect(after).toEqual({...before,title:'새 판매 제목'})
 await value(seller,"select public.exchange_action($1,'cancel') value",[l.id])
 await expect(value(seller,'select public.edit_exchange_listing_title($1,$2) value',[l.id,'수정'])).rejects.toThrow('EXCHANGE_UNAVAILABLE')
 expect((await db.query("select has_function_privilege('anon','public.edit_exchange_listing_title(uuid,text)','execute') allowed")).rows[0].allowed).toBe(false)
})
it('sets likes idempotently per account and exposes counts in list/detail',async()=>{
 const l=await post()
 for(let i=0;i<2;i++)expect(await value(buyer,'select public.set_exchange_listing_like($1,true) value',[l.id])).toEqual({liked:true,like_count:1})
 expect(await value(other,'select public.set_exchange_listing_like($1,true) value',[l.id])).toEqual({liked:true,like_count:2})
 const page=await value(buyer,"select public.exchange_state('all','',0) value")
 expect(page.items[0].like_count).toBe(2)
 const detail=await value(buyer,'select public.exchange_listing_detail($1,0) value',[l.id])
 expect(detail.listing.liked).toBe(true)
 expect(detail.listing).not.toHaveProperty('operation_id')
 expect(detail.listing).not.toHaveProperty('escrow_gift_id')
 expect(await value(buyer,'select public.set_exchange_listing_like($1,false) value',[l.id])).toEqual({liked:false,like_count:1})
})
it('deduplicates comment retries and enforces author-only deletion',async()=>{
 const l=await post(),op=crypto.randomUUID()
 const args=[l.id,'  가격 문의해요!  ',op]
 const id=await value(buyer,'select public.add_exchange_listing_comment($1,$2,$3) value',args)
 expect(await value(buyer,'select public.add_exchange_listing_comment($1,$2,$3) value',args)).toBe(id)
 await expect(value(buyer,'select public.add_exchange_listing_comment($1,$2,$3) value',[l.id,'다른 내용',op])).rejects.toThrow('OPERATION_CONFLICT')
 const detail=await value(seller,'select public.exchange_listing_detail($1,0) value',[l.id])
 expect(detail.comments).toHaveLength(1)
 expect(detail.comments[0]).toMatchObject({id,body:'가격 문의해요!',author_name:'구매자',user_id:buyer})
 expect(detail.comments[0]).not.toHaveProperty('friend_code')
 expect(detail.listing.comment_count).toBe(1)
 await expect(value(seller,'select public.delete_exchange_listing_comment($1) value',[id])).rejects.toThrow('EXCHANGE_COMMENT_FORBIDDEN')
 await value(buyer,'select public.delete_exchange_listing_comment($1) value',[id])
 await value(buyer,'select public.delete_exchange_listing_comment($1) value',[id])
 expect((await value(buyer,'select public.exchange_listing_detail($1,0) value',[l.id])).listing.comment_count).toBe(0)
})
it('paginates comments, rejects empty/oversized comments and prevents direct client writes',async()=>{
 const l=await post()
 await expect(value(buyer,'select public.add_exchange_listing_comment($1,$2,$3) value',[l.id,'   ',crypto.randomUUID()])).rejects.toThrow('INVALID_EXCHANGE_COMMENT')
 await expect(value(buyer,'select public.add_exchange_listing_comment($1,$2,$3) value',[l.id,'x'.repeat(501),crypto.randomUUID()])).rejects.toThrow('INVALID_EXCHANGE_COMMENT')
 for(let i=0;i<32;i++)await value(buyer,'select public.add_exchange_listing_comment($1,$2,$3) value',[l.id,'댓글 '+i,crypto.randomUUID()])
 const a=await value(buyer,'select public.exchange_listing_detail($1,0) value',[l.id]),b=await value(buyer,'select public.exchange_listing_detail($1,30) value',[l.id])
 expect(a.comments).toHaveLength(30);expect(b.comments).toHaveLength(2)
 expect(new Set([...a.comments,...b.comments].map(c=>c.id)).size).toBe(32)
 expect(a.listing.comment_count).toBe(32)
 await expect(asUser(buyer,'insert into public.exchange_listing_likes(listing_id,user_id) values($1,$2)',[l.id,other])).rejects.toThrow('permission denied')
})
it('keeps completed details visible and hides cancelled listings from other users',async()=>{
 const l=await post()
 await value(buyer,"select public.exchange_action($1,'accept') value",[l.id])
 expect((await value(other,'select public.exchange_listing_detail($1,0) value',[l.id])).listing.status).toBe('completed')
 const cancelled=await post()
 await value(seller,"select public.exchange_action($1,'cancel') value",[cancelled.id])
 await expect(value(buyer,'select public.exchange_listing_detail($1,0) value',[cancelled.id])).rejects.toThrow('EXCHANGE_NOT_FOUND')
 expect((await value(seller,'select public.exchange_listing_detail($1,0) value',[cancelled.id])).listing.status).toBe('cancelled')
 await expect(value(seller,'select public.set_exchange_listing_like($1,true) value',[cancelled.id])).rejects.toThrow('EXCHANGE_UNAVAILABLE')
})
