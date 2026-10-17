// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {readFileSync,existsSync} from 'node:fs'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {fishingBannerPath} from '../src/features/regions/fishing-banner'
import {fishingEnvironment} from '../src/features/fishing/fishing-environment'
import {fishingRods} from '../src/features/fishing/fishing-rods'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
it('offers a purchasable route and rod and permits travel after purchase',async()=>{
 const uid='00000000-0000-0000-0000-000000060959'
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query('insert into public.player_wallets(user_id,gold) values($1,5000)',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec('set role authenticated')
 const shop=(await db.query('select public.map_shop_state() as r')).rows[0].r
 expect(shop.items[3]).toMatchObject({region_id:'whitenight',price:3500,owned:false})
 await db.query("select public.buy_region_map('whitenight',gen_random_uuid())")
 expect((await db.query("select public.travel_region('whitenight') as r")).rows[0].r.currentRegion).toBe('whitenight')
 await db.exec('reset role')
 const rod=(await db.query("select * from public.fishing_rods where id='whitenight'")).rows[0]
 expect(rod).toMatchObject({name:'백야 서리 낚싯대',price:1500,failure_reduction_bp:200,native_bonus_bp:200})
})
it('keeps every successful roll backed by a habitat after the mythics are added',async()=>{
 const baits=(await db.query("select id from public.fishing_baits where effect_kind<>'decoration'")).rows
 for(const b of baits){
  const odds=(await db.query("select app_private.regional_bait_odds($1,'whitenight') as r",[b.id])).rows[0].r
  expect(odds.mythic_bp).toBeGreaterThan(0)
  expect(Object.values(odds).reduce((a:number,b)=>a+Number(b),0)).toBe(10000)
  for(const rarity of ['common','rare','epic','mythic'])if(odds[rarity+'_bp']>0){
   const pick=await db.query("select * from app_private.pick_regional_collectible('whitenight',$1,false,0)",[rarity])
   expect(pick.rows).toHaveLength(1)
  }
 }
 const elsewhere=(await db.query("select app_private.regional_bait_odds('bait','pongdang') as r")).rows[0].r
 expect(elsewhere.mythic_bp).toBeGreaterThan(0)
 const native=(await db.query("select count(*)::int as n from public.collectible_habitats h join public.collectible_species s on s.id=h.species_id where h.region_id='whitenight' and s.native_region_id is not null")).rows[0].n
 expect(native).toBe(32)
})
it('reruns the existing-shop update without duplicate tables or sort collisions',async()=>{
 const sql=readFileSync('artifacts/map-shop-install.sql','utf8')
 const before=(await db.query('select * from public.player_wallets order by user_id')).rows
 await db.exec(sql)
 await db.exec(sql)
 expect((await db.query('select * from public.player_wallets order by user_id')).rows).toEqual(before)
 expect((await db.query('select id from public.regions order by sort_order')).rows.map((r:{id:string})=>r.id)).toEqual(['pongdang','coral','bluegrove','mistmoon','whitenight','starruins','primal','dreamabyss','cloudferry'])
})
it('ships the matching scene, icon, rod thumbnail and icy fishing platform',()=>{
 expect(fishingBannerPath('whitenight')).toBe('/banners/whitenight-horizon.png')
 expect(fishingEnvironment('whitenight').id).toBe('whitenight')
 expect(fishingRods.find(r=>r.id==='whitenight')?.region).toBe('whitenight')
 for(const file of ['public/banners/whitenight-horizon.png','public/fishing/environments/whitenight.png','assets/storage-upload/new/white-night/map/routes/map-whitenight_thumbnail.png','assets/storage-upload/new/white-night/equipment/rods/whitenight/thumbnail.png']){
  expect(existsSync(file)).toBe(true)
  expect(readFileSync(file).readUInt32BE(16)).toBeGreaterThanOrEqual(1024)
 }
})
it('respects target-native metadata even when the local catalog lists a shared species',async()=>{
 await db.exec(`begin;set constraints all deferred;
 delete from public.collectible_habitats where species_id='pongi-statue' and region_id<>'pongdang';
 update public.collectible_species set native_region_id='pongdang' where id='pongi-statue';
 commit;`)
 await db.exec(readFileSync('artifacts/map-shop-install.sql','utf8'))
 expect((await db.query("select region_id from public.collectible_habitats where species_id='pongi-statue'")).rows).toEqual([{region_id:'pongdang'}])
 expect((await db.query("select native_region_id from public.collectible_species where id='pongi-statue'")).rows[0].native_region_id).toBe('pongdang')
})
