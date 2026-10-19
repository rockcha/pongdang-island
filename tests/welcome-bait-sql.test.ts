// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
it('sends five starter baits once and credits only on the recipient’s first claim',async()=>{
 const id='00000000-0000-0000-0000-000000000991'
 await db.query('insert into auth.users(id) values($1)',[id])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'환영친구')",[id])
 await db.query('select app_private.send_welcome_gift($1)',[id])
 const gifts=(await db.query('select * from public.collectible_gifts where recipient_id=$1',[id])).rows
 expect(gifts).toHaveLength(2)
 const bait=gifts.find(g=>g.reward_kind==='bait')!
 expect(bait).toMatchObject({quantity:5,reward_id:'bait',source:'system',status:'pending'})
 expect((await db.query('select * from public.player_wallets where user_id=$1',[id])).rows).toHaveLength(0)
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id])
 await db.exec('set role authenticated')
 await db.query('select public.claim_collectible_gift($1)',[bait.id])
 await db.query('select public.claim_collectible_gift($1)',[bait.id])
 await db.exec('reset role')
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[id])).rows[0].inventory.bait).toBe(5)
 await db.query('select app_private.send_welcome_gift($1)',[id])
 expect((await db.query("select count(*)::int n from public.collectible_gifts where recipient_id=$1 and reward_kind='bait'",[id])).rows[0].n).toBe(1)
 expect((await db.query('select count(*)::int n from public.notifications where gift_id=$1',[bait.id])).rows[0].n).toBe(1)
})
