// @vitest-environment node
import {beforeAll,afterAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations,readSql} from '../scripts/db/local.mjs'
let db
const uid='00000000-0000-0000-0000-000000000987'
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id)values($1)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec("select app_private.get_gold_wallet();insert into public.player_navigation(user_id,region_id)values(auth.uid(),'pongdang');update public.player_wallets set inventory=jsonb_build_object('bait',200,'bait_safe',200) where user_id=auth.uid();")
},60000)
afterAll(async()=>{await db?.close()})
async function prepare(bait:string,id=crypto.randomUUID()){
 return (await db.query("select public.prepare_fishing('pongdang',$1,$2) as p",[bait,id])).rows[0].p
}
async function finish(id:string,won:boolean){
 return (await db.query('select public.finish_fishing($1,$2) as r',[id,won])).rows[0].r
}
it('returns bait-specific success chances through the helper and odds API',async()=>{
 const rows=(await db.query('select id,app_private.fishing_success_chance_bp(id) as chance from public.fishing_baits')).rows
 for(const r of rows)expect(r.chance).toBe(r.id==='bait_safe'?10000:['bait_grubby_magnet','bait_first_greeting','bait_magnet','bait_forbidden_star','bait_epic','bait_special'].includes(r.id)?6000:4000)
 const state=(await db.query('select public.fishing_state() as s')).rows[0].s
 expect(state.successChanceBp).toBe(4000)
 for(const b of state.baits)expect(b.successChanceBp).toBe(b.id==='bait_safe'?10000:['bait_grubby_magnet','bait_first_greeting','bait_magnet','bait_forbidden_star','bait_epic','bait_special'].includes(b.id)?6000:4000)
 for(let i=0;i<20;i++){
  const p=await prepare('bait_safe');expect(p.eligible).toBe(true);expect(p.species).toBeTruthy()
  await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '20 seconds' where operation_id=$1",[p.operation_id])
  const r=await finish(p.operation_id,true);expect(r.attempt.species.id).toBe(p.species.id)
 }
},30000)
it('still loses on failed controls, prevents duplicate bait consumption, and preserves old reservations',async()=>{
 const p=await prepare('bait_safe')
 const count=async()=>(await db.query("select (inventory->>'bait_safe')::int as n from public.player_wallets where user_id=$1",[uid])).rows[0].n
 const before=await count()
 expect(await prepare('bait_safe',p.operation_id)).toEqual(p)
 expect(await count()).toBe(before)
 const loss=await finish(p.operation_id,false);expect(loss.attempt.collectible_id).toBeNull()
 expect((await finish(p.operation_id,true)).attempt.collectible_id).toBeNull()
 const old=await prepare('bait')
 const definitions=(await db.query("select pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and p.proname in ('fishing_success_chance_bp','prepare_fishing','fishing_state')")).rows
 await db.exec(readSql('supabase/migrations/20261018075922_fishing_forty_percent_safe_bait.sql'))
 expect(await prepare('bait',old.operation_id)).toEqual(old)
 await finish(old.operation_id,false)
 for(const row of definitions)await db.exec(row.definition)
})
it('keeps chance helper private while authenticated players can prepare and fail safe casts',async()=>{
 expect((await db.query("select has_function_privilege('authenticated','app_private.fishing_success_chance_bp(text)','execute') as yes")).rows[0].yes).toBe(false)
 await db.exec('set role authenticated')
 try{const p=await prepare('bait_safe');expect(p.eligible).toBe(true);expect((await finish(p.operation_id,false)).attempt.collectible_id).toBeNull()}
 finally{await db.exec('reset role')}
})

it('applies only owned bronze and calm rods to manual odds, with a 100% cap',async()=>{
 await db.exec('begin');try{
  await db.query('select public.fishing_rod_state()');
  await db.query("insert into public.player_fishing_rods(user_id,rod_id) select $1,id from public.fishing_rods where id in ('bronze','calm','coral') on conflict do nothing",[uid]);
  for(const [rod,chance]of [['bronze',4100],['calm',4300],['coral',4000],['basic',4000]]){
   await db.query('select public.equip_fishing_rod($1)',[rod]);
   const s=(await db.query('select public.fishing_state() s')).rows[0].s;
   expect(s.baits.find(b=>b.id==='bait')).toMatchObject({successChanceBp:chance,baseSuccessChanceBp:4000});
   expect(s.baits.find(b=>b.id==='bait_safe').successChanceBp).toBe(10000);
   expect((await db.query("select app_private.fishing_success_chance_bp('bait') n")).rows[0].n).toBe(4000);
  }
  await db.query("delete from public.player_fishing_rods where user_id=$1 and rod_id='calm'",[uid]);
  expect((await db.query("select app_private.manual_fishing_success_chance_bp('bait') n")).rows[0].n).toBe(4000);
 }finally{await db.exec('rollback')}
});

it('charges the new catalog prices and uses the reduced rod price for resale',async()=>{
 await db.exec('begin');try{
  await db.query('update public.player_wallets set gold=5000 where user_id=$1',[uid]);
  const op=crypto.randomUUID();
  const bought=(await db.query("select public.trade_fishing_rod('bronze','buy',$1) s",[op])).rows[0].s;
  expect(bought).toMatchObject({gold:4600,delta:-400});
  expect((await db.query("select public.trade_fishing_rod('bronze','buy',$1) s",[op])).rows[0].s.delta).toBe(0);
  expect((await db.query("select public.trade_fishing_rod('bronze','sell',gen_random_uuid()) s")).rows[0].s).toMatchObject({gold:4800,delta:200});
  expect((await db.query("select public.buy_fishing_bait('bait_grubby_magnet',gen_random_uuid()) s")).rows[0].s).toMatchObject({gold:4760});
  expect((await db.query("select price from public.fishing_rods where id='lunea'")).rows[0].price).toBe(1000);
  expect((await db.query("select price from public.fishing_rods where id='mistmoon'")).rows[0].price).toBe(800);
 }finally{await db.exec('rollback')}
});
