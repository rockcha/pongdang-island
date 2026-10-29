// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:any
const owner='00000000-0000-4000-8000-000000006701',other='00000000-0000-4000-8000-000000006702'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},180000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{await db.exec(`begin;insert into auth.users(id) values('${owner}'),('${other}');insert into public.player_profiles(id,nickname) values('${owner}','퐁이도전자'),('${other}','다른도전자');insert into public.player_wallets(user_id,gold) values('${owner}',100),('${other}',100) on conflict(user_id) do update set gold=100;`);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[owner])})
afterEach(async()=>{await db.exec('rollback;reset role')})
it('counts a paid Pongi Whack start for the daily game quest, never state reads or retries',async()=>{
 const quest=async()=>(await db.query('select public.quest_state() s')).rows[0].s.daily.quests.find((q:any)=>q.id==='game')
 expect(await quest()).toMatchObject({progress:0,complete:false})
 await action('state')
 expect(await quest()).toMatchObject({progress:0})
 const operation=crypto.randomUUID()
 await action('start',operation);await action('start',operation)
 expect(await quest()).toMatchObject({progress:1,complete:true})
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other])
 expect(await quest()).toMatchObject({progress:0,complete:false})
})
async function action(action:string,op:string|null=null,id:string|null=null,hits:any[]=[]){return (await db.query('select public.pongi_whack_action($1,$2,$3,$4) r',[action,op,id,JSON.stringify(hits)])).rows[0].r}
it('charges once, retries the same operation safely, and excludes abandoned runs',async()=>{
 const op=crypto.randomUUID(),s=await action('start',op)
 expect(s.gold).toBe(90);expect((await action('start',op)).run.id).toBe(s.run.id)
 expect((await action('state')).gold).toBe(90)
 expect((await db.query("select count(*)::int n from public.gold_transactions where user_id=$1 and item_id='arcade:pongi-whack'",[owner])).rows[0].n).toBe(1)
 await action('leave',null,s.run.id)
 expect((await action('state')).run).toBeNull()
 expect((await action('start',op)).run.abandoned).toBe(true)
 expect((await action('start',crypto.randomUUID())).gold).toBe(80)
})
it('retains a 30 second board with all three fake types possible immediately',async()=>{
 const {run}=await action('start',crypto.randomUUID()),b=run.targets
 expect(b.filter((t:any)=>t.kind==='golden')).toHaveLength(1)
 expect(run.durationMs).toBe(30000);expect(b.every((t:any)=>t.until<=30000)).toBe(true)
 expect(b.every((t:any)=>t.hole>=0&&t.hole<12)).toBe(true)
 for(const t of b)expect(b.filter((o:any)=>o.id!==t.id&&o.hole===t.hole&&o.at<t.until&&o.until>t.at)).toHaveLength(0)
 const seen=new Set<string>()
 for(let i=0;i<20;i++){
  const board=(await db.query('select app_private.pongi_whack_board() as board')).rows[0].board
  for(const target of board.filter(t=>t.at<10000))seen.add(target.kind)
 }
 expect([...seen]).toEqual(expect.arrayContaining(['impostor','hay','sandcastle']))
})
it('deducts two points for the sandcastle and pays the resulting score once',async()=>{
 const {run}=await action('start',crypto.randomUUID())
 const board=[{id:0,hole:0,at:500,until:1500,kind:'golden'},{id:1,hole:1,at:2000,until:3000,kind:'sandcastle'}]
 await db.query("update app_private.pongi_whack_runs set targets=$1,started_at=clock_timestamp()-interval '31 seconds' where id=$2",[JSON.stringify(board),run.id])
 const result=await action('finish',null,run.id,[{id:0,ms:650},{id:1,ms:2150}])
 expect(result.run).toMatchObject({score:8,rewardGold:8,mistakes:1})
 expect((await action('finish',null,run.id,[])).gold).toBe(98)
})
it('recomputes points on the server and is idempotent after finishing',async()=>{
 const {run}=await action('start',crypto.randomUUID())
 await db.query("update app_private.pongi_whack_runs set started_at=clock_timestamp()-interval '31 seconds' where id=$1",[run.id])
 let total=0,mistakes=0
 const hits=run.targets.map((t:any)=>{const p=t.kind==='pongi'?1:t.kind==='golden'?10:-2;total=Math.max(0,total+p);if(p<0)mistakes++;return {id:t.id,ms:t.at+150}})
 const finished=await action('finish',null,run.id,hits)
 expect(finished.run).toMatchObject({score:total,rewardGold:total,mistakes});expect(finished.run.finishedAt).toBeTruthy()
 expect((await action('finish',null,run.id,[])).run.score).toBe(total)
 expect((await action('state')).gold).toBe(90+total)
})
it('rejects early submissions',async()=>{const {run}=await action('start',crypto.randomUUID());await expect(action('finish',null,run.id)).rejects.toThrow('TOO_EARLY')})
it('pays exactly one gold per verified point once and also enters the weekly ranking',async()=>{
 const {run}=await action('start',crypto.randomUUID())
 const board=[{id:0,hole:0,at:500,until:1500,kind:'pongi'},{id:1,hole:1,at:2000,until:3000,kind:'golden'}]
 await db.query("update app_private.pongi_whack_runs set started_at=clock_timestamp()-interval '31 seconds',targets=$2 where id=$1",[run.id,JSON.stringify(board)])
 const result=await action('finish',null,run.id,[{id:0,ms:700},{id:1,ms:2200}])
 expect(result.gold).toBe(101);expect(result.run).toMatchObject({score:11,rewardGold:11})
 expect((await action('finish',null,run.id,[])).gold).toBe(101)
 expect((await db.query("select count(*)::int n,sum(delta)::int total from public.gold_transactions where user_id=$1 and item_id='arcade:pongi-whack:reward'",[owner])).rows[0]).toEqual({n:1,total:11})
 const ranking=(await db.query('select public.pongi_whack_leaderboard(0) r')).rows[0].r
 expect(ranking.rows).toEqual(expect.arrayContaining([expect.objectContaining({id:run.id,score:11})]))
})
it('preserves sixty-second deadlines for an older attempt',async()=>{
 const {run}=await action('start',crypto.randomUUID())
 await db.query("update app_private.pongi_whack_runs set duration_ms=60000,started_at=clock_timestamp()-interval '31 seconds' where id=$1",[run.id])
 expect((await action('state')).run.durationMs).toBe(60000)
 await db.exec('savepoint early');await expect(action('finish',null,run.id)).rejects.toThrow('TOO_EARLY');await db.exec('rollback to early')
 await db.query("update app_private.pongi_whack_runs set started_at=clock_timestamp()-interval '61 seconds' where id=$1",[run.id])
 expect((await action('finish',null,run.id)).run.finishedAt).toBeTruthy()
})
it('rejects insufficient funds without creating an attempt',async()=>{await db.query('update public.player_wallets set gold=9 where user_id=$1',[owner]);await expect(action('start',crypto.randomUUID())).rejects.toThrow('INSUFFICIENT_GOLD')})
it('pays the entire score even when the score exceeds thirty',async()=>{
 const {run}=await action('start',crypto.randomUUID())
 const board=Array.from({length:32},(_,id)=>({id,hole:id%12,at:500+id*300,until:700+id*300,kind:id===31?'golden':'pongi'}))
 await db.query("update app_private.pongi_whack_runs set started_at=clock_timestamp()-interval '31 seconds',targets=$2 where id=$1",[run.id,JSON.stringify(board)])
 const result=await action('finish',null,run.id,board.map(t=>({id:t.id,ms:t.at+100})))
 expect(result.run).toMatchObject({score:41,rewardGold:41});expect(result.gold).toBe(131)
})
it('rejects a second active attempt',async()=>{await action('start',crypto.randomUUID());await expect(action('start',crypto.randomUUID())).rejects.toThrow('ACTIVE_RUN')})
it('rejects duplicate or forged hits instead of trusting client points',async()=>{
 const {run}=await action('start',crypto.randomUUID());await db.query("update app_private.pongi_whack_runs set started_at=clock_timestamp()-interval '31 seconds' where id=$1",[run.id])
 const t=run.targets[0];await expect(action('finish',null,run.id,[{id:t.id,ms:t.at+150},{id:t.id,ms:t.at+250}])).rejects.toThrow('INVALID_HITS')
})
it('rejects another account and direct table writes',async()=>{
 const {run}=await action('start',crypto.randomUUID());await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other]);await db.exec('set role authenticated')
 await expect(action('leave',null,run.id)).rejects.toThrow('RUN_NOT_FOUND')
})
it('keeps private game tables and helper functions unavailable to authenticated callers',async()=>{
 const r=(await db.query("select has_table_privilege('authenticated','app_private.pongi_whack_runs','insert') access,has_function_privilege('anon','public.pongi_whack_action(text,uuid,uuid,jsonb)','execute') anon,has_function_privilege('authenticated','app_private.pongi_whack_board()','execute') helper")).rows[0]
 expect(r).toEqual({access:false,anon:false,helper:false})
})
it('uses the weekly gift pipeline exactly once and preserves existing game rankings',async()=>{
 const week=(await db.query("select (date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul')::date-7)::text w")).rows[0].w
 await db.query("update app_private.arcade_reward_settings set first_week=$1::date",[week])
 await db.query("insert into app_private.pongi_whack_runs(user_id,operation_id,started_at,finished_at,targets,score,mistakes) values($1,gen_random_uuid(),$3::date::timestamp at time zone 'Asia/Seoul',($3::date::timestamp at time zone 'Asia/Seoul')+interval '60 seconds','[]',50,1),($2,gen_random_uuid(),$3::date::timestamp at time zone 'Asia/Seoul',($3::date::timestamp at time zone 'Asia/Seoul')+interval '60 seconds','[]',50,2)",[owner,other,week])
 const ranks=(await db.query("select * from app_private.arcade_weekly_rankings('pongi-whack',$1::date) order by rank",[week])).rows
 expect(ranks.map((r:any)=>r.user_id)).toEqual([owner,other])
 expect((await db.query('select app_private.settle_arcade_weeks() n')).rows[0].n).toBe(2)
 expect((await db.query('select app_private.settle_arcade_weeks() n')).rows[0].n).toBe(0)
 expect((await db.query("select quantity from public.collectible_gifts where reward_id like 'arcade-weekly:pongi-whack:%' order by quantity desc")).rows.map((r:any)=>r.quantity)).toEqual([2000,1500])
})
