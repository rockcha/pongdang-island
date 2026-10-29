// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

let db:Awaited<ReturnType<typeof createLocalDatabase>>,uid:string
async function call(sql:string,args:unknown[]=[]){
 await db.exec('set role authenticated')
 const result=(await db.query(sql,args)).rows[0]?.s
 await db.exec('reset role')
 return result
}
async function reject(sql:string,args:unknown[],message:string){
 await db.exec('savepoint rejected')
 try{await expect(call(sql,args)).rejects.toThrow(message)}finally{await db.exec('rollback to rejected;reset role;release savepoint rejected')}
}
const craft=(a:string,b:string,op=crypto.randomUUID())=>call('select public.craft_relic($1,$2,$3) s',[a,b,op])
async function quantity(id:string){return (await db.query('select quantity from app_private.player_fishing_relics where user_id=$1 and relic_id=$2',[uid,id])).rows[0]?.quantity??0}
async function roll(value:number){await db.exec(`create function app_private.crafting_test_random() returns double precision language sql as $$select ${value}::double precision$$`);const f=(await db.query("select pg_get_functiondef('app_private.craft_relic(text,text,uuid)'::regprocedure) d")).rows[0].d;await db.exec(f.replaceAll('random()','app_private.crafting_test_random()'))}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('begin');uid=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'세공테스트')",[uid])
 await db.query('insert into app_private.notice_operators(user_id) values($1)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid])
 await db.query("insert into public.player_wallets(user_id,gold) values($1,100000) on conflict(user_id) do update set gold=100000",[uid])
 await db.query('insert into app_private.player_fishing_relics(user_id,relic_id,quantity) select $1,id,2 from public.fishing_relics where enabled',[uid])
})
afterEach(async()=>{await db.exec('rollback;reset role')})

it('blocks nonoperators, anonymous calls, direct table access, same effects and composite inputs',async()=>{
 await db.query('delete from app_private.notice_operators where user_id=$1',[uid])
 await reject('select public.craft_relic($1,$2,$3) s',['shell-hourglass','fish-calling-bell',crypto.randomUUID()],'OPERATOR_REQUIRED')
 await db.query('insert into app_private.notice_operators values($1)',[uid])
 await reject('select public.craft_relic($1,$2,$3) s',['shell-hourglass','eternal-water-clock',crypto.randomUUID()],'RELIC_SAME_EFFECT')
 await reject('select public.craft_relic($1,$2,$3) s',['shell-hourglass','shell-hourglass',crypto.randomUUID()],'RELIC_SAME_EFFECT')
 await reject('select public.craft_relic($1,$2,$3) s',['crafted-fake','shell-hourglass',crypto.randomUUID()],'RELIC_ORIGINAL_REQUIRED')
 await reject('select * from app_private.crafted_relics',[],'permission denied')
 await db.exec('savepoint anonymous;set role anon')
 await expect(db.exec("select public.craft_relic('shell-hourglass','fish-calling-bell',gen_random_uuid())")).rejects.toThrow('permission denied')
 await db.exec('rollback to anonymous;release savepoint anonymous;reset role')
 expect(await quantity('shell-hourglass')).toBe(2)
})
it('combines both effects and replays without another charge or roll',async()=>{
 await roll(0.349999)
 const op=crypto.randomUUID(),a='shell-hourglass',b='fish-calling-bell'
 const next=await craft(a,b,op),id=next.craft.craftedId
 expect(next.craft).toMatchObject({success:true,cost:5000,chance:35})
 expect(next.relics.find(r=>r.id===id)).toMatchObject({crafted:true,quantity:1,attached:{id:b},effects:[{kind:'personal_bait_hours',value:2},{kind:'trap_seconds_per_bait',value:30}]})
 expect(await quantity(a)).toBe(1);expect(await quantity(b)).toBe(1)
 expect((await craft(a,b,op)).replayed).toBe(true)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(95000)
 await reject('select public.craft_relic($1,$2,$3) s',[a,'old-captain-seal',op],'OPERATION_CONFLICT')
 await call('select public.equip_relic($1,$2,0) s',[id,crypto.randomUUID()])
 expect((await call('select public.relic_state() s')).equippedId).toBe(id)
 expect((await db.query("select app_private.relic_bonus('personal_bait_hours') h,app_private.relic_bonus('trap_seconds_per_bait') t")).rows[0]).toMatchObject({h:'2',t:'30'})
 const other=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[other]);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other])
 expect((await call('select public.relic_state() s')).relics.some(r=>r.id===id)).toBe(false)
 await reject('select public.equip_relic($1,$2,0) s',[id,crypto.randomUUID()],'RELIC_NOT_OWNED')
})
it.each([['rare','rare'],['rare','epic'],['epic','epic'],['rare','mythic'],['epic','mythic'],['mythic','mythic']])('uses 35%% and 5000 gold for %s + %s',async(first,second)=>{
 await roll(0.35)
 const pair=(await db.query('select a.id a,b.id b from public.fishing_relics a cross join public.fishing_relics b where a.enabled and b.enabled and a.rarity::text=$1 and b.rarity::text=$2 and a.effect_kind<>b.effect_kind limit 1',[first,second])).rows[0]
 expect(pair).toBeTruthy()
 const result=await craft(pair.a,pair.b)
 expect(result.craft).toMatchObject({success:false,cost:5000,chance:35})
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(95000)
})
it('rejects an equipped material in either position even with spare copies, before charging or consuming',async()=>{
 await call('select public.equip_relic($1,$2,0) s',['shell-hourglass',crypto.randomUUID()])
 for(const [a,b] of [['shell-hourglass','fish-calling-bell'],['fish-calling-bell','shell-hourglass']]){
  await reject('select public.craft_relic($1,$2,$3) s',[a,b,crypto.randomUUID()],'RELIC_EQUIPPED')
 }
 expect(await quantity('shell-hourglass')).toBe(2)
 expect(await quantity('fish-calling-bell')).toBe(2)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(100000)
 await call('select public.equip_relic(null,$1,500) s',[crypto.randomUUID()])
 await craft('shell-hourglass','fish-calling-bell')
})
it.each([['shell-hourglass','instant-fishing-hook'],['instant-fishing-hook','shell-hourglass']])('on failure consumes only the lower rarity in either order: %s + %s',async(a,b)=>{
 await roll(0.99)
 const result=await craft(a,b)
 expect(result.craft).toMatchObject({success:false,consumedId:'shell-hourglass',cost:5000,chance:35})
 expect(await quantity('shell-hourglass')).toBe(1);expect(await quantity('instant-fishing-hook')).toBe(2)
 expect((await db.query('select count(*) n from app_private.crafted_relics')).rows[0].n).toBe(0)
})
it.each([[0.46,'shell-hourglass'],[0.9,'fish-calling-bell']])('same rarity failure loses exactly one random material at roll %s',async(value,consumed)=>{
 await roll(value)
 const result=await craft('shell-hourglass','fish-calling-bell')
 expect(result.craft.consumedId).toBe(consumed)
 expect(await quantity('shell-hourglass')+await quantity('fish-calling-bell')).toBe(3)
})
it('rejects insufficient gold atomically and preserves original ownership',async()=>{
 await db.query('update public.player_wallets set gold=0 where user_id=$1',[uid])
 await reject('select public.craft_relic($1,$2,$3) s',['shell-hourglass','fish-calling-bell',crypto.randomUUID()],'INSUFFICIENT_GOLD')
 expect(await quantity('shell-hourglass')).toBe(2)
})
it('applies both production slot effects and enforces the composite limits when equipping',async()=>{
 await roll(0)
 const result=await craft('ocean-seed','primordial-ember'),id=result.craft.craftedId
 await call('select public.equip_relic($1,$2,0) s',[id,crypto.randomUUID()])
 expect((await call('select public.production_state() s')).activeLimit).toBe(6)
 expect((await call('select public.bait_production_state() s')).activeLimit).toBe(6)
 await call('select public.equip_relic(null,$1,500) s',[crypto.randomUUID()])
 expect((await db.query("select app_private.relic_bonus('fuel_active_slots') n")).rows[0].n).toBe('0')
})
it('recognizes the auto-claim component even when it is attached to another base',async()=>{
 await roll(0)
 const result=await craft('shell-hourglass','sleepless-harvest-bell')
 await call('select public.equip_relic($1,$2,0) s',[result.craft.craftedId,crypto.randomUUID()])
 expect((await call('select public.production_state() s')).autoClaim).toBe(true)
 expect((await db.query("select relic_id from app_private.equipped_relic_effects($1) where effect_kind='production_auto_claim'",[uid])).rows[0].relic_id).toBe('sleepless-harvest-bell')
 await db.query("insert into app_private.production_sites(id,user_id,facility_id,started_at,completes_at,expires_at,run_output) values(gen_random_uuid(),$1,'tin-grandpa-hearth',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour',12)",[uid])
 await db.query("select set_config('request.jwt.claim.sub','',true)")
 expect((await db.query('select app_private.auto_claim_due_production() n')).rows[0].n).toBe(1)
 expect((await db.query('select app_private.auto_claim_due_production() n')).rows[0].n).toBe(0)
 expect((await db.query("select inventory->>'fuel' n from public.player_wallets where user_id=$1",[uid])).rows[0].n).toBe('12')
})
