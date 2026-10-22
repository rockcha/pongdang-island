// @vitest-environment node
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:any
const user='00000000-0000-0000-0000-000000007331'
beforeAll(async()=>{
 db=await createLocalDatabase();await replayMigrations(db,{keepScheduledMaintenance:true})
 await db.query("insert into auth.users(id,raw_user_meta_data) values($1,'{\"game_nickname\":\"점검테스트\"}')",[user])
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])
 await db.exec("select public.sync_player_profile();update app_private.fishing_maintenance set starts_at=clock_timestamp()+interval '1 hour'")
 await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,100000,'{\"bait\":10,\"fuel\":100}') on conflict(user_id) do update set gold=excluded.gold,inventory=excluded.inventory",[user])
 await db.query("insert into public.player_navigation(user_id,region_id) values($1,'pongdang') on conflict(user_id) do update set region_id=excluded.region_id",[user])
},60000)
beforeEach(async()=>{await db.exec("update app_private.fishing_maintenance set starts_at=clock_timestamp()+interval '1 hour',released_at=null")})
afterAll(async()=>{await db?.close()})
it('activates at exactly 15:30 KST and only reopens at the explicit release time',async()=>{
 // Use the deployment's actual fixed boundary independently of the test clock.
 await db.exec("update app_private.fishing_maintenance set starts_at='2026-10-22 15:30+09',released_at='2026-10-22 17:00+09'")
 const actual=(await db.query("select app_private.fishing_maintenance_active('2026-10-22 15:29:59+09') b,app_private.fishing_maintenance_active('2026-10-22 15:30+09') s,app_private.fishing_maintenance_active('2026-10-22 16:59:59+09') a,app_private.fishing_maintenance_active('2026-10-22 17:00+09') r")).rows[0]
 expect(actual).toEqual({b:false,s:true,a:true,r:false})
 await db.exec("update app_private.fishing_maintenance set starts_at=clock_timestamp()+interval '1 hour',released_at=null")
})
it('allows purchases before the boundary and atomically rejects both modern and legacy bait purchases during maintenance',async()=>{
 await db.query('select public.buy_fishing_bait($1,$2)',['bait',crypto.randomUUID()])
 const before=(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[user])).rows[0]
 await db.exec("update app_private.fishing_maintenance set starts_at=clock_timestamp()-interval '1 second'")
 await expect(db.query('select public.buy_fishing_bait($1,$2)',['bait',crypto.randomUUID()])).rejects.toThrow(/FISHING_MAINTENANCE/)
 await expect(db.query("select public.trade_gold($1,'buy','bait')",[crypto.randomUUID()])).rejects.toThrow(/FISHING_MAINTENANCE/)
 expect((await db.query('select gold,inventory from public.player_wallets where user_id=$1',[user])).rows[0]).toEqual(before)
})
it('blocks new direct casts without consuming bait and denies changing the gate as an authenticated player',async()=>{
 await db.exec("update app_private.fishing_maintenance set starts_at=clock_timestamp()-interval '1 second'")
 await expect(db.query('select public.prepare_fishing($1,$2,$3)',['pongdang','bait',crypto.randomUUID()])).rejects.toThrow(/FISHING_MAINTENANCE/)
 expect((await db.query('select count(*)::int n from app_private.prepared_fishing_casts where user_id=$1',[user])).rows[0].n).toBe(0)
 await db.exec('set role authenticated')
 try{await expect(db.query('update app_private.fishing_maintenance set released_at=clock_timestamp()')).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
})
it('covers start, claim and friend boost mutations without changing completion or state RPCs',async()=>{
 const rows=(await db.query("select tgname from pg_trigger where not tgisinternal and tgname like 'fishing_maintenance_%' order by tgname")).rows
 expect(rows).toHaveLength(7)
 expect((await db.query('select public.fishing_state() result')).rows[0].result).toBeTruthy()
 await db.exec("update app_private.fishing_maintenance set starts_at=clock_timestamp()-interval '1 second',released_at=clock_timestamp()")
 await expect(db.query('select public.buy_fishing_bait($1,$2)',['bait',crypto.randomUUID()])).resolves.toBeTruthy()
})
it('blocks trap and boat start/claim atomically and preserves existing voyage snapshots',async()=>{
 await db.exec("update app_private.fishing_maintenance set starts_at=clock_timestamp()+interval '1 hour',released_at=null")
 const trap=(await db.query("select public.expedition_action('depart',$1,'dinghy','pongdang','{\"bait\":1}') r",[crypto.randomUUID()])).rows[0].r
 await db.query("select public.harbor_action('buy',$1,'current-rider')",[crypto.randomUUID()])
 const boat=(await db.query("select public.harbor_action('depart',$1,'current-rider') r",[crypto.randomUUID()])).rows[0].r
 await db.exec("update public.fishing_expeditions set departed_at=clock_timestamp()-interval '2 hours',returns_at=clock_timestamp()-interval '1 minute';update public.harbor_voyages set departed_at=clock_timestamp()-interval '2 hours',returns_at=clock_timestamp()-interval '1 minute'")
 const snapshot=async()=>({traps:(await db.query('select to_jsonb(e) row from public.fishing_expeditions e')).rows,boats:(await db.query('select to_jsonb(e) row from public.harbor_voyages e')).rows,wallet:(await db.query('select gold,inventory from public.player_wallets where user_id=$1',[user])).rows})
 const before=await snapshot()
 await db.exec("update app_private.fishing_maintenance set starts_at=clock_timestamp()-interval '1 second'")
 await expect(db.query("select public.expedition_action('claim',$1,null,null,null,$2)",[crypto.randomUUID(),trap.active.id])).rejects.toThrow(/FISHING_MAINTENANCE/)
 await expect(db.query("select public.harbor_action('claim',$1,null,$2)",[crypto.randomUUID(),boat.receipt.voyageId])).rejects.toThrow(/FISHING_MAINTENANCE/)
 await expect(db.query("select public.fishing_expeditions.* from public.fishing_expeditions limit 0")).resolves.toBeTruthy()
 expect(await snapshot()).toEqual(before)
 await expect(db.query("insert into public.fishing_expeditions select * from public.fishing_expeditions limit 1")).rejects.toThrow(/FISHING_MAINTENANCE/)
 await expect(db.query("insert into public.harbor_voyages select * from public.harbor_voyages limit 1")).rejects.toThrow(/FISHING_MAINTENANCE/)
})
