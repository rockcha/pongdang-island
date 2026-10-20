// @vitest-environment node
import {PGlite} from '@electric-sql/pglite'
import {readFile} from 'node:fs/promises'
import {beforeAll,beforeEach,afterAll,expect,it} from 'vitest'
const db=new PGlite(),uid='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002'
async function as(role:string,sql:string,args:unknown[]=[],user=uid){await db.exec('set role '+role);try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);return await db.query(sql,args)}finally{await db.exec('reset role')}}
async function start(op=crypto.randomUUID(),user=uid){return (await as('authenticated','select public.brick_game_start($1,3) as run',[op],user)).rows[0].run as {id:string;reward:number;finished_at:string|null}}
async function settle(id:string,score:number,reward:number,final=false,user=uid){return (await as('service_role','select public.brick_game_settle($1,$2,$3,$4,$5,$6) as run',[user,id,score,reward,{ticks:0,inputs:[]},final])).rows[0].run as {reward:number;finished_at:string|null}}
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema app_private;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,app_private to authenticated;insert into auth.users values('${uid}'),('${other}');
 create table public.player_profiles(id uuid primary key,nickname text);insert into public.player_profiles values('${uid}','One'),('${other}','Two');
 create table public.player_wallets(user_id uuid primary key,gold integer,updated_at timestamptz);
 create table public.gold_transactions(user_id uuid,operation_id uuid,action text,item_id text,delta integer,primary key(user_id,operation_id));
 create function app_private.get_gold_wallet() returns void language sql as $$select$$;`)
 await db.exec(await readFile('supabase/migrations/20261020072750_brick_breaker_verified_runs.sql','utf8'))
 await db.exec(await readFile('supabase/migrations/20261020094725_brick_breaker_round_rewards_v2.sql','utf8'))
 await db.exec(await readFile('supabase/migrations/20261020111314_brick_breaker_ball_speed_v3.sql','utf8'))
 await db.exec(await readFile('supabase/migrations/20261020111636_brick_breaker_drop_odds_v4.sql','utf8'))
 await db.exec(await readFile('supabase/migrations/20261020111824_brick_breaker_compact_bricks_v5.sql','utf8'))
 await db.exec(await readFile('supabase/migrations/20261020112041_brick_breaker_missed_ball_restart_v6.sql','utf8'))
},30000)
beforeEach(async()=>{await db.exec('truncate public.brick_game_runs,public.gold_transactions,public.player_wallets');await db.query('insert into public.player_wallets(user_id,gold) values($1,100),($2,100)',[uid,other])})
afterAll(()=>db.close())
it('keeps older clients on version 2 while new clients explicitly start version 3',async()=>{
 const old=(await as('authenticated','select public.brick_game_start($1) as run',[crypto.randomUUID()])).rows[0].run as {id:string;engine_version:number}
 expect(old.engine_version).toBe(2)
 await settle(old.id,0,0,true)
 const next=await start()
 expect((await db.query('select engine_version from public.brick_game_runs where id=$1',[next.id])).rows[0].engine_version).toBe(3)
})
it('starts free, retries idempotently and resumes a single active run',async()=>{
 const op=crypto.randomUUID(),run=await start(op)
 expect((await start(op)).id).toBe(run.id);expect((await start()).id).toBe(run.id)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(100)
 expect((await db.query('select count(*)::int as n from public.gold_transactions')).rows[0].n).toBe(0)
})
it('allows an empty wallet but rejects anonymous starts and direct reward writes',async()=>{
 await db.query('update public.player_wallets set gold=0 where user_id=$1',[uid])
 expect((await start()).id).toBeTruthy()
 await expect(as('anon','select public.brick_game_start($1)',[crypto.randomUUID()])).rejects.toThrow()
 await expect(as('authenticated','select public.brick_game_settle($1,$2,24,10,$3,true)',[uid,crypto.randomUUID(),{ticks:0,inputs:[]}])).rejects.toThrow()
 await expect(as('authenticated','update public.brick_game_runs set reward=150')).rejects.toThrow()
})
it('pays verified round deltas once and keeps them on early exit',async()=>{
 const run=await start();await settle(run.id,0,50);await settle(run.id,0,50)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(150)
 const finished=await settle(run.id,0,150,true);expect(finished.finished_at).toBeTruthy()
 await settle(run.id,0,150,true)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(250)
})
it('enforces ownership and rejects backwards or invalid settlements',async()=>{
 const run=await start();await settle(run.id,0,30)
 await expect(settle(run.id,0,30,false,other)).rejects.toThrow('RUN_NOT_FOUND')
 await expect(settle(run.id,0,0)).rejects.toThrow('INVALID_SETTLEMENT')
 await expect(settle(run.id,25,11)).rejects.toThrow('INVALID_SETTLEMENT')
 await expect(settle(run.id,1,50)).rejects.toThrow('INVALID_SETTLEMENT')
 await expect(settle(run.id,0,6410)).rejects.toThrow('INVALID_SETTLEMENT')
 expect((await as('authenticated','select id from public.brick_game_runs',[],other)).rows).toHaveLength(0)
})
it('ranks personal best finished runs without exposing player IDs or replay data',async()=>{
 const first=await start();await settle(first.id,0,30,true)
 const second=await start();await settle(second.id,0,80,true)
 const rival=await start(crypto.randomUUID(),other);await settle(rival.id,0,50,true,other)
 const value=(await as('authenticated','select public.brick_leaderboard(0) as value')).rows[0].value as {total:number;rows:Record<string,unknown>[]}
 expect(value.total).toBe(2);expect(value.rows[0]).toMatchObject({nickname:'One',gold:80,mine:true});expect(value.rows[0]).not.toHaveProperty('score');expect(value.rows[0]).not.toHaveProperty('seed');expect(value.rows[0]).not.toHaveProperty('user_id')
})
it('keeps legacy runs settleable without mixing their rules with version 2',async()=>{
 const run=await start()
 await db.query('update public.brick_game_runs set engine_version=1 where id=$1',[run.id])
 await settle(run.id,24,10)
 await expect(settle(run.id,0,50)).rejects.toThrow('INVALID_SETTLEMENT')
 await settle(run.id,48,30,true)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(130)
 const next=await start()
 expect((await db.query('select engine_version from public.brick_game_runs where id=$1',[next.id])).rows[0].engine_version).toBe(3)
})
