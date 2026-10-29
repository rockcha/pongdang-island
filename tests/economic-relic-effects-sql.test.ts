// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>,uid:string
async function call(sql:string,args:unknown[]=[]){
 await db.exec('set role authenticated')
 const result=(await db.query(sql,args)).rows[0]?.s
 await db.exec('reset role');return result
}
async function equip(id:string|null){
 const current=(await call('select public.relic_state() s')).equippedId
 return call('select public.equip_relic($1,$2,$3) s',[id,crypto.randomUUID(),current?500:0])
}
const wallet=async()=> (await db.query('select gold,inventory from public.player_wallets where user_id=$1',[uid])).rows[0]
async function prepare(){return call("select public.prepare_discovery_fishing('pongdang','bait',$1,false) s",[crypto.randomUUID()])}
async function ready(op:string){await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '2 minutes' where user_id=$1 and operation_id=$2",[uid,op])}
async function roll(value:number){
 await db.exec(`create or replace function app_private.test_refund_roll() returns double precision language sql as $$select ${value}::double precision$$`)
 const f=(await db.query("select pg_get_functiondef('app_private.finish_fishing(uuid,boolean)'::regprocedure) d")).rows[0].d
 await db.exec(f.replaceAll('random()','app_private.test_refund_roll()'))
}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('begin');uid=crypto.randomUUID()
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'경제유물검증')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid])
 await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,100000,'{\"bait\":100}') on conflict(user_id) do update set gold=100000,inventory=excluded.inventory",[uid])
 await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang') on conflict(user_id) do update set region_id='pongdang'",[uid])
 await db.query('insert into app_private.player_fishing_relics(user_id,relic_id,quantity) select $1,id,2 from public.fishing_relics where enabled',[uid])
})
afterEach(async()=>{await db.exec('rollback;reset role')})

it('makes all six originals available through discovery and the item catalog',async()=>{
 const ids=['returning-bait-pouch','tide-return-bait-box','sea-king-endless-bait-pot','coin-cradling-clam','sea-merchant-pearl-vault','sea-king-golden-vault']
 const candidates=(await db.query("select reward_id from unnest(array['rare','epic','mythic']::public.game_rarity[]) r(grade) cross join lateral app_private.fishing_discovery_candidates(r.grade) c where category='relic'")).rows.map(r=>r.reward_id)
 expect(candidates).toEqual(expect.arrayContaining(ids))
 const collection=await call('select public.collection_state() s')
 expect(collection.catalog.filter(r=>ids.some(id=>r.id==='relic-'+id))).toHaveLength(6)
})

it.each([['returning-bait-pouch',1],['tide-return-bait-box',3],['sea-king-endless-bait-pot',5]])('snapshots %s at %s percent and refunds only once',async(id,percent)=>{
 await equip(id as string);const p=await prepare()
 const snapshot=(await db.query('select bait_snapshot from app_private.prepared_fishing_casts where user_id=$1 and operation_id=$2',[uid,p.operation_id])).rows[0].bait_snapshot
 expect(snapshot.relic_bait_refund_percent).toBe(percent)
 expect((await wallet()).inventory.bait).toBe(99)
 await equip(null);await ready(p.operation_id);await roll((Number(percent)-.001)/100)
 const result=await call('select public.finish_fishing($1,true) s',[p.operation_id])
 expect(result).toMatchObject({baitRefunded:true,refundedBaitId:'bait'})
 expect((await wallet()).inventory.bait).toBe(100)
 expect((await call('select public.finish_fishing($1,true) s',[p.operation_id])).replayed).toBe(true)
 expect((await wallet()).inventory.bait).toBe(100)
})
it.each([['returning-bait-pouch',.01],['tide-return-bait-box',.03],['sea-king-endless-bait-pot',.05]])('does not refund %s at the exact probability boundary',async(id,boundary)=>{
 await equip(id as string);const p=await prepare();await ready(p.operation_id);await roll(Number(boundary))
 expect((await call('select public.finish_fishing($1,true) s',[p.operation_id])).baitRefunded).toBe(false)
 expect((await wallet()).inventory.bait).toBe(99)
})
it.each(['failed','expired','old-cast'])('never refunds a %s cast',async(mode)=>{
 if(mode!=='old-cast')await equip('sea-king-endless-bait-pot')
 const p=await prepare();await ready(p.operation_id);await roll(0)
 if(mode==='old-cast'){
  await db.query("update app_private.prepared_fishing_casts set bait_snapshot=bait_snapshot-'relic_bait_refund_percent' where user_id=$1 and operation_id=$2",[uid,p.operation_id])
  await equip('sea-king-endless-bait-pot')
 }
 if(mode==='expired')await db.query("update app_private.prepared_fishing_casts set expires_at=clock_timestamp()-interval '1 second' where user_id=$1 and operation_id=$2",[uid,p.operation_id])
 expect((await call('select public.finish_fishing($1,$2) s',[p.operation_id,mode!=='failed'])).baitRefunded).toBe(false)
 expect((await wallet()).inventory.bait).toBe(99)
})

it.each([['coin-cradling-clam',2],['sea-merchant-pearl-vault',5],['sea-king-golden-vault',10]].flatMap(([id,percent])=>[3,5,7].map(days=>({id:String(id),percent:Number(percent),days}))))('adds $percent percent to the interest of a $days-day plan',async({id,percent,days})=>{
 await equip(id)
 const operation=crypto.randomUUID(),opened=await call('select public.savings_action($1,$2,null,$3,101) s',['open',operation,days]),account=opened.account.id
 const principal=101*days,base=Math.floor(principal*({3:20,5:25,7:30}[days]!)/100),bonus=base+Math.floor(base*percent/100)
 expect(opened.account).toMatchObject({relicBonusPercent:percent,expectedBonus:bonus,expectedPayout:principal+bonus})
 await equip(null)
 expect((await call('select public.savings_action($1,$2,null,$3,101) s',['open',operation,days])).account.relicBonusPercent).toBe(percent)
 for(let i=1;i<days;i++){
  await db.query('update public.shell_savings set started_at=clock_timestamp()-make_interval(hours=>$2) where id=$1',[account,i*24])
  await call("select public.savings_action('deposit',$1,$2) s",[crypto.randomUUID(),account])
 }
 await db.query('update public.shell_savings set started_at=clock_timestamp()-make_interval(hours=>$2) where id=$1',[account,days*24])
 const before=await wallet(),withdraw=crypto.randomUUID()
 const result=await call("select public.savings_action('withdraw',$1,$2) s",[withdraw,account])
 expect(result.receipt).toMatchObject({bonus,payout:principal+bonus,closeKind:'matured'})
 await call("select public.savings_action('withdraw',$1,$2) s",[withdraw,account])
 expect((await wallet()).gold).toBe(before.gold+principal+bonus)
})
it('does not upgrade an existing plan when equipped later, or pay interest for cancellation',async()=>{
 const opened=await call("select public.savings_action('open',$1,null,3,100) s",[crypto.randomUUID()])
 await equip('sea-king-golden-vault')
 const state=await call('select public.savings_state() s')
 expect(state.relicBonusPercent).toBe(10);expect(state.account.relicBonusPercent).toBe(0)
 expect((await call("select public.savings_action('withdraw',$1,$2) s",[crypto.randomUUID(),opened.account.id])).receipt).toMatchObject({bonus:0,payout:100})
})
it('combines the two new effects and rejects combining two relics from the same family',async()=>{
 await db.query('insert into app_private.notice_operators(user_id) values($1)',[uid])
 await db.exec('savepoint same_family')
 await expect(call('select public.craft_relic($1,$2,$3) s',['returning-bait-pouch','sea-king-endless-bait-pot',crypto.randomUUID()])).rejects.toThrow('RELIC_SAME_EFFECT')
 await db.exec('rollback to same_family;release savepoint same_family;reset role')
 const fn=(await db.query("select pg_get_functiondef('app_private.craft_relic(text,text,uuid)'::regprocedure) d")).rows[0].d
 await db.exec(fn.replaceAll('random()','0::double precision'))
 const combined=await call('select public.craft_relic($1,$2,$3) s',['sea-king-endless-bait-pot','sea-king-golden-vault',crypto.randomUUID()])
 await equip(combined.craft.craftedId)
 expect((await call('select public.savings_state() s')).relicBonusPercent).toBe(10)
 const p=await prepare()
 expect((await db.query("select bait_snapshot->>'relic_bait_refund_percent' chance from app_private.prepared_fishing_casts where user_id=$1 and operation_id=$2",[uid,p.operation_id])).rows[0].chance).toBe('5')
})
