// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:any
const users=Array.from({length:24},()=>crypto.randomUUID())
async function rank(offset=0){return (await db.query('select public.exploration_leaderboard($1) r',[offset])).rows[0].r}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(const [i,id] of users.entries()){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[id,'탐험가'+i])
  await db.query(`insert into app_private.exploration_runs(id,user_id,revision,model,started_at,finished_at,reward_gold) values($1,$2,1,$3,$4,$5,$6)`,[crypto.randomUUID(),id,{version:1,state:{mode:'practice',market:{floor:i<2?50:48-i}}},`2026-11-01T00:${String(i).padStart(2,'0')}:00Z`,i===1?'2026-11-01T03:00:00Z':null,i===1?2000:0])
 }
 // A worse second run must not replace a personal best. Abandoned progress counts.
 await db.query(`insert into app_private.exploration_runs(id,user_id,revision,model,abandoned_at) values($1,$2,2,$3,now())`,[crypto.randomUUID(),users[2],{version:1,state:{mode:'practice',market:{floor:10}}}])
 for(const model of [{version:1,state:{mode:'test',market:{floor:50}}},{version:1,state:{mode:'practice',market:{floor:'bad'}}}])await db.query(`insert into app_private.exploration_runs(id,user_id,revision,model) values($1,$2,5,$3)`,[crypto.randomUUID(),users[2],model])
 await db.query(`insert into app_private.exploration_runs(id,user_id,revision,model) values($1,$2,0,$3)`,[crypto.randomUUID(),users[3],{version:1,state:{mode:'practice',market:{floor:50}}}])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[2]])
},60000)
afterAll(async()=>{await db?.close()})
it('ranks one authoritative best per player, completed runs ahead of equal floors, and pages in stable order',async()=>{
 const walletBefore=(await db.query('select count(*)::int n from public.gold_transactions')).rows[0].n
 await db.exec('set role authenticated')
 try{
  const first=await rank(),next=await rank(20),again=await rank()
  expect(first).toEqual(again);expect(first.total).toBe(24);expect(first.rows).toHaveLength(20);expect(next.rows).toHaveLength(4)
  expect(first.rows[0]).toMatchObject({userId:users[1],floor:50,completed:true,rank:1})
  expect(first.rows[1]).toMatchObject({userId:users[0],floor:50,completed:false,rank:2})
  expect(first.rows[2]).toMatchObject({userId:users[2],floor:46,mine:true,rank:3})
  expect(new Set([...first.rows,...next.rows].map(r=>r.userId)).size).toBe(24)
  expect([...first.rows,...next.rows].map(r=>r.rank)).toEqual(Array.from({length:24},(_,i)=>i+1))
  expect(first.rows.every(r=>!('model' in r)&&!('rewardGold' in r)&&!('email' in r))).toBe(true)
  for(const offset of [-1,10001,null])await expect(rank(offset as number)).rejects.toThrow('INVALID_RANKING_PAGE')
  await expect(db.query('select model from app_private.exploration_runs')).rejects.toThrow(/permission denied/)
 }finally{await db.exec('reset role')}
 expect((await db.query('select count(*)::int n from public.gold_transactions')).rows[0].n).toBe(walletBefore)
})
it('includes the 80-floor version alongside legacy progress without exposing stored models',async()=>{
 await db.query(`insert into app_private.exploration_runs(id,user_id,revision,model,finished_at,reward_gold) values($1,$2,2,$3,now(),4000)`,[crypto.randomUUID(),users[0],{version:2,state:{campaignFinalFloor:80,mode:'practice',market:{floor:80}}}])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[2]])
 await db.exec('set role authenticated')
 try{const result=await rank();expect(result.rows[0]).toMatchObject({userId:users[0],floor:80,completed:true});expect(result.total).toBe(24)}finally{await db.exec('reset role')}
})
it('denies anonymous callers and direct run writes while keeping the public RPC an invoker',async()=>{
 await db.exec('set role anon');try{await expect(rank()).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
 await db.exec("select set_config('request.jwt.claim.sub','',false)");await db.exec('set role authenticated')
 try{await expect(rank()).rejects.toThrow('AUTH_REQUIRED')}finally{await db.exec('reset role')}
 const state=(await db.query(`select has_table_privilege('authenticated','app_private.exploration_runs','UPDATE') as writable,(select prosecdef from pg_proc where oid='public.exploration_leaderboard(integer)'::regprocedure) as definer`)).rows[0]
 expect(state).toEqual({writable:false,definer:false})
})
