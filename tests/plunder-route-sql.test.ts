// @vitest-environment node
import {beforeAll,afterAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const uid=crypto.randomUUID()
beforeAll(async()=>{
  db=await createLocalDatabase();await replayMigrations(db)
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("insert into public.player_profiles(id,nickname) values($1,'plunderQA')",[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
},180000)
afterAll(async()=>{await db?.close()})

it('preserves the original natives and adds the three upper-mid epic pirate Pongi fish',async()=>{
  const groups=(await db.query("select rarity::text rarity,count(*)::int n,avg(sell_price)::float average from public.collectible_species where native_region_id='plunder' and kind='fish' group by rarity order by average")).rows
  expect(groups).toEqual([{rarity:'common',n:12,average:55},{rarity:'rare',n:8,average:240},{rarity:'epic',n:8,average:903.75},{rarity:'mythic',n:3,average:2800}])
  expect((await db.query("select kind::text kind,count(*)::int n from public.collectible_species where native_region_id='plunder' group by kind order by kind::text")).rows).toEqual([{kind:'decoration',n:11},{kind:'fish',n:31},{kind:'trash',n:8}])
  expect((await db.query("select count(*)::int n from public.collectible_habitats h join public.collectible_species s on s.id=h.species_id where s.native_region_id='plunder' and h.region_id='plunder'")).rows[0]).toEqual({n:50})
  const pongis=(await db.query("select id,sell_price,movement_type,swim_y_min::float y_min,swim_y_max::float y_max,flip_with_direction,travel_direction from public.collectible_species where id in ('plunder-black-sail-captain-pongi','plunder-safecracker-pongi','plunder-red-knot-bosun-pongi') order by id")).rows
  expect(pongis.map(s=>[s.id,s.sell_price])).toEqual([['plunder-black-sail-captain-pongi',1180],['plunder-red-knot-bosun-pongi',1140],['plunder-safecracker-pongi',1160]])
  for(const species of pongis)expect(species).toMatchObject({movement_type:'swim',y_min:.3,y_max:.7,flip_with_direction:true,travel_direction:'both'})
})
it('keeps grounded species on the bottom and static items stationary with lower prices',async()=>{
  expect((await db.query("select count(*)::int n from public.collectible_species where native_region_id='plunder' and movement_type='crawl' and swim_y_min<0.8")).rows[0]).toEqual({n:0})
  expect((await db.query("select count(*)::int n from public.collectible_species where native_region_id='plunder' and kind in ('trash','decoration') and movement_type<>'fixed'")).rows[0]).toEqual({n:0})
  const values=(await db.query("select rarity::text rarity,kind::text kind,avg(sell_price)::float price from public.collectible_species where native_region_id='plunder' group by rarity,kind")).rows
  for(const rarity of ['common','rare']){
    const price=(kind:string)=>values.find(r=>r.rarity===rarity&&r.kind===kind)!.price
    expect(price('trash')).toBeLessThan(price('decoration'))
    expect(price('decoration')).toBeLessThan(price('fish'))
  }
})
it('fills optional remote facing metadata for only the three new Pongi fish',async()=>{
  const {readFileSync}=await import('node:fs')
  const sql=readFileSync('supabase/migrations/20261028143916_pirate_pongi_remote_facing_metadata.sql','utf8').split('\n').filter(line=>!/^\s*(begin|commit);\s*$/i.test(line)).join('\n')
  await db.exec("begin; alter table public.collectible_species add column facing_direction text default 'left';")
  try{
    await db.exec(sql)
    expect((await db.query("select id from public.collectible_species where facing_direction='right' order by id")).rows.map(r=>r.id)).toEqual(['plunder-black-sail-captain-pongi','plunder-red-knot-bosun-pongi','plunder-safecracker-pongi'])
    await db.exec(sql)
    expect((await db.query("select count(*)::int n from public.collectible_species where facing_direction='right'")).rows[0]).toEqual({n:3})
  }finally{await db.exec('rollback;')}
})
it('unlocks with four distinct fishing pieces and removes completed-map candidates',async()=>{
  const current=async()=>((await db.query('select public.region_map() r')).rows[0].r.regions as {id:string;unlocked:boolean;mapPieceCount:number;mapPieces:number[]}[]).find(r=>r.id==='plunder')!
  expect(await current()).toMatchObject({unlocked:false,mapPieceCount:4,mapPieces:[]})
  expect((await db.query("select piece_number from app_private.fishing_discovery_candidates('rare') where region_id='plunder' order by piece_number")).rows).toEqual([{piece_number:1},{piece_number:2},{piece_number:3},{piece_number:4}])
  for(let piece=1;piece<=4;piece++){
    const op=crypto.randomUUID()
    await db.query(`insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,map_region_id,map_piece_number,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot)
      values($1,$2,'pongdang','bait',true,'plunder',$3,'rare',app_private.fishing_map_piece_payload('plunder',$3,$1),12,4.5,'bait',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour','{"target_kinds":["fish"],"effect_kind":"standard"}')`,[uid,op,piece])
    const result=(await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r
    expect(result.attempt.species.pieceFoundCount).toBe(piece)
    expect((await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r.replayed).toBe(true)
    const region=await current()
    expect(region.mapPieces).toHaveLength(piece)
    expect(region.unlocked).toBe(piece===4)
  }
  expect((await db.query("select * from app_private.fishing_discovery_candidates('rare') where region_id='plunder'")).rows).toHaveLength(0)
  expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1',[uid])).rows[0]).toEqual({n:0})
})
