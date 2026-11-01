// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const uid=crypto.randomUUID()
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'불빛검수')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
},180000)
afterAll(async()=>{await db?.close()})
it('offers exactly two pieces at each grade and unlocks only after all six distinct pieces',async()=>{
 for(const [rarity,numbers] of [['common',[1,2]],['rare',[3,4]],['epic',[5,6]]] as const){
  expect((await db.query("select piece_number from app_private.fishing_discovery_candidates($1) where region_id='hangang' order by piece_number",[rarity])).rows.map(r=>r.piece_number)).toEqual(numbers)
 }
 for(let piece=1;piece<=6;piece++){
  const rarity=piece<=2?'common':piece<=4?'rare':'epic',op=crypto.randomUUID()
  await db.query(`insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,map_region_id,map_piece_number,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot)
   values($1,$2,'pongdang','bait',true,'hangang',$3,$4,app_private.fishing_map_piece_payload('hangang',$3,$1),12,4.5,'bait',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour','{"target_kinds":["fish"],"effect_kind":"standard"}')`,[uid,op,piece,rarity])
  const result=(await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r
  expect(result.attempt.species).toMatchObject({rarity,pieceNumber:piece})
  expect((await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r.replayed).toBe(true)
  const map=(await db.query('select public.region_map() r')).rows[0].r.regions.find(r=>r.id==='hangang')
  expect(map).toMatchObject({mapPieceCount:6,mapPieceRarities:['common','common','rare','rare','epic','epic'],unlocked:piece===6})
 }
 for(const rarity of ['common','rare','epic'])expect((await db.query("select piece_number from app_private.fishing_discovery_candidates($1) where region_id='hangang'",[rarity])).rows).toHaveLength(0)
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toHaveLength(0)
})
