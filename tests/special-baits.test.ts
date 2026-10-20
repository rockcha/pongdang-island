// @vitest-environment node
import {afterAll,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
const uid='00000000-0000-0000-0000-000000000555'
const newBaits=['bait_forbidden_star','bait_grubby_magnet','bait_sea_memory','bait_first_greeting']
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec("select app_private.get_gold_wallet();insert into public.player_navigation(user_id,region_id) values(auth.uid(),'pongdang')")
},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec("truncate app_private.prepared_fishing_casts;truncate public.fishing_attempts;truncate public.player_discoveries;truncate public.gold_transactions;update public.player_wallets set gold=10000,inventory='{}'")
 await db.query('update public.player_wallets set inventory=$1 where user_id=$2',[JSON.stringify(Object.fromEntries(newBaits.map(id=>[id,100]))),uid])
})
it('sells exactly the three requested baits and keeps first greeting reward-only',async()=>{
 const rows=(await db.query('select id,price from public.fishing_baits where id=any($1) order by id',[newBaits])).rows
 expect(rows).toEqual([{id:'bait_first_greeting',price:null},{id:'bait_forbidden_star',price:80},{id:'bait_grubby_magnet',price:40},{id:'bait_sea_memory',price:60}])
 const operation=crypto.randomUUID()
 await db.query("select public.buy_fishing_bait('bait_grubby_magnet',$1)",[operation])
 await db.query("select public.buy_fishing_bait('bait_grubby_magnet',$1)",[operation])
 expect((await db.query('select gold,inventory from public.player_wallets where user_id=$1',[uid])).rows[0]).toMatchObject({gold:9960,inventory:{bait_grubby_magnet:101}})
 await expect(db.query("select public.buy_fishing_bait('bait_first_greeting',$1)",[crypto.randomUUID()])).rejects.toThrow(/BAIT_NOT_FOR_SALE/)
})
it('sells safe bait and temporarily pauses decoration bait sales',async()=>{
 for(const [id,price] of [['bait_safe',65]] as const){
  const op=crypto.randomUUID()
  await db.query('select public.buy_fishing_bait($1,$2)',[id,op])
  await db.query('select public.buy_fishing_bait($1,$2)',[id,op])
  expect((await db.query('select delta from public.gold_transactions where operation_id=$1',[op])).rows).toEqual([{delta:-price}])
 }
 const rows=(await db.query('select price from public.fishing_baits order by sort_order')).rows
 expect(rows.map(row=>row.price)).toEqual([30,65,40,60,80,null,null,null,null])
 await expect(db.query("select public.buy_fishing_bait('bait_magnet',$1)",[crypto.randomUUID()])).rejects.toThrow(/BAIT_NOT_FOR_SALE/)
})
it('rejects paused lodestone purchases without changing gold, existing inventory or receipts',async()=>{
 await db.query("update public.player_wallets set inventory=jsonb_set(inventory,'{bait_magnet}','3') where user_id=$1",[uid])
 const before=(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[uid])).rows
 await expect(db.query("select public.buy_fishing_bait('bait_magnet',$1)",[crypto.randomUUID()])).rejects.toThrow(/BAIT_NOT_FOR_SALE/)
 expect((await db.query('select gold,inventory from public.player_wallets where user_id=$1',[uid])).rows).toEqual(before)
 expect((await db.query('select * from public.gold_transactions where user_id=$1',[uid])).rows).toHaveLength(0)
})
it('boosts star candy rarity and eligibility without changing waiting time or gauge difficulty',async()=>{
 const baits=(await db.query('select id,common_bp,rare_bp,epic_bp,mythic_bp,app_private.fishing_success_chance_bp(id) chance from public.fishing_baits where id=any($1)',[newBaits])).rows
 for(const b of baits)expect(b.chance).toBe(b.id==='bait_sea_memory'?4000:7000)
 const candy=baits.find(b=>b.id==='bait_forbidden_star')
 expect(candy.epic_bp).toBeGreaterThan(270);expect(candy.mythic_bp).toBeGreaterThan(30)
 expect(candy.common_bp+candy.rare_bp+candy.epic_bp+candy.mythic_bp).toBe(10000)
 const p=(await db.query("select public.prepare_fishing('pongdang','bait_forbidden_star',$1) p",[crypto.randomUUID()])).rows[0].p
 expect(p.wait_seconds).toBeGreaterThanOrEqual(3);expect(p.wait_seconds).toBeLessThanOrEqual(5)
})
it('selects only trash for every rarity roll, including missing trash rarities',async()=>{
 const rows=(await db.query("with draws as materialized(select app_private.pick_special_bait_collectible('pongdang',r,'bait_grubby_magnet') id from unnest(enum_range(null::public.game_rarity)) r cross join generate_series(1,50)) select s.kind,count(*)::int n from draws d join public.collectible_species s on s.id=d.id group by s.kind")).rows
 expect(rows).toEqual([{kind:'trash',n:200}])
})
it('targets only undiscovered non-map species, falls back across rarities, and preserves exhausted bait',async()=>{
 const target=(await db.query("select id from public.collectible_species where kind='fish' and rarity='mythic' order by id limit 1")).rows[0].id
 await db.query('insert into public.player_discoveries(user_id,species_id) select $1,id from public.collectible_species where id<>$2',[uid,target])
 const rows=(await db.query("select app_private.pick_special_bait_collectible('pongdang',r,'bait_first_greeting') id from unnest(enum_range(null::public.game_rarity)) r")).rows
 expect(rows).toHaveLength(4);expect(rows.every(r=>r.id===target)).toBe(true)
 await db.query('insert into public.player_discoveries(user_id,species_id) values($1,$2)',[uid,target])
 await expect(db.query("select public.prepare_fishing('pongdang','bait_first_greeting',$1)",[crypto.randomUUID()])).rejects.toThrow(/ALL_COLLECTIBLES_DISCOVERED/)
 expect((await db.query("select (inventory->>'bait_first_greeting')::int n from public.player_wallets where user_id=$1",[uid])).rows[0].n).toBe(100)
 expect((await db.query('select * from app_private.prepared_fishing_casts')).rows).toHaveLength(0)
})
it('increases current-region native weighting without changing the rarity pool',async()=>{
 const baseline=(await db.query("with draws as materialized(select (app_private.pick_regional_collectible('pongdang','rare',false,0)).species_id id from generate_series(1,2500)) select count(*) filter(where s.is_native and s.native_region_id='pongdang')::int home from draws d join public.collectible_species s on s.id=d.id")).rows[0]
 const boosted=(await db.query("with draws as materialized(select app_private.pick_special_bait_collectible('pongdang','rare','bait_sea_memory') id from generate_series(1,2500)) select count(*) filter(where s.is_native and s.native_region_id='pongdang')::int home,count(*) filter(where s.rarity<>'rare')::int wrong from draws d join public.collectible_species s on s.id=d.id")).rows[0]
 expect(boosted.wrong).toBe(0);expect(boosted.home).toBeGreaterThan(baseline.home)
 expect(Math.abs(baseline.home/2500-.6)).toBeLessThan(.04)
 expect(Math.abs(boosted.home/2500-180/220)).toBeLessThan(.04)
})
it('preserves server reservations and prevents duplicate consumption on retry',async()=>{
 const id=crypto.randomUUID(),args=['pongdang','bait_grubby_magnet',id]
 const first=(await db.query('select public.prepare_fishing($1,$2,$3) p',args)).rows[0].p
 const again=(await db.query('select public.prepare_fishing($1,$2,$3) p',args)).rows[0].p
 expect(again).toEqual(first)
 expect((await db.query("select (inventory->>'bait_grubby_magnet')::int n from public.player_wallets where user_id=$1",[uid])).rows[0].n).toBe(99)
 for(const signature of ['app_private.pick_special_bait_collectible(text,public.game_rarity,text)','app_private.grant_special_bait_reward(uuid,integer)'])expect((await db.query("select has_function_privilege('authenticated',$1,'execute') allowed",[signature])).rows[0].allowed).toBe(false)
})
