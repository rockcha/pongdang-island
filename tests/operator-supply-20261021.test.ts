// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations,readSql} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const migration='supabase/migrations/20261020151117_operator_gold_supply_20261021.sql'
const users=['00000000-0000-0000-0000-000000006121','00000000-0000-0000-0000-000000006122']
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const id of users){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query("insert into public.player_profiles(id,nickname) values($1,'보급친구')",[id])
  await db.query('insert into public.player_wallets(user_id,gold) values($1,100) on conflict(user_id) do update set gold=100',[id])
 }
},60000)
afterAll(async()=>await db?.close())
it('delivers once per player with one notification and credits 500 only once when claimed',async()=>{
 await db.exec(readSql(migration));await db.exec(readSql(migration))
 const gifts=(await db.query("select * from public.collectible_gifts where reward_id='operator-gold-20261021-supply' order by recipient_id")).rows
 expect(gifts).toHaveLength(2)
 expect(gifts.every(g=>g.quantity===500&&g.status==='pending'&&g.sender_id===null)).toBe(true)
 expect((await db.query('select count(*)::int n from public.notifications where gift_id=any($1::uuid[])',[gifts.map(g=>g.id)])).rows[0].n).toBe(2)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[users[0]])).rows[0].gold).toBe(100)
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[0]])
 await db.exec('set role authenticated')
 try{
  await expect(db.query('select public.claim_collectible_gift($1)',[gifts[1].id])).rejects.toThrow(/GIFT_NOT_FOUND/)
  await db.query('select public.claim_collectible_gift($1)',[gifts[0].id])
  await db.query('select public.claim_collectible_gift($1)',[gifts[0].id])
 }finally{await db.exec('reset role')}
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[users[0]])).rows[0].gold).toBe(600)
})
