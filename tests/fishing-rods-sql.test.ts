// @vitest-environment node
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
const db=new PGlite()
const alice='00000000-0000-0000-0000-000000000001',bob='00000000-0000-0000-0000-000000000002'
let migration=''
async function user(sql:string,params:unknown[]=[],uid=alice){
 await db.exec('set role authenticated')
 try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);return await db.query(sql,params)}
 finally{await db.exec('reset role')}
}
async function state(uid=alice){return (await user('select public.fishing_rod_state() as value',[],uid)).rows[0] as {value:{owned:string[];selected:string;catalog:unknown[];baits:unknown[]}}}
async function trade(id:string,action='buy',operation=crypto.randomUUID(),uid=alice){return (await user('select public.trade_fishing_rod($1,$2,$3) as value',[id,action,operation],uid)).rows[0] as {value:{gold:number;delta:number;owned:string[];selected:string}}}
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema app_private;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,app_private to authenticated;
 create table public.regions(id text primary key);
 insert into public.regions values('pongdang'),('coral'),('mistmoon'),('starruins'),('dreamabyss');
 create table public.fishing_baits(id text primary key,name text,sort_order integer);
 insert into public.fishing_baits values('bait','퐁당 지렁이',1);
 insert into auth.users values('${alice}'),('${bob}');`)
 await db.exec(await readFile('supabase/sql/08-gold/01-wallet.sql','utf8'))
 migration=await readFile('supabase/migrations/20261016074241_fishing_rod_inventory.sql','utf8')
 await db.exec(migration)
},30000)
beforeEach(async()=>{
 await db.exec('truncate public.player_rod_loadouts,public.player_fishing_rods,public.gold_transactions,public.player_wallets cascade')
 await state();await state(bob)
 await db.query('update public.player_wallets set gold=5000')
})
afterAll(()=>db.close())
it('grants exactly one starter, persists purchases and remains safe to reapply',async()=>{
 expect((await state()).value).toMatchObject({owned:['basic'],selected:'basic'})
 expect((await state()).value.catalog).toHaveLength(9)
 const bought=await trade('bronze')
 expect(bought.value).toMatchObject({gold:4200,delta:-800,owned:['basic','bronze']})
 await db.exec(migration)
 expect((await state()).value.owned).toEqual(['basic','bronze'])
 expect((await state(bob)).value.owned).toEqual(['basic'])
})
it('charges once per operation, rejects conflicts and duplicate ownership',async()=>{
 const operation=crypto.randomUUID()
 await trade('coral','buy',operation)
 expect((await trade('coral','buy',operation)).value).toMatchObject({gold:3500,delta:0})
 await expect(trade('calm','buy',operation)).rejects.toThrow('OPERATION_CONFLICT')
 await expect(trade('coral')).rejects.toThrow('ROD_ALREADY_OWNED')
 expect((await db.query('select count(*)::int as count from public.gold_transactions')).rows[0]).toEqual({count:1})
})
it('equips only owned rods, sells at half price and resets a sold loadout',async()=>{
 await expect(user("select public.equip_fishing_rod('calm')")).rejects.toThrow('ROD_NOT_OWNED')
 await trade('calm')
 await user("select public.equip_fishing_rod('calm')")
 expect((await state()).value.selected).toBe('calm')
 const operation=crypto.randomUUID(),sold=await trade('calm','sell',operation)
 expect(sold.value).toMatchObject({gold:4000,delta:1000,owned:['basic'],selected:'basic'})
 expect((await trade('calm','sell',operation)).value).toMatchObject({gold:4000,delta:0})
 await expect(trade('calm','sell')).rejects.toThrow('ROD_NOT_OWNED')
 await expect(trade('basic','sell')).rejects.toThrow('STARTER_ROD_NOT_TRADEABLE')
 await expect(trade('basic')).rejects.toThrow('STARTER_ROD_NOT_TRADEABLE')
})
it('rolls back insufficient gold, overflow, invalid items and unauthenticated calls',async()=>{
 await db.query('update public.player_wallets set gold=10 where user_id=$1',[alice])
 await expect(trade('bronze')).rejects.toThrow('INSUFFICIENT_GOLD')
 expect((await state()).value.owned).toEqual(['basic'])
 await expect(trade('unknown')).rejects.toThrow('INVALID_ROD')
 await expect(user('select public.fishing_rod_state()',[],'')).rejects.toThrow('AUTH_REQUIRED')
 await trade('bronze','buy',crypto.randomUUID(),bob)
 await db.query('update public.player_wallets set gold=1000000000 where user_id=$1',[bob])
 await expect(trade('bronze','sell',crypto.randomUUID(),bob)).rejects.toThrow('GOLD_LIMIT')
 expect((await state(bob)).value.owned).toContain('bronze')
})
it('isolates owners with RLS and blocks direct inventory, equipment and catalog changes',async()=>{
 await trade('bronze')
 expect((await user('select rod_id from public.player_fishing_rods',[],bob)).rows).toEqual([{rod_id:'basic'}])
 expect((await user('select equipped_rod_id from public.player_rod_loadouts',[],bob)).rows).toEqual([{equipped_rod_id:'basic'}])
 await expect(user("insert into public.player_fishing_rods(user_id,rod_id) values($1,'calm')",[alice])).rejects.toThrow('permission denied')
 await expect(user("update public.player_rod_loadouts set equipped_rod_id='bronze'")).rejects.toThrow('permission denied')
 await expect(user('update public.fishing_rods set price=0')).rejects.toThrow('permission denied')
 await db.exec('set role anon')
 await expect(db.query('select public.fishing_rod_state()')).rejects.toThrow('permission denied')
 await db.exec('reset role')
})
