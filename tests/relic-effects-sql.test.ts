// @vitest-environment node
import catalog from '../supabase/catalog/catalog.json'
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {readFileSync} from 'node:fs'
let db
let uid:string
async function user(sql:string,args:unknown[]=[]){await db.exec('set role authenticated');const r=await db.query(sql,args);await db.exec('reset role');return r.rows[0]?.s}
async function equip(id:string|null,op=crypto.randomUUID()){return user('select public.equip_relic($1,$2) s',[id,op])}
async function reject(fn:()=>Promise<unknown>,message:string){await db.exec('savepoint rejected');await expect(fn()).rejects.toThrow(message);await db.exec('rollback to rejected;reset role')}
async function gold(){return (await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('begin');uid=crypto.randomUUID();await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'유물검증')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid])
 await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,1000000,'{\"fuel\":10000,\"bait\":10000}') on conflict(user_id) do update set gold=1000000,inventory=excluded.inventory",[uid])
 await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang') on conflict(user_id) do update set region_id='pongdang'",[uid])
 await db.query('insert into app_private.player_fishing_relics(user_id,relic_id) select $1,id from public.fishing_relics',[uid])
})
afterEach(async()=>{await db.exec('rollback;reset role')})
it('registers catalog relics and equips for free and charges only removal once, including replacement',async()=>{
 expect((await user('select public.relic_state() s')).relics).toHaveLength(catalog.fishing_relics.length)
 const op=crypto.randomUUID();await equip('shell-hourglass',op);expect(await gold()).toBe(1000000)
 await equip('shell-hourglass',op);expect(await gold()).toBe(1000000)
 await reject(()=>equip('eternal-water-clock',op),'OPERATION_CONFLICT')
 expect((await equip('eternal-water-clock')).equippedId).toBe('eternal-water-clock');expect(await gold()).toBe(999500)
 await reject(()=>equip('eternal-water-clock'),'RELIC_ALREADY_EQUIPPED')
 expect((await equip(null)).equippedId).toBeNull();expect(await gold()).toBe(999000)
})
it('denies unowned relics, direct edits, anonymous actions and unaffordable fees atomically',async()=>{
 await db.query("delete from app_private.player_fishing_relics where user_id=$1 and relic_id='shell-hourglass'",[uid])
 await reject(()=>equip('shell-hourglass'),'RELIC_NOT_OWNED')
 await reject(()=>user('select * from app_private.player_relic_loadouts'),'permission denied')
 await db.query('update public.player_wallets set gold=0 where user_id=$1',[uid]);await equip('primordial-ember');await reject(()=>equip(null),'INSUFFICIENT_GOLD')
 expect((await user('select public.relic_state() s')).equippedId).toBe('primordial-ember');expect(await gold()).toBe(0)
 await db.exec('savepoint anonymous;set role anon');await expect(db.query('select public.equip_relic(null,gen_random_uuid())')).rejects.toThrow('permission denied');await db.exec('rollback to anonymous;reset role')
})
it('applies only the selected production bonus and increases the personal workshop by hours',async()=>{
 await equip('undying-furnace-heart');expect((await user('select public.production_state() s')).activeLimit).toBe(5);expect((await user('select public.bait_production_state() s')).activeLimit).toBe(4)
 await equip('primordial-ember');expect((await user('select public.production_state() s')).activeLimit).toBe(6)
 await equip('abundant-conch');expect((await user('select public.production_state() s')).activeLimit).toBe(4);expect((await user('select public.bait_production_state() s')).activeLimit).toBe(5)
 await equip('ocean-seed');expect((await user('select public.bait_production_state() s')).activeLimit).toBe(6)
 for(const [id,hours] of [['shell-hourglass',2],['still-wave-clock',4],['eternal-water-clock',8]] as const){await equip(id);expect((await user('select public.personal_bait_workshop_state() s')).limits.maxMinutes).toBe(720+hours*60)}
 await user("select public.personal_bait_workshop_action('start',$1,'bait',1,1200,null,1) s",[crypto.randomUUID()])
 await equip(null);const s=await user('select public.personal_bait_workshop_state() s');expect(s.limits.maxMinutes).toBe(720);expect(s.job.minutes).toBe(1200)
})
it('keeps fractional trap reductions and the saved departure duration after unequipping',async()=>{
 for(const [id,minutes] of [['fish-calling-bell',14.5],['tide-bell',13.5],['sea-king-summoning-bell',12]] as const){await equip(id);expect((await user('select public.expedition_state() s')).minutesPerBait).toBe(minutes)}
 await equip('fish-calling-bell')
 await user("select public.expedition_action('depart',$1,'dinghy','pongdang','{\"bait\":2}') s",[crypto.randomUUID()])
 const before=(await db.query('select extract(epoch from returns_at-departed_at)::float seconds from public.fishing_expeditions where user_id=$1',[uid])).rows[0].seconds
 expect(before).toBe(1740);await equip(null)
 expect((await db.query('select extract(epoch from returns_at-departed_at)::float seconds from public.fishing_expeditions where user_id=$1',[uid])).rows[0].seconds).toBe(before)
})
it('discounts the boat purchase and bases resale on actual payment after loadout changes',async()=>{
 const vessel=(await db.query('select id,price from public.harbor_vessels where price>=1000 order by price limit 1')).rows[0]
 await equip('sea-king-shipwright-edict')
 expect((await user('select public.harbor_state() s')).vessels.find(v=>v.id===vessel.id).price).toBe(vessel.price-400)
 const purchase=await user("select public.harbor_action('buy',$1,$2) s",[crypto.randomUUID(),vessel.id])
 const boat=purchase.boats.find(b=>b.vessel_id===vessel.id)
 await equip(null)
 const sale=await user("select public.harbor_action('sell',$1,null,null,1,$2) s",[crypto.randomUUID(),boat.id])
 expect(sale.receipt.gold).toBe(Math.floor((vessel.price-400)/2))
})
it('subtracts half a second from new fishing waits without changing pending casts',async()=>{
 const prepare=async()=>user("select public.prepare_fishing('pongdang','bait',$1,false) s",[crypto.randomUUID()])
 await db.query('select setseed(0.25)');const base=await prepare()
 await equip('silver-osprey-feather')
 expect((await prepare()).wait_seconds).toBe(base.wait_seconds)
 await db.query("update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result='{}' where user_id=$1",[uid])
 await db.query('select setseed(0.25)');const boosted=await prepare()
 expect(Number(base.wait_seconds)-Number(boosted.wait_seconds)).toBeCloseTo(0.5,5)
 const stored=await db.query('select wait_seconds from app_private.prepared_fishing_casts where user_id=$1 order by created_at,operation_id',[uid])
 await equip(null);expect((await db.query('select wait_seconds from app_private.prepared_fishing_casts where user_id=$1 order by created_at,operation_id',[uid])).rows).toEqual(stored.rows)
})

it('blocks removing the extra fuel slot until active production returns to the base limit',async()=>{
 const working=await db.query("insert into app_private.production_sites(user_id,facility_id,started_at,completes_at,expires_at,run_output) select $1,'clockwork-compressor',now(),now()+interval '1 hour',now()+interval '2 hours',1 from generate_series(1,4) returning id",[uid])
 const idle=(await db.query("insert into app_private.production_sites(user_id,facility_id) select $1,'clockwork-compressor' from generate_series(1,2) returning id",[uid])).rows
 await db.query("insert into public.player_collectibles(user_id,species_id) select $1,'shared-drift-scrap-wood' from generate_series(1,4)",[uid])
 const start=(id:string)=>user("select public.production_action('start',$1,$2,'{\"shared-drift-scrap-wood\":2}') s",[crypto.randomUUID(),id])
 await reject(()=>start(idle[0].id),'PRODUCTION_ACTIVE_LIMIT')
 await equip('undying-furnace-heart');await start(idle[0].id)
 await reject(()=>start(idle[1].id),'PRODUCTION_ACTIVE_LIMIT');const balance=await gold()
 await reject(()=>equip(null),'RELIC_FUEL_PRODUCTION_ACTIVE:4');expect(await gold()).toBe(balance)
 expect((await user('select public.production_state() s')).activeTotal).toBe(5)
 await db.query("update app_private.production_sites set started_at=clock_timestamp()-interval '1 hour',completes_at=clock_timestamp()-interval '1 second' where id=$1",[working.rows[0].id])
 await equip(null);expect((await user('select public.production_state() s')).activeTotal).toBe(4)
 await reject(()=>start(idle[1].id),'PRODUCTION_ACTIVE_LIMIT')
 expect(working.rows).toHaveLength(4)
})

it('rejects a stale fee quote without changing equipment or gold',async()=>{
 await equip('shell-hourglass');const balance=await gold()
 await reject(()=>user('select public.equip_relic($1,$2,1000) s',['eternal-water-clock',crypto.randomUUID()]),'RELIC_LOADOUT_CHANGED')
 expect(await gold()).toBe(balance);expect((await user('select public.relic_state() s')).equippedId).toBe('shell-hourglass')
})

it('applies every real relic to authenticated actions and removes bonuses on unequip',async()=>{
 await db.exec(readFileSync('tests/fixtures/relic-bonus-smoke.sql','utf8'))
})

it('keeps free equips idempotent and charges only one removal fee during replacement',async()=>{
 await db.exec(readFileSync('tests/fixtures/relic-equipment-fee-smoke.sql','utf8'))
})

it('protects fuel and bait production capacity on removal, downgrades and unrelated replacements',async()=>{
 await db.exec(readFileSync('tests/fixtures/relic-production-lock-smoke.sql','utf8'))
})
