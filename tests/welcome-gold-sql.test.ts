// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'
let db
const ids=Array.from({length:4},(_,i)=>`00000000-0000-0000-0000-00000000081${i}`)
const migration='20261018232502_automatic_signup_gold.sql'
beforeAll(async()=>{
 db=await createLocalDatabase()
 for(const file of migrationFiles()){if(file===migration)break;await db.exec(readSql(`supabase/migrations/${file}`))}
 for(const [i,id] of ids.entries()){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,`테스트${i}`])
  await db.query('insert into public.player_wallets(user_id,gold) values($1,1000)',[id])
 }
 await db.query("update public.collectible_gifts set status='claimed',claimed_at=now() where recipient_id=$1",[ids[1]])
 await db.query("insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values($1,gen_random_uuid(),'charge','welcome:500',500),($1,gen_random_uuid(),'sell','welcome:500:reversal',-500)",[ids[2]])
 for(const id of ids.slice(2)){
  await db.query('delete from public.notifications where recipient_id=$1',[id])
  await db.query('delete from public.collectible_gifts where recipient_id=$1',[id])
 }
 await db.exec(readSql(`supabase/migrations/${migration}`))
},60000)
afterAll(async()=>{await db?.close()})
it('backfills pending gifts with one unread notification without changing wallets or reissuing claimed gifts',async()=>{
 expect((await db.query('select gold from public.player_wallets where user_id=any($1::uuid[]) order by user_id',[ids])).rows.map(r=>r.gold)).toEqual([1000,1000,1000,1000])
 expect((await db.query("select status from public.collectible_gifts where recipient_id=any($1::uuid[]) order by recipient_id",[ids])).rows.map(r=>r.status)).toEqual(['pending','claimed','pending','pending'])
 for(const id of ids){
  expect((await db.query('select app_private.send_welcome_gift($1) gift',[id])).rows[0].gift).toBeNull()
  expect((await db.query("select count(*) n from public.notifications where recipient_id=$1 and category='gift' and read_at is null",[id])).rows[0].n).toBe(1)
 }
})
it('sends a new player an unread operator gift, credits only on claim, and makes repeated claims safe',async()=>{
 const id='00000000-0000-0000-0000-000000000820'
 await db.query('insert into auth.users(id) values($1)',[id])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'신규계정')",[id])
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[id])).rows).toHaveLength(0)
 const gift=(await db.query('select * from public.collectible_gifts where recipient_id=$1',[id])).rows[0]
 expect(gift).toMatchObject({sender_id:null,sender_name:'퐁당섬 운영자',source:'system',reward_id:'welcome',quantity:500,status:'pending'})
 expect((await db.query("select count(*) n from public.notifications where recipient_id=$1 and category='gift' and read_at is null",[id])).rows[0].n).toBe(1)
 await db.query("update public.player_profiles set nickname='이름변경' where id=$1",[id])
 await db.query('select app_private.send_welcome_gift($1)',[id])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')
 await db.query('select public.claim_collectible_gift($1)',[gift.id]);await db.query('select public.claim_collectible_gift($1)',[gift.id]);await db.exec('reset role')
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[id])).rows[0].gold).toBe(500)
 expect((await db.query('select status from public.collectible_gifts where id=$1',[gift.id])).rows[0].status).toBe('claimed')
 expect((await db.query('select count(*) n from public.collectible_gifts where recipient_id=$1',[id])).rows[0].n).toBe(1)
})
