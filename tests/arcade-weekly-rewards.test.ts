// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>,week:string
const users=Array.from({length:7},(_,i)=>`00000000-0000-0000-0000-0000000009${30+i}`)
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db.close()})
beforeEach(async()=>{
 await db.exec('begin')
 week=(await db.query("select to_char(date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul'),'YYYY-MM-DD') week")).rows[0].week
 for(const [i,id] of users.entries()){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query("insert into public.player_profiles(id,nickname) values($1,$2)",[id,'참가자'+i])
  await db.query("insert into public.shadow_game_runs(user_id,operation_id,score,finished_at) values($1,gen_random_uuid(),$2,($3::date+1)::timestamp at time zone 'Asia/Seoul')",[id,100-i,week])
  await db.query("insert into public.memory_game_runs(user_id,operation_id,elapsed_ms,finished_at) values($1,gen_random_uuid(),$2,($3::date+1)::timestamp at time zone 'Asia/Seoul')",[id,10000+i*1000,week])
 }
})
afterEach(async()=>{await db.exec('rollback')})
const close=()=>db.query("select app_private.settle_arcade_weeks((($1::date+7)::timestamp at time zone 'Asia/Seoul')+interval '1 minute') issued",[week])
it('settles both games only after Sunday midnight, once per player, and claims once',async()=>{
 expect((await db.query("select app_private.settle_arcade_weeks((($1::date+7)::timestamp at time zone 'Asia/Seoul')-interval '1 second') issued",[week])).rows[0].issued).toBe(0)
 expect((await db.query("select app_private.settle_arcade_weeks(($1::date+7)::timestamp at time zone 'Asia/Seoul') issued",[week])).rows[0].issued).toBe(0)
 await db.query("insert into public.shadow_game_runs(user_id,operation_id,score,finished_at) values($1,gen_random_uuid(),10,($2::date+2)::timestamp at time zone 'Asia/Seoul')",[users[0],week])
 expect((await close()).rows[0].issued).toBe(14)
 expect((await close()).rows[0].issued).toBe(0)
 for(const game of ['shadow','memory']){
  const rewards=(await db.query('select gold from app_private.arcade_weekly_rewards where game=$1 order by rank',[game])).rows
  expect(rewards.map(r=>r.gold)).toEqual([2000,1500,1000,650,400,200,200])
 }
 const gifts=(await db.query('select gift_id from app_private.arcade_weekly_rewards where user_id=$1',[users[0]])).rows
 expect((await db.query("select count(*)::int n from public.notifications where title='오락실 주간 랭킹 보상이 도착했어요!'")).rows[0].n).toBe(14)
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[0]])
 await db.exec('set role authenticated')
 for(const gift of gifts){await db.query('select public.claim_collectible_gift($1)',[gift.gift_id]);await db.query('select public.claim_collectible_gift($1)',[gift.gift_id])}
 await db.exec('reset role')
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[users[0]])).rows[0].gold).toBe(4000)
})
it('uses the best completed result and excludes the next week and abandoned memory runs',async()=>{
 await db.query("insert into public.memory_game_runs(user_id,operation_id,elapsed_ms,finished_at,abandoned_at) values($1,gen_random_uuid(),1,($2::date+1)::timestamp at time zone 'Asia/Seoul',now())",[users[6],week])
 await db.query("insert into public.shadow_game_runs(user_id,operation_id,score,finished_at) values($1,gen_random_uuid(),999,($2::date+7)::timestamp at time zone 'Asia/Seoul')",[users[6],week])
 const memory=(await db.query("select * from app_private.arcade_weekly_rankings('memory',$1)",[week])).rows
 expect(memory.at(-1).user_id).toBe(users[6]);expect(memory).toHaveLength(7)
 const shadow=(await db.query("select * from app_private.arcade_weekly_rankings('shadow',$1)",[week])).rows
 expect(shadow[0].user_id).toBe(users[0]);expect(shadow).toHaveLength(7)
 await close()
 const before=(await db.query('select count(*)::int n from app_private.arcade_weekly_rewards')).rows[0].n
 expect((await close()).rows[0].issued).toBe(0)
 expect((await db.query('select count(*)::int n from app_private.arcade_weekly_rewards')).rows[0].n).toBe(before)
})
it('breaks ties by completion time and exposes weekly per-player rankings without settlement access',async()=>{
 await db.query("update public.shadow_game_runs set score=100,finished_at=($1::date+2)::timestamp at time zone 'Asia/Seoul' where user_id=$2",[week,users[1]])
 const ranked=(await db.query("select * from app_private.arcade_weekly_rankings('shadow',$1)",[week])).rows
 expect(ranked.slice(0,2).map(r=>r.user_id)).toEqual(users.slice(0,2))
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[0]])
 await db.exec('set role authenticated')
 const board=(await db.query('select public.shadow_leaderboard(0) data')).rows[0].data
 expect(board.total).toBe(7);expect(board.rows[0].rewardGold).toBe(2000)
 expect(Date.parse(board.weekEnd)-Date.parse(board.weekStart)).toBe(7*86400000)
 await db.exec('savepoint denied')
 await expect(db.query('select app_private.settle_arcade_weeks()')).rejects.toThrow('permission denied')
 await db.exec('rollback to savepoint denied;reset role')
})
