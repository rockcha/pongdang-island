// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:any,uid:string
const seeds:Record<string,number>={}
async function spin(free:boolean,op=crypto.randomUUID()){
 await db.exec('set role authenticated')
 const result=(await db.query('select public.relic_roulette_spin($1,$2) s',[op,free])).rows[0].s
 await db.exec('reset role');return result
}
async function reject(free:boolean,message:string,op=crypto.randomUUID()){
 await db.exec('savepoint rejected_spin')
 try{await expect(spin(free,op)).rejects.toThrow(message)}finally{await db.exec('rollback to rejected_spin;reset role;release savepoint rejected_spin')}
}
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 for(let i=0;i<2000&&Object.keys(seeds).length<4;i++){
  const seed=i/1000-1
  await db.query('select setseed($1)',[seed])
  const {grade}=(await db.query('select app_private.relic_roulette_grade(floor(random()*10000)::integer) grade')).rows[0]
  seeds[grade]??=seed
 }
 expect(Object.keys(seeds)).toHaveLength(4)
},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('begin');uid=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'룰렛테스트')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid])
 await db.query('insert into public.player_wallets(user_id,gold) values($1,5000) on conflict(user_id) do update set gold=5000',[uid])
})
afterEach(async()=>{await db.exec('rollback;reset role')})
it('assigns exactly 60%, 34%, 5% and 1% of all ten thousand roll values',async()=>{
 expect((await db.query('select app_private.relic_roulette_grade(n) grade,count(*)::integer n from generate_series(0,9999)n group by grade order by grade')).rows).toEqual([{grade:'epic',n:500},{grade:'mythic',n:100},{grade:'none',n:6000},{grade:'rare',n:3400}])
})
it('uses one free spin and charges exactly 500 thereafter, including misses',async()=>{
 const before=(await db.query('select public.menu_status() s')).rows[0].s
 expect(before.relicRoulette.freeAvailable).toBe(true)
 await db.query('select setseed($1)',[seeds.none])
 const first=await spin(true)
 const after=(await db.query('select public.menu_status() s')).rows[0].s
 expect(after.relicRoulette.freeAvailable).toBe(false)
 expect(after.relicRoulette.resetsAt).toBe(first.resetAt)
 expect(first.spin).toMatchObject({grade:'none',cost:0,relic:null})
 expect(first).toMatchObject({gold:5000,freeAvailable:false,nextCost:500,odds:{none:60,rare:34,epic:5,mythic:1}})
 expect(new Date(first.resetAt).getUTCHours()).toBe(15)
 await reject(true,'ROULETTE_PRICE_CHANGED')
 const paid=await spin(false)
 expect(paid.gold).toBe(4500);expect(paid.spin.cost).toBe(500)
 expect((await db.query('select delta from public.gold_transactions where user_id=$1 order by delta',[uid])).rows).toEqual([{delta:-500},{delta:0}])
})
it.each(['rare','epic','mythic'])('grants an enabled %s original, records discovery and stacks duplicate copies',async grade=>{
 await db.query('select setseed($1)',[seeds[grade]])
 const op=crypto.randomUUID(),first=await spin(true,op)
 expect(first.spin.grade).toBe(grade);expect(first.spin.relic.rarity).toBe(grade)
 expect(first.spin.relic).toMatchObject({quantityBefore:0,quantityAfter:1})
 const id=first.spin.relic.id
 expect((await db.query('select quantity from app_private.player_fishing_relics where user_id=$1 and relic_id=$2',[uid,id])).rows[0].quantity).toBe(1)
 expect((await db.query('select count(*)::int n from app_private.player_fishing_relic_discoveries where user_id=$1 and relic_id=$2',[uid,id])).rows[0].n).toBe(1)
 await db.query('select setseed($1)',[seeds[grade]])
 const second=await spin(false)
 expect(second.spin.relic.id).toBe(id)
 expect(second.spin.relic).toMatchObject({quantityBefore:1,quantityAfter:2})
 expect((await spin(true,op)).spin.relic.quantityAfter).toBe(1)
 expect((await db.query('select quantity from app_private.player_fishing_relics where user_id=$1 and relic_id=$2',[uid,id])).rows[0].quantity).toBe(2)
})
it('replays legacy receipts without rewriting them or granting another copy',async()=>{
 await db.query('select setseed($1)',[seeds.rare])
 const op=crypto.randomUUID(),first=await spin(true,op)
 await db.query("update app_private.relic_roulette_operations set result=result #- '{relic,quantityBefore}' #- '{relic,quantityAfter}' where user_id=$1 and operation_id=$2",[uid,op])
 const replay=await spin(true,op)
 expect(replay.replayed).toBe(true)
 expect(replay.spin.relic.id).toBe(first.spin.relic.id)
 expect(replay.spin.relic.quantityAfter).toBeUndefined()
 expect((await db.query('select quantity from app_private.player_fishing_relics where user_id=$1 and relic_id=$2',[uid,first.spin.relic.id])).rows[0].quantity).toBe(1)
})
it('replays the same result without charging or awarding again, and rejects conflicting operations',async()=>{
 const op=crypto.randomUUID(),first=await spin(true,op),again=await spin(true,op)
 expect(again.spin).toEqual(first.spin);expect(again.replayed).toBe(true);expect(again.gold).toBe(5000)
 expect(again.history).toHaveLength(1)
 await reject(false,'OPERATION_CONFLICT',op)
 const other=crypto.randomUUID()
 await db.query("insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values($1,$2,'buy','other',0)",[uid,other])
 await reject(false,'OPERATION_CONFLICT',other)
})
it('refreshes free eligibility on the Korean calendar day and refuses a stale paid request',async()=>{
 await spin(true)
 await db.query('update app_private.relic_roulette_operations set spin_day=spin_day-1 where user_id=$1',[uid])
 await reject(false,'ROULETTE_PRICE_CHANGED')
 const next=await spin(true)
 expect(next.spin.cost).toBe(0);expect(next.gold).toBe(5000)
 expect(next.history).toHaveLength(2)
})
it('rejects insufficient gold and never consumes a new receipt',async()=>{
 await spin(true)
 await db.query('update public.player_wallets set gold=499 where user_id=$1',[uid])
 await reject(false,'INSUFFICIENT_GOLD')
 expect((await db.query('select count(*)::int n from app_private.relic_roulette_operations where user_id=$1',[uid])).rows[0].n).toBe(1)
 await db.query('update public.player_wallets set gold=500 where user_id=$1',[uid])
 expect((await spin(false)).gold).toBe(0)
})
it('preserves historical 1000-gold receipts when replaying after the price reduction',async()=>{
 await spin(true)
 const op=crypto.randomUUID(),paid=await spin(false,op)
 const legacy={...paid.spin,cost:1000}
 await db.query('update app_private.relic_roulette_operations set cost=1000,result=$3 where user_id=$1 and operation_id=$2',[uid,op,JSON.stringify(legacy)])
 const replay=await spin(false,op)
 expect(replay.spin).toEqual(legacy)
 expect(replay.gold).toBe(paid.gold)
 expect(replay.nextCost).toBe(500)
})
it('limits history to the owner and ten spins and blocks direct access and anonymous callers',async()=>{
 await spin(true)
 for(let i=0;i<11;i++){
  await db.query('update public.player_wallets set gold=5000 where user_id=$1',[uid]);await spin(false)
 }
 const state=(await db.query('select public.relic_roulette_state() s')).rows[0].s
 expect(state.history).toHaveLength(10)
 const other=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[other]);await db.query("select set_config('request.jwt.claim.sub',$1,true)",[other])
 expect((await db.query('select public.relic_roulette_state() s')).rows[0].s.history).toEqual([])
 expect((await db.query("select has_table_privilege('authenticated','app_private.relic_roulette_operations','SELECT') r,has_table_privilege('authenticated','app_private.relic_roulette_operations','INSERT') w,(select prosecdef from pg_proc where oid='public.relic_roulette_spin(uuid,boolean)'::regprocedure) d")).rows[0]).toEqual({r:false,w:false,d:false})
 await db.exec('savepoint anon_spin;set role anon')
 await expect(db.query('select public.relic_roulette_spin($1,true)',[crypto.randomUUID()])).rejects.toThrow('permission denied')
 await db.exec('rollback to anon_spin;reset role;release savepoint anon_spin')
})
