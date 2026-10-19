// @vitest-environment node
import {beforeAll,afterAll,beforeEach,afterEach,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {fishingRods} from '@/features/fishing/fishing-rods'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const uid='00000000-0000-0000-0000-000000001219'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('begin')
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'navigator')",[uid])
 await db.query('insert into public.player_wallets(user_id,gold) values($1,10000) on conflict(user_id) do update set gold=10000',[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid])
})
afterEach(async()=>{await db.exec('rollback;reset role')})
it('matches displayed prices to checkout and increases regional rod prices in map order',async()=>{
 const rods=(await db.query('select id,price from public.fishing_rods')).rows
 for(const rod of rods)expect(fishingRods.find(item=>item.id===rod.id)?.price,rod.id).toBe(rod.price)
 const regional=(await db.query("select f.price from public.regions r join public.fishing_rods f on f.id=r.id order by r.sort_order")).rows
 for(let i=1;i<regional.length;i++)expect(regional[i].price).toBeGreaterThan(regional[i-1].price)
 await db.exec('set local role authenticated')
 const buy=(await db.query("select public.trade_fishing_rod('siren','buy',gen_random_uuid()) s")).rows[0].s
 const sell=(await db.query("select public.trade_fishing_rod('siren','sell',gen_random_uuid()) s")).rows[0].s
 expect(buy.delta).toBe(-1200)
 expect(sell.delta).toBe(600)
})
it('registers the complete requested native roster and preserves existing native habitats',async()=>{
 const rows=(await db.query("select kind,rarity,count(*)::integer n from public.collectible_species where native_region_id='siren' group by kind,rarity order by kind,rarity")).rows
 expect(rows).toEqual([
  {kind:'fish',rarity:'common',n:3},{kind:'fish',rarity:'rare',n:12},{kind:'fish',rarity:'epic',n:6},{kind:'fish',rarity:'mythic',n:2},
  {kind:'trash',rarity:'common',n:6},{kind:'trash',rarity:'rare',n:3},
  {kind:'decoration',rarity:'rare',n:3},{kind:'decoration',rarity:'epic',n:1}
 ])
 expect((await db.query("select count(*)::integer n from public.collectible_species s join public.collectible_habitats h on h.species_id=s.id and h.region_id='siren' where s.native_region_id is not null and s.native_region_id<>'siren'")).rows[0].n).toBe(0)
 expect((await db.query("select count(*)::integer n from public.collectible_species where native_region_id='siren' and kind='fish' and sprite_sheet_path is null")).rows[0].n).toBe(0)
})
it('unlocks the map with one payment and supports the regional rod without granting either for free',async()=>{
 await db.exec('set local role authenticated')
 let map=(await db.query('select public.region_map() s')).rows[0].s
 expect(map.regions.find(r=>r.id==='siren').unlocked).toBe(false)
 const op=crypto.randomUUID()
 expect((await db.query("select public.buy_region_map('siren',$1) s",[op])).rows[0].s.delta).toBe(-2200)
 expect((await db.query("select public.buy_region_map('siren',$1) s",[op])).rows[0].s.delta).toBe(0)
 map=(await db.query('select public.region_map() s')).rows[0].s
 expect(map.regions.find(r=>r.id==='siren').unlocked).toBe(true)
 expect((await db.query("select public.trade_fishing_rod('siren','buy',gen_random_uuid()) s")).rows[0].s.delta).toBe(-1200)
 await db.query("select public.equip_fishing_rod('siren')")
 await db.exec('reset role')
 expect((await db.query("select region_id,native_bonus_bp from public.fishing_rods where id='siren'")).rows[0]).toEqual({region_id:'siren',native_bonus_bp:200})
})
it('provides catch candidates at every rarity and decoration-only bait never returns fish',async()=>{
 for(const rarity of ['common','rare','epic','mythic']){
  const fish=(await db.query("select p.species_id,s.kind from app_private.pick_regional_collectible('siren',$1,false,5000) p join public.collectible_species s on s.id=p.species_id",[rarity])).rows
  expect(fish).toHaveLength(1);expect(fish[0].kind).not.toBe('map')
 }
 for(const rarity of ['common','rare','epic']){
  const decor=(await db.query("select s.kind from app_private.pick_regional_collectible('siren',$1,true,5000) p join public.collectible_species s on s.id=p.species_id",[rarity])).rows
  expect(decor).toEqual([{kind:'decoration'}])
 }
})
