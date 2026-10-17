// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import {createLocalDatabase,replayMigrations,readCatalog,canonical} from '../scripts/db/local.mjs'
import {fishingEnvironment} from '../src/features/fishing/fishing-environment'
import {fishingBannerPath} from '../src/features/regions/fishing-banner'
import {fishingRods} from '../src/features/fishing/fishing-rods'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('sells the map, unlocks travel and registers the matching rod',async()=>{
 const uid='00000000-0000-0000-0000-000000082326'
 await db.query('insert into auth.users(id) values($1)',[uid]);await db.query('insert into public.player_wallets(user_id,gold) values($1,5000)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated')
 const shop=(await db.query('select public.map_shop_state() r')).rows[0].r
 expect(shop.items.find((m:{region_id:string})=>m.region_id==='cloudferry')).toMatchObject({name:'지브리의 구름나루 지도',price:2500,owned:false})
 await db.query("select public.buy_region_map('cloudferry',gen_random_uuid())")
 expect((await db.query("select public.travel_region('cloudferry') r")).rows[0].r.currentRegion).toBe('cloudferry')
 await db.exec('reset role')
 expect((await db.query("select * from public.fishing_rods where id='cloudferry'")).rows[0]).toMatchObject({price:1500,failure_reduction_bp:200,native_bonus_bp:200})
})
it('backs every nonzero outcome with inhabitants and does not import another region native',async()=>{
 const baits=(await db.query("select id from public.fishing_baits where effect_kind<>'decoration'")).rows
 for(const b of baits){
  const odds=(await db.query("select app_private.regional_bait_odds($1,'cloudferry') r",[b.id])).rows[0].r
  expect(odds.mythic_bp).toBeGreaterThan(0);expect(Object.values(odds).reduce((sum:number,n)=>sum+Number(n),0)).toBe(10000)
  for(const rarity of ['common','rare','epic','mythic'])if(odds[rarity+'_bp']>0)expect((await db.query("select * from app_private.pick_regional_collectible('cloudferry',$1,false,0)",[rarity])).rows).toHaveLength(1)
 }
 expect((await db.query("select s.id from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id where h.region_id='cloudferry' and s.native_region_id is not null and s.native_region_id<>'cloudferry'")).rows).toEqual([])
 expect((await db.query("select * from app_private.pick_regional_collectible('cloudferry','common',true,0)")).rows).toHaveLength(1)
 expect(canonical(await readCatalog(db))).toBe(canonical(JSON.parse(readFileSync('supabase/catalog/catalog.json','utf8'))))
})
it('ships matching backgrounds and thumbnails and uses the requested fishing theme',()=>{
 expect(fishingEnvironment('cloudferry')).toMatchObject({id:'cloudferry',deckStart:1065})
 expect(fishingBannerPath('cloudferry')).toBe('/banners/cloudferry-horizon.png')
 expect(fishingRods.find(r=>r.id==='cloudferry')?.name).toBe('구름나루 바람 낚싯대')
 for(const file of ['public/banners/cloudferry-horizon.png','public/fishing/environments/cloudferry.png','public/region-icons/cloudferry.png','assets/storage-upload/new/cloudferry/map/routes/map-cloudferry_thumbnail.png','assets/storage-upload/new/cloudferry/equipment/rods/cloudferry/thumbnail.png'])expect(existsSync(file)).toBe(true)
})
