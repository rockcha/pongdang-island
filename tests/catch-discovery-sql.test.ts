// @vitest-environment node
import {afterAll,beforeAll,expect,it} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db,sid
const uid='00000000-0000-0000-0000-000000009801'
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db)
 await db.query('insert into auth.users(id) values($1)',[uid])
 await db.query("insert into public.player_profiles(id,nickname) values($1,'새발견')",[uid])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
 await db.exec("select app_private.get_gold_wallet();update public.player_wallets set gold=10000,inventory='{\"bait_cloud_dough\":20,\"fuel\":20}';insert into public.player_navigation(user_id,region_id) values(auth.uid(),'pongdang')")
 sid=(await db.query("select id from public.collectible_species where kind='fish' and rarity='common' order by id limit 1")).rows[0].id
 await db.exec(`create or replace function app_private.expedition_pick(p_region text,p_bait text,p_native boolean,p_local_discovery boolean default false) returns text language sql as $$select '${sid}'::text$$`)
 await db.exec("create or replace function app_private.expedition_success_chance_bp(p_bait_id text,p_reduction integer) returns integer language sql as 'select 10000'")
},60000)
afterAll(async()=>{await db?.close()})
it('snapshots first discovery in manual catches and preserves it on retry',async()=>{
 for(const fresh of [true,false]){
  const op=crypto.randomUUID()
  await db.query("select public.prepare_fishing('pongdang','bait_cloud_dough',$1)",[op])
  await db.query("update app_private.prepared_fishing_casts set created_at=clock_timestamp()-interval '30 seconds',species_id=$1,snapshot=app_private.species_payload($1,null) where operation_id=$2",[sid,op])
  const first=(await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r
  expect(first.attempt.firstDiscovery).toBe(fresh)
  expect((await db.query('select public.finish_fishing($1,true) r',[op])).rows[0].r.attempt).toEqual(first.attempt)
 }
})
it('marks only the first copy in a trap and persists flags in the claim receipt',async()=>{
 await db.query('delete from public.player_discoveries where user_id=$1',[uid])
 const departed=(await db.query("select public.expedition_action('depart',$1,'dinghy','pongdang','{\"bait_cloud_dough\":2}') r",[crypto.randomUUID()])).rows[0].r
 const id=departed.receipt.expeditionId,op=crypto.randomUUID()
 await db.exec("update public.fishing_expeditions set departed_at=clock_timestamp()-interval '1 hour',returns_at=clock_timestamp()-interval '1 minute'")
 const claim=async()=>(await db.query("select public.expedition_action('claim',$1,null,null,null,$2) r",[op,id])).rows[0].r.receipt.result
 const result=await claim()
 expect(result.items.map(i=>i.firstDiscovery)).toEqual([true,false])
 expect(await claim()).toEqual(result)
})
it('records first discovery once in harbor claims and replays it unchanged',async()=>{
 await db.query('delete from public.player_discoveries where user_id=$1',[uid])
 await db.query("select public.harbor_action('buy',$1,'fishing-raft')",[crypto.randomUUID()])
 for(const fresh of [true,false]){
  const trip=(await db.query("select public.harbor_action('depart',$1,'fishing-raft') r",[crypto.randomUUID()])).rows[0].r.receipt.voyageId
  await db.exec("update public.harbor_voyages set departed_at=clock_timestamp()-interval '4 hours',returns_at=clock_timestamp()-interval '1 minute'")
  const op=crypto.randomUUID(),claim=async()=>(await db.query("select public.harbor_action('claim',$1,null,$2) r",[op,trip])).rows[0].r.receipt.results
  const result=await claim()
  expect(result[0].items[0].firstDiscovery).toBe(fresh)
  expect(result[0].items.slice(1).every(i=>i.firstDiscovery===false)).toBe(true)
  expect(await claim()).toEqual(result)
 }
})
