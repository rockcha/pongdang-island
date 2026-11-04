// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const uid=crypto.randomUUID()
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'은하검수')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
},180000)
afterAll(async()=>{await db?.close()})
it('requires three rare and three epic discoveries, unlocking only on the sixth distinct piece',async()=>{
 for(const [rarity,numbers] of [['common',[]],['rare',[1,2,3]],['epic',[4,5,6]]] as const){
  expect((await db.query("select piece_number from app_private.fishing_discovery_candidates($1) where region_id='galaxy' order by piece_number",[rarity])).rows.map(r=>r.piece_number)).toEqual(numbers)
 }
 for(let piece=1;piece<=6;piece++){
  const rarity=piece<=3?'rare':'epic',op=crypto.randomUUID()
  await db.query(`insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,map_region_id,map_piece_number,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot)
   values($1,$2,'pongdang','bait',true,'galaxy',$3,$4,app_private.fishing_map_piece_payload('galaxy',$3,$1),12,4.5,'bait',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour','{"target_kinds":["fish"],"effect_kind":"standard"}')`,[uid,op,piece,rarity])
  const result=(await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r
  expect(result.attempt.species).toMatchObject({rarity,pieceNumber:piece})
  expect((await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r.replayed).toBe(true)
  const map=(await db.query('select public.region_map() r')).rows[0].r.regions.find(r=>r.id==='galaxy')
  expect(map).toMatchObject({mapPieceCount:6,mapPieceRarities:['rare','rare','rare','epic','epic','epic'],unlocked:piece===6})
 }
 for(const rarity of ['common','rare','epic'])expect((await db.query("select piece_number from app_private.fishing_discovery_candidates($1) where region_id='galaxy'",[rarity])).rows).toHaveLength(0)
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toHaveLength(0)
})
it('makes the complete native roster available with the requested kind and rarity averages',async()=>{
 const rows=(await db.query("select kind,rarity,count(*)::int n,avg(sell_price)::int average from public.collectible_species where native_region_id='galaxy' group by kind,rarity")).rows
 expect(rows).toHaveLength(9)
 for(const [kind,rarity,n,average] of [['fish','common',15,60],['fish','rare',12,260],['fish','epic',8,1450],['fish','mythic',7,3300],['trash','common',19,25],['trash','rare',19,80],['decoration','common',14,40],['decoration','rare',16,155],['decoration','epic',2,900]])expect(rows).toContainEqual({kind,rarity,n,average})
 expect((await db.query("select count(*)::int n from public.collectible_habitats h join public.collectible_species s on s.id=h.species_id where h.region_id='galaxy' and s.native_region_id='galaxy'")).rows[0].n).toBe(112)
 expect((await db.query("select count(*)::int n from public.collectible_habitats where region_id='galaxy' and species_id like 'shared-decor-%'")).rows[0].n).toBe(31)
 expect((await db.query("select count(*)::int n from public.aquarium_backgrounds where id like 'galaxy-%' and tier='special' and price>=3500")).rows[0].n).toBe(3)
})
it('charges each special theme price once and permits equipping the purchased theme',async()=>{
 await db.query('insert into public.player_wallets(user_id,gold) values($1,20000) on conflict(user_id) do update set gold=20000',[uid])
 const tank=(await db.query('select public.aquarium_state() r')).rows[0].r.tanks[0].id
 for(const [id,price] of [['galaxy-space-station',3500],['galaxy-lunar-base',3800],['galaxy-observation-palace',4200]] as const){
  const op=crypto.randomUUID()
  const bought=(await db.query("select public.aquarium_background($1,'buy',$2) r",[id,op])).rows[0].r
  expect(bought.delta).toBe(-price)
  const before=(await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold
  await db.query("select public.aquarium_background($1,'buy',$2)",[id,op])
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(before)
  await db.query("select public.manage_aquarium_tank($1,'equip',$2)",[tank,id])
  expect((await db.query('select background_id from public.aquarium_tanks where id=$1',[tank])).rows[0].background_id).toBe(id)
 }
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(8500)
})
