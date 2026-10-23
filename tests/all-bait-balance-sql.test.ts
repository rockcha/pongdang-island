// @vitest-environment node
import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'
import catalog from '../supabase/catalog/catalog.json'

it('preserves a paid cast and applies all new profiles with a uniform common wait to new casts',async()=>{
 const db=await createLocalDatabase(),first='20261022152047_rebalance_all_baits_and_uniform_wait.sql'
 const uid=crypto.randomUUID(),legacy=crypto.randomUUID()
 try{
  for(const f of migrationFiles().filter(f=>f<first))await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))
  await db.exec('update app_private.fishing_maintenance set released_at=starts_at')
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  await db.exec("select app_private.get_gold_wallet();insert into public.player_navigation(user_id,region_id) values(auth.uid(),'pongdang') on conflict(user_id) do update set region_id='pongdang'")
  await db.query('update public.player_wallets set inventory=$1 where user_id=$2',[Object.fromEntries(catalog.fishing_baits.map(b=>[b.id,1000])),uid])
  await db.query("select public.prepare_fishing('pongdang','bait_deep_sleep_sachet',$1,true)",[legacy])
  const before=(await db.query('select to_jsonb(p)-\'map_piece_number\' snapshot from app_private.prepared_fishing_casts p where operation_id=$1',[legacy])).rows[0]
  for(const f of migrationFiles().filter(f=>f>=first))await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))
  expect((await db.query('select to_jsonb(p)-\'map_piece_number\' snapshot from app_private.prepared_fishing_casts p where operation_id=$1',[legacy])).rows[0]).toEqual(before)
  await db.query("select public.prepare_fishing('pongdang','bait_deep_sleep_sachet',$1,true)",[legacy])
  expect((await db.query('select to_jsonb(p)-\'map_piece_number\' snapshot from app_private.prepared_fishing_casts p where operation_id=$1',[legacy])).rows[0]).toEqual(before)
  await db.exec("update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result='{}'")
  const profiles=(await db.query<{id:string;wait_min_seconds:number;wait_max_seconds:number}>('select * from app_private.fishing_bait_balance_profiles')).rows
  expect(profiles).toHaveLength(catalog.fishing_bait_balance_profiles.length)
  await db.exec('select setseed(.42)')
  const waits:number[]=[]
  for(let i=0;i<profiles.length+200;i++){
   const bait=i<profiles.length?profiles[i].id:'bait',op=crypto.randomUUID()
   await db.query("select public.prepare_fishing('pongdang',$1,$2,true)",[bait,op])
   const row=(await db.query<{wait_seconds:number;bait_snapshot:any}>('select wait_seconds::float8 wait_seconds,bait_snapshot from app_private.prepared_fishing_casts where operation_id=$1',[op])).rows[0]
   expect(row.wait_seconds).toBeGreaterThanOrEqual(12)
   expect(row.wait_seconds).toBeLessThanOrEqual(24)
   expect(row.bait_snapshot.wait_min_seconds).toBe(12)
   expect(row.bait_snapshot.wait_max_seconds).toBe(24)
   if(i>=profiles.length)waits.push(row.wait_seconds)
   await db.query("update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result='{}' where operation_id=$1",[op])
  }
  expect(waits.filter(w=>w<15).length/200).toBeGreaterThan(.17)
  expect(waits.filter(w=>w>=21).length/200).toBeGreaterThan(.17)
  for(const p of catalog.fishing_bait_balance_profiles){
   const actual=(await db.query('select * from app_private.fishing_bait_balance_profiles where id=$1',[p.id])).rows[0]
   expect({...actual,native_multiplier:Number(actual.native_multiplier)}).toMatchObject(p)
  }
 }finally{await db.close()}
},60000)
