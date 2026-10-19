// @vitest-environment node
import {beforeAll,afterAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})

it('uses bait tables in every region with the exact basic distribution',async()=>{
 const rows=(await db.query("select app_private.regional_bait_odds(b.id,r.id) as odds,b.id from public.fishing_baits b cross join public.regions r")).rows
 for(const row of rows.filter(r=>['bait','bait_safe'].includes(r.id)))expect(row.odds).toEqual({common_bp:7700,rare_bp:2000,epic_bp:270,mythic_bp:30,failure_bp:0})
 for(const id of ['bait_special','bait_epic'])expect(new Set(rows.filter(r=>r.id===id).map(r=>JSON.stringify(r.odds))).size).toBe(1)
 const distribution=(await db.query("select app_private.resolve_regional_fishing('bait','pongdang',i) as rarity,count(*)::int as n from generate_series(0,9999)i group by rarity order by rarity")).rows
 expect(distribution).toEqual([{rarity:'common',n:7700},{rarity:'rare',n:2000},{rarity:'epic',n:270},{rarity:'mythic',n:30}])
})

it('weights primary, other and shared species and draws globally without maps',async()=>{
 const weights=(await db.query("select app_private.collectible_habitat_weight('coral','coral')::float8 as home,app_private.collectible_habitat_weight('coral','pongdang')::float8 as away,app_private.collectible_habitat_weight(null,'pongdang')::float8 as shared")).rows[0]
 expect(weights).toEqual({home:2,away:.05,shared:1})
 await db.exec('select setseed(0.42)')
 const samples=(await db.query("select s.id,s.kind,s.rarity,s.native_region_id from generate_series(1,2000)i cross join lateral app_private.pick_regional_collectible('pongdang','rare',false,i%10000) q join public.collectible_species s on s.id=q.species_id")).rows
 expect(samples.every(s=>['fish','trash'].includes(s.kind)&&s.rarity==='rare')).toBe(true)
 expect(samples.some(s=>s.native_region_id==='dreamabyss')).toBe(true)
 const home=samples.filter(s=>s.native_region_id==='pongdang').length/samples.length
 expect(Math.abs(home-.6)).toBeLessThan(.045)
 const decorations=(await db.query("select s.kind,s.native_region_id from generate_series(1,500)i cross join lateral app_private.pick_regional_collectible('pongdang','common',true,i)q join public.collectible_species s on s.id=q.species_id")).rows
 expect(decorations.every(s=>s.kind==='decoration')).toBe(true)
 expect(decorations.some(s=>s.native_region_id==='dreamabyss')).toBe(true)
},60000)

it('exposes every sea as availability while preserving primary habitat metadata and auth',async()=>{
 await expect(db.query('select app_private.collection_state()')).rejects.toThrow('AUTH_REQUIRED')
 const uid='00000000-0000-0000-0000-000000000979'
 await db.query('insert into auth.users(id)values($1)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 const state=(await db.query('select app_private.collection_state() as state')).rows[0].state
 const regions=(await db.query('select count(*)::int as n from public.regions')).rows[0].n
 expect(state.catalog.every(s=>s.kind!=='map'&&s.habitats.length===regions)).toBe(true)
 expect(state.catalog.find(s=>s.id==='violet-telescopefish').native_region_id).toBe('dreamabyss')
})
