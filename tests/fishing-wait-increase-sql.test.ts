// @vitest-environment node
import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'

it('adds one second only to future casts, preserving active casts and retries',async()=>{
 const db=await createLocalDatabase(),migration='20261028115413_increase_future_fishing_wait_one_second.sql'
 const uid=crypto.randomUUID()
 try{
  for(const f of migrationFiles().filter(f=>f<migration))await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  await db.exec('update app_private.fishing_maintenance set released_at=starts_at;select app_private.fishing_rod_state()')
  await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang') on conflict(user_id) do update set region_id='pongdang'",[uid])
  await db.query('update public.player_wallets set inventory=$1 where user_id=$2',[{bait:1000},uid])
  const saved=async(op:string)=>(await db.query('select to_jsonb(p) value from app_private.prepared_fishing_casts p where operation_id=$1',[op])).rows[0]?.value
  const oldDefinition=(await db.query("select pg_get_functiondef('app_private.prepare_discovery_cast(text,text,uuid,boolean,boolean)'::regprocedure) definition")).rows[0].definition
  const patch=readFileSync('supabase/migrations/'+migration,'utf8')
  for(const discovery of [false,true])for(const confirm of [false,true]){
   await db.exec(oldDefinition)
   await db.exec('select setseed(.42)')
   const oldOp=crypto.randomUUID(),newOp=crypto.randomUUID()
   await db.query("select app_private.prepare_discovery_cast('pongdang','bait',$1,$2,$3)",[oldOp,confirm,discovery])
   const before=await saved(oldOp)
   await db.exec(patch)
   expect(await saved(oldOp)).toEqual(before)
   // A retry and even a different operation must resume the active old cast.
   for(const op of [oldOp,newOp])await db.query("select app_private.prepare_discovery_cast('pongdang','bait',$1,$2,$3)",[op,confirm,discovery])
   expect(await saved(oldOp)).toEqual(before)
   expect(await saved(newOp)).toBeUndefined()
   await db.query("update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result='{}' where operation_id=$1",[oldOp])
   await db.exec('select setseed(.42)')
   await db.query("select app_private.prepare_discovery_cast('pongdang','bait',$1,$2,$3)",[newOp,confirm,discovery])
   const after=await saved(newOp)
   expect(Number(after.wait_seconds)-Number(before.wait_seconds)).toBeCloseTo(1,8)
   expect(after.snapshot).toEqual(before.snapshot)
   expect((Date.parse(after.expires_at)-Date.parse(after.created_at))/1000).toBeCloseTo(confirm?86400:Number(after.wait_seconds)+180,2)
   await db.query("update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result='{}' where operation_id=$1",[newOp])
  }
 }finally{await db.close()}
},60000)
