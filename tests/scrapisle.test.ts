// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import {createLocalDatabase,replayMigrations,readCatalog,canonical} from '../scripts/db/local.mjs'
import {fishingEnvironment} from '../src/features/fishing/fishing-environment'
import {fishingBannerPath} from '../src/features/regions/fishing-banner'
import {fishingRods} from '../src/features/fishing/fishing-rods'
import {scrapisleFixedFrame} from '../src/features/aquarium/scrapisle-animation'
import {mythicSwimAsset,mythicSwimFrame} from '../src/features/aquarium/mythic-swim'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('buys the map, unlocks travel and supplies the matching rod',async()=>{
 const uid='00000000-0000-0000-0000-000000093723'
 await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('insert into public.player_wallets(user_id,gold) values($1,5000)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated')
 const shop=(await db.query('select public.map_shop_state() r')).rows[0].r
 expect(shop.items.find((m:{region_id:string})=>m.region_id==='scrapisle')).toMatchObject({price:1800,owned:false})
 await db.query("select public.buy_region_map('scrapisle',gen_random_uuid())")
 expect((await db.query("select public.travel_region('scrapisle') r")).rows[0].r.currentRegion).toBe('scrapisle')
 await db.exec('reset role')
 expect((await db.query("select * from public.fishing_rods where id='scrapisle'")).rows[0]).toMatchObject({price:1500,native_bonus_bp:200,failure_reduction_bp:200})
})
it('preserves catalog parity and classifies26 exclusive finds as5 trash,14 decorations and7 creatures',async()=>{
 const rows=(await db.query("select * from public.collectible_species where native_region_id='scrapisle'")).rows
 expect(rows).toHaveLength(26)
 for(const [kind,n] of [['trash',5],['decoration',14],['fish',7]])expect(rows.filter(s=>s.kind===kind)).toHaveLength(n as number)
 expect((await db.query("select * from public.collectible_habitats where region_id='scrapisle'")).rows).toHaveLength(26)
 expect(canonical(await readCatalog(db))).toBe(canonical(JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))))
})
it('backs every tier, keeps common all objects, and other regions keep their fish-only ordinary catches',async()=>{
 for(const rarity of ['common','rare','epic','mythic']){
  const result=(await db.query("select s.* from app_private.pick_regional_collectible('scrapisle',$1,false,0) p join public.collectible_species s on s.id=p.species_id",[rarity])).rows
  expect(result).toHaveLength(1);expect(result[0].rarity).toBe(rarity);expect(result[0].native_region_id).toBe('scrapisle')
  if(rarity==='common')expect(['trash','decoration']).toContain(result[0].kind)
  if(rarity==='mythic')expect(result[0].id).toBe('scrap-greenark-last-collector')
 }
 expect((await db.query("select s.kind from app_private.pick_regional_collectible('cloudferry','epic',false,0) p join public.collectible_species s on s.id=p.species_id")).rows[0].kind).toBe('fish')
 expect((await db.query("select s.kind from app_private.pick_regional_collectible('scrapisle','mythic',true,0) p join public.collectible_species s on s.id=p.species_id")).rows[0].kind).toBe('decoration')
})
it('supplies matching scene and equipment paths',()=>{
 expect(fishingEnvironment('scrapisle')).toMatchObject({id:'scrapisle',deckStart:1065})
 expect(fishingBannerPath('scrapisle')).toBe('/banners/scrapisle-horizon.png')
 expect(fishingRods.find(r=>r.id==='scrapisle')?.name).toBe('녹빛 고철 낚싯대')
 for(const f of ['public/banners/scrapisle-horizon.png','public/fishing/environments/scrapisle.png','public/region-icons/scrapisle.png'])expect(existsSync(f)).toBe(true)
})
it('strongly favors objects inside rare catches without removing the creature pool',async()=>{
 const rows=(await db.query("select s.kind from generate_series(1,1000) g(i) cross join lateral app_private.pick_regional_collectible('scrapisle','rare',false,g.i) p join public.collectible_species s on s.id=p.species_id")).rows
 const objects=rows.filter(r=>r.kind!=='fish').length
 expect(objects).toBeGreaterThan(680);expect(objects).toBeLessThan(920)
})
it('can rerun the scoped migration while preserving wallet and map ownership',async()=>{
 const uid='00000000-0000-0000-0000-000000093723'
 const before=(await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows
 await db.exec(readFileSync('supabase/migrations/20261017093723_scrap_isle_region_and_species.sql','utf8'))
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows).toEqual(before)
 expect((await db.query("select region_id from public.player_map_fragments where user_id=$1 and region_id='scrapisle'",[uid])).rows).toHaveLength(1)
})
it('plays anchored fixed poses and the Greenark action while respecting reduced motion',()=>{
 expect(scrapisleFixedFrame('scrap-tire-moray',.5)).toBe(1)
 expect(scrapisleFixedFrame('scrap-tire-moray',.5,true)).toBe(0)
 expect(scrapisleFixedFrame('scrap-bulb-home-octopus',.5,false,true)).toBe(0)
 const a=mythicSwimAsset('fish/mythic/scrap-greenark-last-collector_sprite.png','mythic')
 expect(a?.url).toBe('/aquarium/swim/scrap-greenark-last-collector_swim8_sprite.png')
 expect(mythicSwimFrame(a!.path,4,0)).toBeGreaterThanOrEqual(4)
 expect(mythicSwimFrame(a!.path,6,0)).toBe(0)
 expect(mythicSwimFrame(a!.path,4,0,true)).toBe(0)
})
