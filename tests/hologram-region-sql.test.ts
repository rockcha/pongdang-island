// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const uid=crypto.randomUUID()
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'홀로검수')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
},180000)
afterAll(async()=>{await db?.close()})

it('unlocks only after six distinct pieces with two common, two rare and two epic discoveries',async()=>{
 for(const [rarity,pieces] of [['common',[1,2]],['rare',[3,4]],['epic',[5,6]]] as const){
  expect((await db.query("select piece_number from app_private.fishing_discovery_candidates($1) where region_id='hologram' order by piece_number",[rarity])).rows.map(r=>r.piece_number)).toEqual(pieces)
 }
 for(let piece=1;piece<=6;piece++){
  const rarity=piece<=2?'common':piece<=4?'rare':'epic',op=crypto.randomUUID()
  await db.query(`insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,map_region_id,map_piece_number,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot)
   values($1,$2,'pongdang','bait',true,'hologram',$3,$4,app_private.fishing_map_piece_payload('hologram',$3,$1),12,4.5,'bait',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour','{"target_kinds":["fish"],"effect_kind":"standard"}')`,[uid,op,piece,rarity])
  const result=(await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r
  expect(result.attempt.species).toMatchObject({rarity,pieceNumber:piece})
  expect((await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r.replayed).toBe(true)
  const map=(await db.query('select public.region_map() r')).rows[0].r.regions.find(r=>r.id==='hologram')
  expect(map).toMatchObject({mapPieceCount:6,mapPieceRarities:['common','common','rare','rare','epic','epic'],unlocked:piece===6})
 }
 for(const rarity of ['common','rare','epic'])expect((await db.query("select * from app_private.fishing_discovery_candidates($1) where region_id='hologram'",[rarity])).rows).toHaveLength(0)
 expect((await db.query('select * from public.player_collectibles where user_id=$1',[uid])).rows).toHaveLength(0)
})
it('exposes the complete native roster, intended movement and exact requested averages',async()=>{
 const rows=(await db.query("select kind,rarity,count(*)::int n,avg(sell_price)::int average from public.collectible_species where native_region_id='hologram' group by kind,rarity")).rows
 expect(rows).toHaveLength(9)
 for(const [kind,rarity,n,average] of [['fish','common',10,65],['fish','rare',9,280],['fish','epic',9,1250],['fish','mythic',5,3500],['trash','common',12,25],['trash','rare',14,80],['decoration','common',15,40],['decoration','rare',15,155],['decoration','epic',6,900]])expect(rows).toContainEqual({kind,rarity,n,average})
 expect((await db.query("select count(*)::int n from public.collectible_habitats where region_id='hologram' and species_id like 'hologram-%'")).rows[0].n).toBe(95)
 expect((await db.query("select count(*)::int n from public.collectible_habitats where region_id='hologram' and species_id like 'shared-decor-%'")).rows[0].n).toBe(31)
 expect((await db.query("select movement_type,flip_with_direction from public.collectible_species where id='hologram-prism'")).rows[0]).toEqual({movement_type:'fixed',flip_with_direction:false})
 expect((await db.query("select movement_type from public.collectible_species where id='hologram-glitch-crab'")).rows[0].movement_type).toBe('crawl')
 expect((await db.query("select movement_type from public.collectible_species where id='hologram-sweeper'")).rows[0].movement_type).toBe('crawl')
 expect((await db.query("select id from public.collectible_species where id in ('hologram-quicksilver','hologram-proto-x','hologram-proto-09','hologram-leviathan','hologram-override')")).rows).toHaveLength(0)
})
it('charges the same rod price once, equips it, and applies the preceding map rod bonus',async()=>{
 await db.query('select public.fishing_rod_state()')
 await db.query('update public.player_wallets set gold=10000 where user_id=$1',[uid])
 const op=crypto.randomUUID()
 await db.exec('set role authenticated')
 try{
  expect((await db.query("select public.trade_fishing_rod('hologram','buy',$1) r",[op])).rows[0].r).toMatchObject({gold:7200,delta:-2800})
  await db.query("select public.trade_fishing_rod('hologram','buy',$1)",[op])
  await db.query("select public.equip_fishing_rod('hologram')")
 }finally{await db.exec('reset role')}
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(7200)
 expect((await db.query('select public.fishing_rod_state() r')).rows[0].r.selected).toBe('hologram')
 const weight=(await db.query("select app_private.rod_habitat_weight('hologram','hologram','hologram')::float8 as hologram,app_private.rod_habitat_weight('galaxy','galaxy','galaxy')::float8 as galaxy")).rows[0]
 expect(weight.hologram).toBe(weight.galaxy)
})
