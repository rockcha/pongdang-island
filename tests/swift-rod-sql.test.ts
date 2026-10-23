// @vitest-environment node
import {it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
it('sells the swift rod for 1800 once and reduces new manual waits by exactly three seconds',async()=>{
 const db=await createLocalDatabase(),uid='00000000-0000-0000-0000-000000000795'
 try{
  await replayMigrations(db)
  await db.query('insert into auth.users(id) values($1)',[uid])
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid])
  await db.query('select public.fishing_rod_state()')
  await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang') on conflict(user_id) do update set region_id='pongdang'",[uid])
  await db.query("update public.player_wallets set gold=1800,inventory='{\"bait\":100}' where user_id=$1",[uid])
  await expect(db.query("select public.equip_fishing_rod('swift')")).rejects.toThrow(/ROD_NOT_OWNED/)
  const op=crypto.randomUUID()
  await db.query("select public.trade_fishing_rod('swift','buy',$1)",[op])
  await db.query("select public.trade_fishing_rod('swift','buy',$1)",[op])
  expect((await db.query('select gold from public.player_wallets where user_id=$1',[uid])).rows[0].gold).toBe(0)
  const saved=async(id:string)=>(await db.query('select wait_seconds from app_private.prepared_fishing_casts where operation_id=$1',[id])).rows[0]
  await db.query("select public.equip_fishing_rod('basic')");await db.exec('select setseed(.42)')
  const base=crypto.randomUUID()
  await db.query("select public.prepare_fishing('pongdang','bait',$1,true)",[base])
  const before=Number((await saved(base)).wait_seconds)
  await db.query("update app_private.prepared_fishing_casts set finished_at=clock_timestamp(),result='{}' where operation_id=$1",[base])
  await db.query("select public.equip_fishing_rod('swift')");await db.exec('select setseed(.42)')
  const cast=crypto.randomUUID()
  await db.query("select public.prepare_fishing('pongdang','bait',$1,true)",[cast])
  const wait=Number((await saved(cast)).wait_seconds)
  expect(before-wait).toBeCloseTo(3,8)
  expect(wait).toBeGreaterThanOrEqual(9);expect(wait).toBeLessThanOrEqual(21)
  await db.query("select public.equip_fishing_rod('basic')")
  await db.query("select public.prepare_fishing('pongdang','bait',$1,true)",[cast])
  expect(Number((await saved(cast)).wait_seconds)).toBe(wait)
 }finally{await db.close()}
},60000)
