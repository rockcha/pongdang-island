// @vitest-environment node
import {it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

it('finishes preserved map reservations, unlocks once and never creates inventory items',async()=>{
 const db=await createLocalDatabase(),uid=crypto.randomUUID()
 try{
  await replayMigrations(db)
  await db.exec('update public.fishing_map_blueprints set enabled=false')
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("insert into public.player_profiles(id,nickname) values($1,'지도테스터')",[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  await db.exec("insert into public.regions(id,name,description,rarity,sort_order,image_path,requires_map_fragment) values('future-test','Future','Test','rare',999,'test.png',true)")
  await db.exec("insert into public.fishing_map_blueprints(region_id,piece_count,thumbnail_path,enabled) values('future-test',4,'test.png',true)")
  await expect(db.exec("insert into public.fishing_map_blueprints(region_id,piece_count,thumbnail_path,enabled) values('coral',4,'test.png',true)")).rejects.toThrow('MAP_ALREADY_SOLD')
  // Remove ordinary rare fish only in this isolated fixture to make each rare draw deterministic.
  await db.exec("update public.collectible_species set rarity='common' where rarity='rare' and kind='fish'")
  const reserve=async(rarity='rare')=>{
   const op=crypto.randomUUID()
   const piece=rarity==='rare'?(await db.query(`select n from generate_series(1,4) n where not exists(
    select 1 from app_private.player_fishing_map_pieces where user_id=$1 and region_id='future-test' and piece_number=n) order by n limit 1`,[uid])).rows[0]?.n:null
   await db.query(`insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,map_region_id,map_piece_number,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot)
    values($1,$2,'pongdang','bait',true,case when $4::integer is null then (select id from public.collectible_species where kind='fish' limit 1) end,
     case when $4::integer is not null then 'future-test' end,$4,$3,
     case when $4::integer is not null then app_private.fishing_map_piece_payload('future-test',$4,$1) else '{}'::jsonb end,
     12,4.5,'bait',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour','{"target_kinds":["fish"],"effect_kind":"standard"}')`,[uid,op,rarity,piece??null])
   return op
  }
  const finish=async(op:string,won=true)=>(await db.query('select public.finish_fishing($1,$2) r',[op,won])).rows[0].r
  const ordinary=await reserve('common')
  expect((await db.query('select map_piece_number from app_private.prepared_fishing_casts where operation_id=$1',[ordinary])).rows[0].map_piece_number).toBeNull()
  await finish(ordinary,false)
  const failed=await reserve();await finish(failed,false)
  expect((await db.query('select * from app_private.player_fishing_map_pieces')).rows).toHaveLength(0)
  const found=new Set<number>()
  for(let i=1;i<=4;i++){
   const op=await reserve(),result=await finish(op)
   const species=result.attempt.species
   expect(species.kind).toBe('map');expect(species.rarity).toBe('rare')
   expect(species.name).toBe(`Future의 ${species.pieceNumber}번째 조각 (${i}/4)`)
   expect(found.has(species.pieceNumber)).toBe(false);found.add(species.pieceNumber)
   expect((await finish(op)).replayed).toBe(true)
   expect((await db.query('select * from app_private.player_fishing_map_pieces')).rows).toHaveLength(i)
   const map=(await db.query('select public.region_map() r')).rows[0].r
   const region=map.regions.find(r=>r.id==='future-test')
   expect(region.mapPieces).toHaveLength(i);expect(region.unlocked).toBe(i===4)
   expect(result.attempt.collectible_id).toBeNull()
  }
  const next=await reserve()
  expect((await db.query('select map_piece_number from app_private.prepared_fishing_casts where operation_id=$1',[next])).rows[0].map_piece_number).toBeNull()
  expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toHaveLength(0)
  await expect(db.query("select public.buy_region_map('future-test',$1)",[crypto.randomUUID()])).rejects.toThrow('MAP_FOUND_BY_FISHING')
  await db.exec('set role authenticated')
  await expect(db.exec('insert into app_private.player_fishing_map_pieces values(auth.uid(),\'future-test\',1,now())')).rejects.toThrow('permission denied')
  await db.exec('reset role')
 }finally{await db.close()}
},60000)
