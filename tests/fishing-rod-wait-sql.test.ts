// @vitest-environment node
import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'
import catalog from '../supabase/catalog/catalog.json'

it('subtracts the equipped owned rod bonus once and preserves existing casts and retries',async()=>{
 const db=await createLocalDatabase(),first='20261022172148_fishing_rod_wait_reduction.sql',uid=crypto.randomUUID()
 try{
  for(const f of migrationFiles().filter(f=>f<first))await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  await db.exec("update app_private.fishing_maintenance set released_at=starts_at;select app_private.fishing_rod_state()")
  await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang') on conflict(user_id) do update set region_id='pongdang'",[uid])
  await db.query('update public.player_wallets set inventory=$1 where user_id=$2',[{bait:1000},uid])
  await db.query("insert into public.player_fishing_rods(user_id,rod_id) select $1,id from public.fishing_rods where id<>'basic'",[uid])
  const legacy=crypto.randomUUID()
  await db.query("select public.prepare_fishing('pongdang','bait',$1,true)",[legacy])
  const saved=async(op:string)=>(await db.query('select to_jsonb(p) value from app_private.prepared_fishing_casts p where operation_id=$1',[op])).rows[0].value
  const before=await saved(legacy)
  for(const f of migrationFiles().filter(f=>f>=first))await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))
  expect(await saved(legacy)).toMatchObject(before)
  await db.query('insert into public.player_fishing_rods(user_id,rod_id) select $1,id from public.fishing_rods on conflict do nothing',[uid])
  await db.query("select public.equip_fishing_rod('calm')")
  await db.query("select public.prepare_fishing('pongdang','bait',$1,true)",[legacy])
  expect(await saved(legacy)).toMatchObject(before)
  await db.exec("update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result='{}'")
  for(const confirm of [false,true]){
   for(const rod of catalog.fishing_rods){
    await db.query('select public.equip_fishing_rod($1)',[rod.id])
    // Keep the same habitat bonus and RNG sequence, changing only the wait bonus.
    await db.query('update public.fishing_rods set wait_reduction_seconds=0 where id=$1',[rod.id])
    await db.exec('select setseed(.42)')
    const control=crypto.randomUUID()
    await db.query("select public.prepare_fishing('pongdang','bait',$1,$2)",[control,confirm])
    const baseWait=Number((await saved(control)).wait_seconds)
    await db.query("update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result='{}' where operation_id=$1",[control])
    await db.query('update public.fishing_rods set wait_reduction_seconds=$1 where id=$2',[rod.wait_reduction_seconds,rod.id])
    await db.exec('select setseed(.42)')
    const op=crypto.randomUUID()
    await db.query("select public.prepare_fishing('pongdang','bait',$1,$2)",[op,confirm])
    const cast=await saved(op),wait=Number(cast.wait_seconds)
    expect(baseWait-wait,rod.id).toBeCloseTo(rod.wait_reduction_seconds,8)
    expect(wait).toBeGreaterThanOrEqual(13-rod.wait_reduction_seconds)
    expect(wait).toBeLessThanOrEqual(25-rod.wait_reduction_seconds)
    const lifetime=(Date.parse(cast.expires_at)-Date.parse(cast.created_at))/1000
    expect(lifetime).toBeCloseTo(confirm?86400:wait+180,2)
    await db.query("select public.equip_fishing_rod('basic')")
    await db.query("select public.prepare_fishing('pongdang','bait',$1,$2)",[op,confirm])
    expect(await saved(op)).toEqual(cast)
    await db.query("update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result='{}' where operation_id=$1",[op])
   }
  }
  await db.query("delete from public.player_fishing_rods where user_id=$1 and rod_id='calm'",[uid])
  await expect(db.query("select public.equip_fishing_rod('calm')")).rejects.toThrow('ROD_NOT_OWNED')
  await db.exec('set role authenticated')
  await expect(db.exec('update public.fishing_rods set wait_reduction_seconds=2')).rejects.toThrow('permission denied')
  await db.exec('reset role')
 }finally{await db.close()}
},60000)
