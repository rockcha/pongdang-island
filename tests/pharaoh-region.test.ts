// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const uid=crypto.randomUUID()
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);await db.query('insert into auth.users(id) values($1)',[uid]);await db.query("insert into public.player_profiles(id,nickname) values($1,'황금해테스터')",[uid]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])},180000)
afterAll(async()=>{await db?.close()})
it('keeps exact group averages, all habitats and explicit movement',async()=>{
 const rows=(await db.query("select kind::text kind,rarity::text rarity,count(*)::int n,avg(sell_price)::float average from public.collectible_species where native_region_id='pharaoh' group by kind,rarity")).rows
 for(const [kind,rarity,n,average] of [['fish','common',13,55],['fish','rare',6,280],['fish','epic',7,1200],['fish','mythic',4,3400],['trash','common',9,15],['trash','rare',5,90],['decoration','common',6,40],['decoration','rare',7,190],['decoration','epic',2,800]])expect(rows).toContainEqual({kind,rarity,n,average})
 expect((await db.query("select count(*)::int n from public.collectible_habitats where region_id='pharaoh'")).rows[0].n).toBe(59)
 expect((await db.query("select movement_type,swim_y_min from public.collectible_species where id='pharaoh-brick-hermit'")).rows[0]).toMatchObject({movement_type:'crawl',swim_y_min:'0.86'})
})
it('offers two rare and two epic pieces with matching payloads; collected pieces disappear',async()=>{
 for(const [rarity,numbers] of [['rare',[1,2]],['epic',[3,4]]] as const){
  const rows=(await db.query("select piece_number from app_private.fishing_discovery_candidates($1) where region_id='pharaoh' order by piece_number",[rarity])).rows
  expect(rows.map(r=>r.piece_number)).toEqual(numbers)
  for(const n of numbers)expect((await db.query("select app_private.fishing_map_piece_payload('pharaoh',$1,$2) p",[n,uid])).rows[0].p.rarity).toBe(rarity)
 }
 await db.query("insert into app_private.player_fishing_map_pieces(user_id,region_id,piece_number) values($1,'pharaoh',1)",[uid])
 expect((await db.query("select piece_number from app_private.fishing_discovery_candidates('rare') where region_id='pharaoh'")).rows.map(r=>r.piece_number)).toEqual([2])
 const map=(await db.query('select public.region_map() r')).rows[0].r.regions.find(r=>r.id==='pharaoh')
 expect(map).toMatchObject({mapPieceCount:4,mapPieceRarities:['rare','rare','epic','epic'],mapPieces:[1],unlocked:false})
 await expect(db.exec("update public.fishing_map_blueprints set piece_rarities='[\"rare\"]' where region_id='pharaoh'")).rejects.toThrow()
})
it('preserves existing uniform map grades and existing rod purchase rules',async()=>{
 const map=(await db.query('select public.region_map() r')).rows[0].r.regions.find(r=>r.id==='firefly')
 expect(map.mapPieceRarities).toEqual(Array(8).fill('rare'))
 const rod=(await db.query("select price,region_id,failure_reduction_bp,native_bonus_bp,wait_reduction_seconds from public.fishing_rods where id='pharaoh'")).rows[0]
 expect(rod).toMatchObject({price:1800,region_id:'pharaoh',failure_reduction_bp:200,native_bonus_bp:200,wait_reduction_seconds:1})
 await db.exec('set role authenticated')
 await expect(db.exec("update public.fishing_map_blueprints set piece_rarities=null where region_id='pharaoh'")).rejects.toThrow('permission denied')
 await db.exec('reset role')
})
it('finishes mixed-grade reservations once and unlocks after all four pieces',async()=>{
 for(const piece of [2,3,4]){
  const rarity=piece<=2?'rare':'epic',op=crypto.randomUUID()
  await db.query(`insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,map_region_id,map_piece_number,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot)
   values($1,$2,'pongdang','bait',true,'pharaoh',$3,$4,app_private.fishing_map_piece_payload('pharaoh',$3,$1),12,4.5,'bait',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour','{"target_kinds":["fish"],"effect_kind":"standard"}')`,[uid,op,piece,rarity])
  const result=(await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r
  expect(result.attempt.species.rarity).toBe(rarity)
  expect(result.attempt.species.pieceNumber).toBe(piece)
  expect(result.attempt.collectible_id).toBeNull()
  expect((await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r.replayed).toBe(true)
  const map=(await db.query('select public.region_map() r')).rows[0].r.regions.find(r=>r.id==='pharaoh')
  expect(map.unlocked).toBe(piece===4)
 }
 expect((await db.query("select * from app_private.fishing_discovery_candidates('epic') where region_id='pharaoh'")).rows).toHaveLength(0)
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toHaveLength(0)
})
