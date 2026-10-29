// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const uid=crypto.randomUUID()
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'fireflyQA')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
},180000)
afterAll(async()=>{await db?.close()})
it('registers all 63 natives with exact requested group averages and deliberate movement',async()=>{
 const rows=(await db.query("select kind::text kind,rarity::text rarity,count(*)::int n,avg(sell_price)::float average from public.collectible_species where native_region_id='firefly' group by kind,rarity")).rows
 for(const [kind,rarity,n,average] of [['fish','common',15,55],['fish','rare',10,260],['fish','epic',8,1200],['fish','mythic',4,3400],['trash','common',7,15],['trash','rare',5,55],['decoration','common',6,40],['decoration','rare',8,180]] as const)
  expect(rows.find(r=>r.kind===kind&&r.rarity===rarity)).toMatchObject({n,average})
 expect((await db.query("select count(*)::int n from public.collectible_habitats h join public.collectible_species s on s.id=h.species_id where s.native_region_id='firefly' and h.region_id='firefly'")).rows[0].n).toBe(63)
 expect((await db.query("select movement_type,swim_y_min::float minimum from public.collectible_species where id='firefly-acorn-lantern-hermit'")).rows[0]).toEqual({movement_type:'crawl',minimum:.85})
 expect((await db.query("select movement_type from public.collectible_species where id='firefly-waterlily-jellyfish'")).rows[0].movement_type).toBe('pulse')
 expect((await db.query("select count(*)::int n from public.collectible_species where native_region_id='firefly' and kind in ('trash','decoration') and movement_type<>'fixed'")).rows[0].n).toBe(0)
})
it('unlocks only after eight distinct pieces, preserves replay and never sells the map',async()=>{
 const current=async()=>((await db.query('select public.region_map() r')).rows[0].r.regions as {id:string;unlocked:boolean;mapPieceCount:number;mapPieces:number[]}[]).find(r=>r.id==='firefly')!
 expect(await current()).toMatchObject({unlocked:false,mapPieceCount:8,mapPieces:[]})
 expect((await db.query("select piece_number from app_private.fishing_discovery_candidates('rare') where region_id='firefly' order by piece_number")).rows.map(r=>r.piece_number)).toEqual([1,2,3,4,5,6,7,8])
 for(let piece=1;piece<=8;piece++){
  const op=crypto.randomUUID()
  await db.query(`insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,map_region_id,map_piece_number,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot)
   values($1,$2,'pongdang','bait',true,'firefly',$3,'rare',app_private.fishing_map_piece_payload('firefly',$3,$1),12,4.5,'bait',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour','{"target_kinds":["fish"],"effect_kind":"standard"}')`,[uid,op,piece])
  await db.query('select public.finish_fishing($1,true)',[op])
  expect((await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r.replayed).toBe(true)
  expect(await current()).toMatchObject({unlocked:piece===8,mapPieces:Array.from({length:piece},(_,i)=>i+1)})
 }
 expect((await db.query("select * from app_private.fishing_discovery_candidates('rare') where region_id='firefly'")).rows).toHaveLength(0)
 expect((await db.query("select count(*)::int n from public.region_maps where region_id='firefly'")).rows[0].n).toBe(0)
})
it('charges the dedicated rod once and applies the matching habitat bonus',async()=>{
 await db.query('select public.fishing_rod_state()')
 await db.query('update public.player_wallets set gold=4000 where user_id=$1',[uid])
 const op=crypto.randomUUID()
 await db.query("select public.trade_fishing_rod('firefly','buy',$1)",[op])
 await db.query("select public.trade_fishing_rod('firefly','buy',$1)",[op])
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(2200)
 await db.query("select public.equip_fishing_rod('firefly')")
 expect((await db.query('select public.fishing_rod_state() r')).rows[0].r.selected).toBe('firefly')
 expect((await db.query("select app_private.rod_habitat_weight('firefly','firefly','firefly')::float8 w")).rows[0].w).toBe(2.2)
})
