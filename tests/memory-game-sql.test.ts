// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,expect,it } from 'vitest'
import type { MemoryState,MemoryRun,MemoryLeaderboard } from '@/features/arcade/memory-api'
const db=new PGlite(),uid='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002'
async function user(sql:string,args:unknown[]=[],id=uid){await db.exec('set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return await db.query(sql,args)}finally{await db.exec('reset role')}}
async function act(action:string,run:string|null=null,card:number|null=null,op:string|null=null,id=uid):Promise<MemoryState>{return (await user('select public.memory_game($1,$2,$3,$4) as value',[action,op,run,card],id)).rows[0].value as MemoryState}
async function start(){return (await act('start',null,null,crypto.randomUUID())).run!}
async function deck(run:MemoryRun){return (await db.query<{deck:string[]}>('select deck from app_private.memory_game_boards where run_id=$1',[run.id])).rows[0].deck}
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,app_private to authenticated;insert into auth.users values('${uid}'),('${other}');
 create table public.player_profiles(id uuid primary key,nickname text);insert into public.player_profiles values('${uid}','Player One'),('${other}','Player Two');`)
 await db.exec(await readFile('supabase/sql/08-gold/01-wallet.sql','utf8'))
 await db.exec(await readFile('supabase/migrations/20261016105544_memory_card_arcade.sql','utf8'))
},30000)
beforeEach(async()=>{await db.exec('truncate public.memory_game_runs cascade;truncate public.gold_transactions,public.player_wallets');await db.query('insert into public.player_wallets(user_id,gold) values($1,100),($2,100)',[uid,other])})
afterAll(()=>db.close())
it('deals exactly 12 pairs and a face-up center joker, charges once, and starts timing only on a real flip',async()=>{
 const op=crypto.randomUUID(),run=(await act('start',null,null,op)).run!,cards=await deck(run)
 expect(cards).toHaveLength(25);expect(cards[12]).toBe('pongi')
 expect(new Set(cards).size).toBe(13)
 for(const face of new Set(cards))expect(cards.filter(x=>x===face)).toHaveLength(face==='pongi'?1:2)
 expect(run.cards.filter(Boolean)).toEqual(['pongi']);expect(run.startedAt).toBeNull()
 expect((await act('start',null,null,op)).run!.id).toBe(run.id);expect((await start()).id).toBe(run.id)
 expect((await act('flip',run.id,13)).run!.startedAt).toBeNull()
 expect((await act('flip',run.id,1)).run!.startedAt).toBeTruthy()
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0]).toEqual({gold:90})
})
it('keeps mismatches visible, blocks third flips until clear, and never reveals the hidden board',async()=>{
 let run=await start();const cards=await deck(run),a=1,b=cards.findIndex((face,i)=>i!==12&&face!==cards[0])+1
 run=(await act('flip',run.id,a)).run!;run=(await act('flip',run.id,b)).run!
 expect(run.moves).toBe(1);expect(run.cards.filter(Boolean)).toHaveLength(3)
 expect((await act('flip',run.id,25)).run!.moves).toBe(1)
 expect((await act('clear',run.id)).run!.second).toBe(b)
 await db.query("update app_private.memory_game_boards set clear_at=clock_timestamp()-interval '1 second' where run_id=$1",[run.id])
 run=(await act('clear',run.id)).run!;expect(run.cards.filter(Boolean)).toEqual(['pongi'])
})
it('finishes all 12 pairs once and ranks only the personal best completed time this week',async()=>{
 let run=await start();const cards=await deck(run)
 for(const face of new Set(cards.filter(x=>x!=='pongi'))){const indices=cards.flatMap((x,i)=>x===face?[i+1]:[]);run=(await act('flip',run.id,indices[0])).run!;run=(await act('flip',run.id,indices[1])).run!}
 expect(run).toMatchObject({finished:true,moves:12});expect(run.matched).toHaveLength(24)
 const final=run.elapsedMs;expect((await act('flip',run.id,1)).run!.elapsedMs).toBe(final)
 const board=(await user('select public.memory_leaderboard(0) as value')).rows[0].value as MemoryLeaderboard
 expect(board.total).toBe(1);expect(board.rows[0]).toMatchObject({rank:1,elapsedMs:final,mine:true})
 await db.query("insert into public.memory_game_runs(user_id,operation_id,finished_at,elapsed_ms) values($1,$2,clock_timestamp(),$3),($1,$4,clock_timestamp()-interval '14 days',0)",[uid,crypto.randomUUID(),final+1000,crypto.randomUUID()])
 const repeated=(await user('select public.memory_leaderboard(0) as value')).rows[0].value as MemoryLeaderboard
 expect(repeated.total).toBe(1);expect(repeated.rows[0].elapsedMs).toBe(final)
})
it('rejects private deck access, foreign runs, invalid cards and unauthenticated calls',async()=>{
 const run=await start()
 await expect(act('flip',run.id,1,null,other)).rejects.toThrow('MEMORY_RUN_NOT_FOUND')
 await expect(act('flip',run.id,26)).rejects.toThrow('INVALID_MEMORY_CARD')
 await expect(user('select * from app_private.memory_game_boards')).rejects.toThrow('permission denied')
 await expect(user('update public.memory_game_runs set elapsed_ms=0')).rejects.toThrow('permission denied')
 await expect(user('select app_private.memory_response($1)',[run.id])).rejects.toThrow('permission denied')
 await expect(act('state',null,null,null,'')).rejects.toThrow('AUTH_REQUIRED')
 await db.exec('set role anon');await expect(db.query('select public.memory_leaderboard(0)')).rejects.toThrow('permission denied');await db.exec('reset role')
})
it('abandons without ranking and rejects insufficient funds without creating a run',async()=>{
 let run=await start();run=(await act('leave',run.id)).run!;expect(run.abandoned).toBe(true)
 expect((await act('state')).run).toBeNull()
 expect(((await user('select public.memory_leaderboard(0) as value')).rows[0].value as MemoryLeaderboard).total).toBe(0)
 await db.query('update public.player_wallets set gold=9 where user_id=$1',[uid]);await expect(start()).rejects.toThrow('INSUFFICIENT_GOLD')
})
