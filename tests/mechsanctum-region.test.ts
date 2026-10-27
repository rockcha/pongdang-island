// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'

let db:Awaited<ReturnType<typeof createLocalDatabase>>
const uid=crypto.randomUUID()
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'sanctuaryQA')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
},180000)
afterAll(async()=>{await db?.close()})

it('registers all 59 natives with the requested category averages and grounded movement',async()=>{
 const groups=(await db.query("select kind::text kind,rarity::text rarity,count(*)::int n,avg(sell_price)::float average from public.collectible_species where native_region_id='mechsanctum' group by kind,rarity")).rows
 const group=(kind:string,rarity:string)=>groups.find(r=>r.kind===kind&&r.rarity===rarity)
 for(const [kind,rarity,n,average] of [['fish','common',13,58],['fish','rare',11,270],['fish','epic',6,850],['trash','common',6,15],['trash','rare',5,50],['decoration','common',7,35],['decoration','rare',8,100]] as const)
  expect(group(kind,rarity)).toMatchObject({n,average})
 const mythics=groups.filter(r=>r.rarity==='mythic')
 expect(mythics.reduce((n,r)=>n+r.n,0)).toBe(3)
 expect(mythics.reduce((n,r)=>n+r.average*r.n,0)/3).toBe(3500)
 expect((await db.query("select kind::text kind,movement_type from public.collectible_species where id='mechsanctum-deus-zero'")).rows[0]).toEqual({kind:'decoration',movement_type:'fixed'})
 expect((await db.query("select count(*)::int n from public.collectible_habitats h join public.collectible_species s on h.species_id=s.id where s.native_region_id='mechsanctum' and h.region_id='mechsanctum'")).rows[0].n).toBe(59)
 expect((await db.query("select count(*)::int n from public.collectible_species where native_region_id='mechsanctum' and ((movement_type='crawl' and swim_y_min<0.8) or (kind in ('trash','decoration') and movement_type<>'fixed'))")).rows[0].n).toBe(0)
})

it('awards six distinct pieces, unlocks only on completion, and stops rediscovery',async()=>{
 const current=async()=>((await db.query('select public.region_map() r')).rows[0].r.regions as {id:string;unlocked:boolean;mapPieceCount:number;mapPieces:number[]}[]).find(r=>r.id==='mechsanctum')!
 expect(await current()).toMatchObject({unlocked:false,mapPieceCount:6,mapPieces:[]})
 expect((await db.query("select piece_number from app_private.fishing_discovery_candidates('rare') where region_id='mechsanctum' order by piece_number")).rows.map(r=>r.piece_number)).toEqual([1,2,3,4,5,6])
 for(let piece=1;piece<=6;piece++){
  const op=crypto.randomUUID()
  await db.query(`insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,map_region_id,map_piece_number,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot)
   values($1,$2,'pongdang','bait',true,'mechsanctum',$3,'rare',app_private.fishing_map_piece_payload('mechsanctum',$3,$1),12,4.5,'bait',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour','{"target_kinds":["fish"],"effect_kind":"standard"}')`,[uid,op,piece])
  await db.query('select public.finish_fishing($1,true)',[op])
  expect((await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r.replayed).toBe(true)
  expect(await current()).toMatchObject({unlocked:piece===6,mapPieces:Array.from({length:piece},(_,i)=>i+1)})
 }
 expect((await db.query("select * from app_private.fishing_discovery_candidates('rare') where region_id='mechsanctum'")).rows).toHaveLength(0)
 expect((await db.query("select count(*)::int n from public.region_maps where region_id='mechsanctum'")).rows[0].n).toBe(0)
})

it('charges 1800 once for the dedicated rod and applies only its matching habitat bonus',async()=>{
 await db.query('select public.fishing_rod_state()')
 await db.query('update public.player_wallets set gold=4000 where user_id=$1',[uid])
 await expect(db.query("select public.equip_fishing_rod('mechsanctum')")).rejects.toThrow('ROD_NOT_OWNED')
 const op=crypto.randomUUID()
 await db.query("select public.trade_fishing_rod('mechsanctum','buy',$1)",[op])
 await db.query("select public.trade_fishing_rod('mechsanctum','buy',$1)",[op])
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(2200)
 await db.query("select public.equip_fishing_rod('mechsanctum')")
 const state=(await db.query('select public.fishing_rod_state() r')).rows[0].r
 expect(state.selected).toBe('mechsanctum')
 expect(state.catalog.find(r=>r.id==='mechsanctum')).toMatchObject({price:1800,native_bonus_bp:200,failure_reduction_bp:200,wait_reduction_seconds:1})
 expect((await db.query("select app_private.rod_habitat_weight('mechsanctum','mechsanctum','mechsanctum')::float8 w")).rows[0].w).toBe(2.2)
 expect((await db.query("select app_private.rod_habitat_weight('coral','mechsanctum','mechsanctum')::float8 w")).rows[0].w).toBe(0.05)
})
