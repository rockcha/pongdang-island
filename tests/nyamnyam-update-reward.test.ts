// @vitest-environment node
import {expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'
it('delivers 1000 gold once to existing players, excludes later profiles even on replay, and claims only once',async()=>{
 const db=await createLocalDatabase()
 const file=migrationFiles().find(f=>f.endsWith('_nyamnyam_update_gold_reward.sql'))!
 const older='00000000-0000-0000-0000-000000000791',newer='00000000-0000-0000-0000-000000000792'
 try{
  for(const f of migrationFiles()){if(f===file)break;await db.exec(readSql('supabase/migrations/'+f))}
  for(const [id,date] of [[older,'2026-10-22T00:00:00Z'],[newer,'2026-10-24T00:00:00Z']]){
   await db.query('insert into auth.users(id) values($1)',[id])
   await db.query("insert into public.player_profiles(id,nickname,created_at) values($1,'보상테스트',$2)",[id,date])
  }
  const sql=readSql('supabase/migrations/'+file)
  await db.exec(sql);await db.exec(sql)
  const gifts=(await db.query("select * from public.collectible_gifts where reward_id='operator-update-20261023-nyamnyam'")).rows
  expect(gifts).toHaveLength(1)
  expect(gifts[0]).toMatchObject({recipient_id:older,quantity:1000,status:'pending',source:'system'})
  expect((await db.query('select count(*)::int n from public.notifications where gift_id=$1',[gifts[0].id])).rows[0].n).toBe(1)
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[older]);await db.exec('set role authenticated')
  const before=(await db.query('select public.get_gold_wallet() w')).rows[0].w
  await db.query('select public.claim_collectible_gift($1)',[gifts[0].id]);await db.query('select public.claim_collectible_gift($1)',[gifts[0].id])
  await db.exec('reset role')
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[older])).rows[0].gold).toBe(before.gold+1000)
  expect((await db.query('select count(*)::int n from public.gold_transactions where operation_id=$1 and delta=1000',[gifts[0].id])).rows[0].n).toBe(1)
 }finally{await db.close()}
},60000)
