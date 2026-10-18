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
it('returns 40% for all standard baits and 100% for safe bait in both odds API and preparation',async()=>{
 const rows=(await db.query('select id,app_private.fishing_success_chance_bp(id) as chance from public.fishing_baits')).rows
 for(const r of rows)expect(r.chance).toBe(r.id==='bait_safe'?10000:4000)
 const state=(await db.query('select public.fishing_state() as s')).rows[0].s
 expect(state.successChanceBp).toBe(4000)
 for(const b of state.baits)expect(b.successChanceBp).toBe(b.id==='bait_safe'?10000:4000)
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
 await db.exec(readSql('supabase/migrations/20261018075922_fishing_forty_percent_safe_bait.sql'))
 expect(await prepare('bait',old.operation_id)).toEqual(old)
 await finish(old.operation_id,false)
})
it('keeps chance helper private while authenticated players can prepare and fail safe casts',async()=>{
 expect((await db.query("select has_function_privilege('authenticated','app_private.fishing_success_chance_bp(text)','execute') as yes")).rows[0].yes).toBe(false)
 await db.exec('set role authenticated')
 try{const p=await prepare('bait_safe');expect(p.eligible).toBe(true);expect((await finish(p.operation_id,false)).attempt.collectible_id).toBeNull()}
 finally{await db.exec('reset role')}
})
