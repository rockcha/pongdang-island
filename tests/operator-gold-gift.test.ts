// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const migration='supabase/migrations/20261019163843_operator_gold_gift_support.sql'
const users=['00000000-0000-0000-0000-000000000981','00000000-0000-0000-0000-000000000982']
beforeAll(async()=>{
 db=await createLocalDatabase()
 for(const file of migrationFiles()){if(migration.endsWith(file))break;await db.exec(readSql('supabase/migrations/'+file))}
 for(const id of users){await db.query('insert into auth.users(id) values($1)',[id]);await db.query("insert into public.player_profiles(id,nickname) values($1,'선물친구')",[id])}
},60000)
afterAll(async()=>{await db.close()})
it('sends one operator gift per existing account and credits only once on claim',async()=>{
 await db.exec(readSql(migration))
 await db.exec(readSql(migration))
 const gifts=(await db.query("select * from public.collectible_gifts where reward_id='operator-gold-20261020' order by recipient_id")).rows
 expect(gifts).toHaveLength(2)
 expect(gifts.every(g=>g.source==='system'&&g.sender_name==='퐁당섬 운영자'&&g.quantity===500&&g.status==='pending')).toBe(true)
 expect((await db.query('select count(*)::int n from public.notifications where gift_id=any($1::uuid[])',[gifts.map(g=>g.id)])).rows[0].n).toBe(2)
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[0]])
 await db.exec('set role authenticated')
 await db.query('select public.claim_collectible_gift($1)',[gifts[0].id]);await db.query('select public.claim_collectible_gift($1)',[gifts[0].id])
 await db.exec('reset role')
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[users[0]])).rows[0].gold).toBe(500)
 const second='supabase/migrations/20261019170546_operator_gold_second_supply.sql'
 await db.exec(readSql(second));await db.exec(readSql(second))
 const supply=(await db.query("select * from public.collectible_gifts where reward_id='operator-gold-20261020-round2' order by recipient_id")).rows
 expect(supply).toHaveLength(2)
 expect((await db.query("select count(*)::int n from public.collectible_gifts where reward_id='operator-gold-20261020'")).rows[0].n).toBe(2)
 await db.exec('set role authenticated')
 await db.query('select public.claim_collectible_gift($1)',[supply[0].id]);await db.query('select public.claim_collectible_gift($1)',[supply[0].id])
 await db.exec('reset role')
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[users[0]])).rows[0].gold).toBe(1000)
})
