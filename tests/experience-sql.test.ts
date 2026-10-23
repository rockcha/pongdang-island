// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles,readSql} from '../scripts/db/local.mjs'

let db
const me=crypto.randomUUID(),other=crypto.randomUUID()
let legacyTotal=0,legacyTrap
async function login(user=me){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])}
async function state(){return (await db.query('select public.experience_state() s')).rows[0].s}
async function trap(action,id=null,op=crypto.randomUUID()){
 return (await db.query('select public.expedition_action($1,$2,$3,$4,$5,$6) s',[action,op,action==='depart'?'dinghy':null,'pongdang',action==='depart'?{bait_safe:3}:null,id])).rows[0].s
}
async function harbor(action,vessel=null,id=null,op=crypto.randomUUID()){
 return (await db.query('select public.harbor_action($1,$2,$3,$4,1) s',[action,op,vessel,id])).rows[0].s
}
async function caught(kind,rarity,op=crypto.randomUUID(),user=me){
 let species=(await db.query('select id from public.collectible_species where kind=$1 and rarity=$2 limit 1',[kind,rarity])).rows[0]
 // Some kind/grade pairs have no released species yet. Exercise a synthetic
 // catalogue grade inside the test transaction as well as current entries.
 if(!species){species=(await db.query('select id from public.collectible_species where kind=$1 limit 1',[kind])).rows[0];await db.query('update public.collectible_species set rarity=$2 where id=$1',[species.id,rarity])}
 const item=(await db.query('insert into public.player_collectibles(user_id,species_id) values($1,$2) returning id',[user,species.id])).rows[0]
 await db.query("insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id,rarity,collectible_id) values($1,$2,'pongdang','bait',$3,$4)",[user,op,rarity,item.id])
 return op
}
beforeAll(async()=>{
 db=await createLocalDatabase()
 const files=migrationFiles(),migration=files.find(f=>f.endsWith('_player_experience_levels.sql'))
 for(const file of files){if(file===migration)break;await db.exec(readSql(`supabase/migrations/${file}`))}
 await db.exec('update app_private.fishing_maintenance set released_at=starts_at where id')
 for(const id of [me,other]){
  await db.query('insert into auth.users(id) values($1)',[id])
  await db.query("insert into public.player_profiles(id,nickname) values($1,'레벨퐁이')",[id])
  await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,100000,'{\"bait\":100,\"bait_safe\":100,\"fuel\":100}') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory",[id])
 }
 await login()
 await db.query("insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id) values($1,$2,'pongdang','bait')",[me,crypto.randomUUID()])
 await caught('fish','common')
 const trip=(await trap('depart')).active
 await trap('instant',trip.id)
 const settled=await trap('claim',trip.id);legacyTrap=trip.id
 const trapped=settled.receipt.result.items.length
 await harbor('buy','fishing-raft')
 const voyage=(await harbor('depart','fishing-raft')).receipt.voyageId
 await db.query("update public.harbor_voyages set departed_at=clock_timestamp()-interval '4 hours',returns_at=clock_timestamp()-interval '1 minute' where id=$1",[voyage])
 const sailed=(await harbor('claim',null,voyage)).receipt.results[0].items.length
 legacyTotal=30+(trapped+sailed)*6
 await db.exec(readSql(`supabase/migrations/${migration}`))
},60000)
beforeEach(async()=>{await db.exec('begin');await login()})
afterEach(async()=>{await db.exec('rollback')})
afterAll(async()=>{await db?.close()})

it('converts old failed/successful casts and actual claimed trap/boat items once',async()=>{
 expect(await state()).toMatchObject({totalXp:legacyTotal,legacyXp:legacyTotal})
 const before=await state()
 await trap('claim',legacyTrap)
 expect(await state()).toEqual(before)
 await login(other)
 expect(await state()).toEqual({level:1,totalXp:0,currentXp:0,nextLevelXp:100,legacyXp:0})
})
it('awards all catch grades and halves trash before rounding automatic XP',async()=>{
 for(const [rarity,xp] of [['common',10],['rare',30],['epic',100],['mythic',400]]){
  for(const kind of ['fish','decoration','trash']){
   const amount=kind==='trash'?Number(xp)/2:Number(xp)
   const row=(await db.query('select app_private.catch_experience($1,$2) manual,app_private.catch_experience($1,$2,true) auto',[kind,rarity])).rows[0]
   expect(row).toEqual({manual:amount,auto:Math.round(amount*.3)})
   const before=(await state()).totalXp
   await caught(kind,rarity)
   expect((await state()).totalXp-before).toBe(amount)
  }
 }
})
it('has exact level boundaries, carryover and no first-load reward',async()=>{
 for(const [xp,level,current,next] of [[0,1,0,100],[99,1,99,100],[100,2,0,150],[250,3,0,200],[400,3,150,200],[10450,20,0,1050],[63700,50,0,2550]]){
  await db.query('update app_private.player_experience set legacy_xp=0,total_xp=$2 where user_id=$1',[me,xp])
  expect(await state()).toEqual({level,totalXp:xp,currentXp:current,nextLevelXp:next,legacyXp:0})
 }
})
it('deduplicates per account and source and rolls back the ledger with its transaction',async()=>{
 const op=crypto.randomUUID(),before=(await state()).totalXp
 await db.query("select app_private.award_experience($1,'manual',$2,400)",[me,op])
 await db.query("select app_private.award_experience($1,'manual',$2,400)",[me,op])
 await db.query("select app_private.award_experience($1,'manual',$2,30)",[other,op])
 expect((await state()).totalXp-before).toBe(400)
 await login(other);expect((await state()).totalXp).toBe(30);await login()
 await db.exec('savepoint xp_rollback')
 await caught('fish','rare')
 await db.exec('rollback to xp_rollback')
 expect((await state()).totalXp-before).toBe(400)
})
it('awards failed direct casts but never grants XP from inventory inserts or a sale',async()=>{
 const before=(await state()).totalXp
 await db.query("insert into public.fishing_attempts(user_id,operation_id,region_id,bait_id) values($1,$2,'pongdang','bait')",[me,crypto.randomUUID()])
 expect((await state()).totalXp-before).toBe(2)
 await db.query("insert into public.player_collectibles(user_id,species_id) select $1,id from public.collectible_species where kind='fish' limit 1",[me])
 await db.query('update public.player_collectibles set sold_at=clock_timestamp() where user_id=$1 and sold_at is null',[me])
 expect((await state()).totalXp-before).toBe(2)
})
it('awards a rare map piece with no inventory collectible and does not repeat on finish retry',async()=>{
 await db.exec("update public.fishing_map_blueprints set enabled=false;insert into public.regions(id,name,description,rarity,sort_order,image_path,requires_map_fragment) values('level-map','Level map','Test','rare',999,'test.png',true);insert into public.fishing_map_blueprints values('level-map',4,'test.png',true);update public.collectible_species set rarity='common' where rarity='rare' and kind='fish'")
 const op=crypto.randomUUID(),before=(await state()).totalXp
 await db.query(`insert into app_private.prepared_fishing_casts(user_id,operation_id,region_id,bait_id,eligible,species_id,rarity,snapshot,wait_seconds,failure_at,failure_reason,created_at,expires_at,bait_snapshot)
 values($1,$2,'pongdang','bait',true,(select id from public.collectible_species where kind='fish' limit 1),'rare','{}',12,4.5,'bait',clock_timestamp()-interval '1 minute',clock_timestamp()+interval '1 hour','{"target_kinds":["fish"],"effect_kind":"standard"}')`,[me,op])
 const result=(await db.query('select public.finish_fishing($1,true) s',[op])).rows[0].s
 expect(result.attempt.species.kind).toBe('map');expect(result.attempt.collectible_id).toBeNull()
 expect((await state()).totalXp-before).toBe(30)
 await db.query('select public.finish_fishing($1,true)',[op])
 expect((await state()).totalXp-before).toBe(30)
})
it('pays only when automatic catches are claimed and preserves XP across claim retries',async()=>{
 const before=(await state()).totalXp
 const trip=(await trap('depart')).active
 expect((await state()).totalXp).toBe(before)
 await trap('instant',trip.id)
 expect((await state()).totalXp).toBe(before)
 const result=(await trap('claim',trip.id)).receipt.result
 let expected=0
 for(const item of result.items)expected+=(await db.query('select app_private.catch_experience($1,$2,true) n',[item.species.kind,item.species.rarity])).rows[0].n
 expect((await state()).totalXp-before).toBe(expected)
 await trap('claim',trip.id)
 expect((await state()).totalXp-before).toBe(expected)
 const voyage=(await harbor('depart','fishing-raft')).receipt.voyageId
 const boatBefore=(await state()).totalXp
 await db.query("update public.harbor_voyages set departed_at=clock_timestamp()-interval '4 hours',returns_at=clock_timestamp()-interval '1 minute' where id=$1",[voyage])
 const boatResult=(await harbor('claim',null,voyage)).receipt.results[0]
 let boatXp=0
 for(const item of boatResult.items)boatXp+=(await db.query('select app_private.catch_experience($1,$2,true) n',[item.species.kind,item.species.rarity])).rows[0].n
 expect((await state()).totalXp-boatBefore).toBe(boatXp)
 await harbor('claim',null,voyage)
 expect((await state()).totalXp-boatBefore).toBe(boatXp)
})
it('allows only own state and blocks anonymous calls, direct writes and client-awarded XP',async()=>{
 await db.exec('savepoint permissions')
 await db.exec('set role authenticated')
 expect((await state()).totalXp).toBe(legacyTotal)
 for(const sql of ["select * from app_private.player_experience","update app_private.player_experience set total_xp=999999","select * from app_private.experience_events","select app_private.award_experience(auth.uid(),'manual',gen_random_uuid(),400)"]){
  await expect(db.query(sql)).rejects.toThrow(/permission denied/)
  await db.exec('rollback to permissions;set role authenticated')
 }
 await db.exec('reset role;set role anon')
 await expect(state()).rejects.toThrow(/permission denied/)
 await db.exec('rollback to permissions;reset role')
})
