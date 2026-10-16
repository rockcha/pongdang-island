// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest'
const db=new PGlite(),uid='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002'
type State={run:{id:string;score:number;lives:number;finished:boolean;round:{id:string;number:number;options:{id:string;name:string}[];answerName:string|null;answered:boolean;correct:boolean;timedOut:boolean}}|null}
async function user(sql:string,args:unknown[]=[],id=uid){
 await db.exec('set role authenticated')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return await db.query(sql,args)}finally{await db.exec('reset role')}
}
async function act(action:string,op:string|null=null,run:string|null=null,round:string|null=null,choice:string|null=null,id=uid):Promise<State>{
 return (await user('select public.shadow_game($1,$2,$3,$4,$5) as value',[action,op,run,round,choice],id)).rows[0].value as State
}
async function start(){return (await act('start',crypto.randomUUID())).run!}
async function answer(run:NonNullable<State['run']>,correct=true){
 const target=(await db.query<{target_id:string}>('select target_id from app_private.shadow_game_rounds where id=$1',[run.round.id])).rows[0].target_id
 return (await act('answer',null,run.id,run.round.id,correct?target:run.round.options.find(o=>o.id!==target)!.id)).run!
}
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,app_private to authenticated;
 insert into auth.users values('${uid}'),('${other}');
 create table public.player_profiles(id uuid primary key,nickname text);insert into public.player_profiles values('${uid}','Player One'),('${other}','Player Two');
 create table public.collectible_species(id text primary key,name text,kind text,thumbnail_path text);
 insert into public.collectible_species values('a','Fish A','fish','a.png'),('b','Trash B','trash','b.png'),('c','Decor C','decoration','c.png'),('d','Fish D','fish','d.png'),('map','Map','map','map.png');`)
 await db.exec(await readFile('supabase/sql/08-gold/01-wallet.sql','utf8'))
 await db.exec(await readFile('supabase/migrations/20261016101729_shadow_guessing_arcade.sql','utf8'))
 await db.exec(await readFile('supabase/migrations/20261016103215_shadow_score_cap.sql','utf8'))
 await db.exec(await readFile('supabase/migrations/20261016114524_shadow_eight_seconds.sql','utf8'))
},30000)
beforeEach(async()=>{
 await db.exec('truncate public.shadow_game_runs cascade;truncate public.gold_transactions,public.player_wallets')
 await db.query('insert into public.player_wallets(user_id,gold) values($1,100),($2,100)',[uid,other])
})
afterAll(()=>db.close())
it('ends a normal game at 100 points even with lives remaining',async()=>{
 let run=await start()
 await db.query('update public.shadow_game_runs set score=99 where id=$1',[run.id])
 run=await answer(run,true)
 expect(run).toMatchObject({score:100,lives:3,finished:true})
 expect((await act('next',null,run.id,run.round.id)).run).toMatchObject({score:100,finished:true})
 expect((await act('state')).run).toBeNull()
})
it('charges 10 once, resumes active games, and never exposes map options or the answer',async()=>{
 const op=crypto.randomUUID(),a=(await act('start',op)).run!
 expect(a.round.options).toHaveLength(4)
 expect(a.round.options.some(o=>o.id==='map')).toBe(false)
 expect(a.round.answerName).toBeNull()
 const timing=(await db.query<{seconds:number}>("select extract(epoch from(deadline-clock_timestamp()))::float as seconds from app_private.shadow_game_rounds where run_id=$1",[a.id])).rows[0].seconds
 expect(timing).toBeGreaterThan(6);expect(timing).toBeLessThanOrEqual(8)
 expect((await act('start',op)).run!.id).toBe(a.id)
 expect((await start()).id).toBe(a.id)
 expect((await act('state')).run!.id).toBe(a.id)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0]).toEqual({gold:90})
 expect((await db.query('select count(*)::int as n from public.gold_transactions')).rows[0]).toEqual({n:1})
})
it('scores valid answers on the server exactly once and does not skip on next retries',async()=>{
 let run=await start()
 await expect(act('next',null,run.id,run.round.id)).rejects.toThrow('SHADOW_ANSWER_REQUIRED')
 await expect(act('answer',null,run.id,run.round.id,'map')).rejects.toThrow('INVALID_SHADOW_CHOICE')
 await expect(act('answer',null,run.id,run.round.id)).rejects.toThrow('SHADOW_NOT_EXPIRED')
 const previous=run.round.id
 run=await answer(run)
 expect(run).toMatchObject({score:1,lives:3,round:{answered:true,correct:true}})
 expect((await act('answer',null,run.id,previous,run.round.options[0].id)).run!.score).toBe(1)
 run=(await act('next',null,run.id,previous)).run!
 expect(run.round.number).toBe(2)
 expect((await act('next',null,run.id,previous)).run!.round.id).toBe(run.round.id)
})
it('deducts lives on wrong answers and timeouts, then registers a completed run',async()=>{
 let run=await start()
 run=await answer(run,false);expect(run.lives).toBe(2)
 run=(await act('next',null,run.id,run.round.id)).run!
 await db.query("update app_private.shadow_game_rounds set deadline=clock_timestamp()-interval '1 second' where id=$1",[run.round.id])
 run=await answer(run,true);expect(run).toMatchObject({score:0,lives:1,round:{correct:false,timedOut:true}})
 run=(await act('next',null,run.id,run.round.id)).run!
 run=await answer(run,false);expect(run).toMatchObject({score:0,lives:0,finished:true})
 const board=(await user('select public.shadow_leaderboard(0) as value')).rows[0].value as {total:number;rows:{rank:number;score:number;mine:boolean}[]}
 expect(board.total).toBe(1);expect(board.rows[0]).toMatchObject({rank:1,score:0,mine:true})
 expect((await act('state')).run).toBeNull()
})
it('rejects insufficient gold atomically and rolls back when no valid question pool exists',async()=>{
 await db.query('update public.player_wallets set gold=9 where user_id=$1',[uid])
 await expect(start()).rejects.toThrow('INSUFFICIENT_GOLD')
 expect((await db.query('select * from public.shadow_game_runs')).rows).toHaveLength(0)
 await db.query('update public.player_wallets set gold=100 where user_id=$1',[uid])
 await db.exec("update public.collectible_species set kind='map' where id='d'")
 try{await expect(start()).rejects.toThrow('SHADOW_POOL_UNAVAILABLE')}finally{await db.exec("update public.collectible_species set kind='fish' where id='d'")}
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0]).toEqual({gold:100})
})
it('blocks private answers, forged records, anonymous calls and cross-account actions',async()=>{
 const run=await start()
 await expect(act('answer',null,run.id,run.round.id,run.round.options[0].id,other)).rejects.toThrow('SHADOW_RUN_NOT_FOUND')
 await expect(user('select * from app_private.shadow_game_rounds')).rejects.toThrow('permission denied')
 await expect(user('update public.shadow_game_runs set score=999')).rejects.toThrow('permission denied')
 await expect(user('select app_private.shadow_run_response($1)',[run.id])).rejects.toThrow('permission denied')
 await expect(act('state',null,null,null,null,'')).rejects.toThrow('AUTH_REQUIRED')
 await db.exec('set role anon');await expect(db.query('select public.shadow_leaderboard(0)')).rejects.toThrow('permission denied');await db.exec('reset role')
})
it('paginates all completed records with stable rank numbers and leaves active games out',async()=>{
 for(let i=0;i<24;i++)await db.query('insert into public.shadow_game_runs(user_id,operation_id,score,lives,finished_at) values($1,$2,$3,0,clock_timestamp())',[i%2?uid:other,crypto.randomUUID(),i])
 await start()
 const a=(await user('select public.shadow_leaderboard(0) as value')).rows[0].value as {total:number;rows:{rank:number;score:number}[]}
 const b=(await user('select public.shadow_leaderboard(20) as value')).rows[0].value as typeof a
 expect(a.total).toBe(24);expect(a.rows).toHaveLength(20);expect(a.rows[0]).toMatchObject({rank:1,score:23})
 expect(b.rows).toHaveLength(4);expect(b.rows[0].rank).toBe(21)
})
