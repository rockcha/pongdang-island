// @vitest-environment node
import {afterAll,afterEach,beforeAll,beforeEach,expect,it} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:any,owner:string,other:string
const relic='sleepless-harvest-bell'
async function asUser(user:string,sql:string,args:unknown[]=[]){
 await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);await db.exec('set role authenticated')
 try{return (await db.query(sql,args)).rows[0]?.result}finally{await db.exec('reset role').catch(()=>{})}
}
const equip=(id:string|null=relic)=>asUser(owner,'select public.equip_relic($1,$2) result',[id,crypto.randomUUID()])
async function worker(){await db.query("select set_config('request.jwt.claim.sub','',true)");return (await db.query('select app_private.auto_claim_due_production() n')).rows[0].n}
async function inventory(user=owner){return (await db.query('select inventory from public.player_wallets where user_id=$1',[user])).rows[0].inventory}
async function run(kind='fuel',user=owner,output=12,phase='ready'){
 const table=kind==='fuel'?'production_sites':'bait_production_sites',id=crypto.randomUUID()
 await db.query(`insert into app_private.${table}(id,user_id,facility_id,started_at,completes_at,expires_at,run_output${kind==='bait'?',run_bait_id':''})
 values($1,$2,$3,clock_timestamp()-interval '2 hours',clock_timestamp()+$4::interval,clock_timestamp()+$5::interval,$6${kind==='bait'?',\'bait\'':''})`,[id,user,kind==='fuel'?'tin-grandpa-hearth':'wriggly-soil-box',phase==='working'?'30 minutes':'-1 minute',phase==='expired'?'-1 second':'1 hour',output])
 return id
}
async function rejected(fn:()=>Promise<unknown>,message:string){await db.exec('savepoint rejected');await expect(fn()).rejects.toThrow(message);await db.exec('rollback to rejected;reset role')}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db)},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{
 await db.exec('begin');owner=crypto.randomUUID();other=crypto.randomUUID()
 for(const u of [owner,other]){
  await db.query('insert into auth.users(id) values($1)',[u])
  await db.query('insert into public.player_profiles(id,nickname) values($1,$2)',[u,'H'+u.slice(0,7)])
  await db.query(`insert into public.player_wallets(user_id,gold,inventory) values($1,10000,'{"fuel":10,"bait":20}') on conflict(user_id) do update set inventory=excluded.inventory,gold=10000`,[u])
 }
 await db.query('insert into app_private.player_fishing_relics(user_id,relic_id) values($1,$2)',[owner,relic])
})
afterEach(async()=>{await db.exec('rollback;reset role')})
it('registers a normal catchable epic relic with the existing epic sale value and real transparent artwork',async()=>{
 const r=(await db.query('select * from public.fishing_relics where id=$1',[relic])).rows[0]
 expect(r).toMatchObject({name:'잠들지 않는 수확종',rarity:'epic',enabled:true,effect_kind:'production_auto_claim',sell_price:1300})
 expect(Number(r.effect_value)).toBe(1)
 const png=readFileSync('assets/storage-upload/new/20261026-103604/relics/epic/sleepless-harvest-bell_v1_thumbnail.png')
 expect(png.subarray(0,8)).toEqual(Buffer.from([137,80,78,71,13,10,26,10]));expect(png.readUInt32BE(16)).toBe(512)
 await rejected(()=>db.query("insert into public.fishing_relics(id,name,rarity,thumbnail_path,effect_kind,effect_value) values('bad-auto','Bad','rare','bad.png','production_auto_claim',1)"),'relic_effect_shape')
})
it('collects both production snapshots offline once and leaves working, expired and unequipped owners untouched',async()=>{
 await equip();const fuel=await run(),bait=await run('bait',owner,17),working=await run('fuel',owner,4,'working'),expired=await run('bait',owner,9,'expired'),unowned=await run('fuel',other,99)
 expect(await worker()).toBe(2);expect(await inventory()).toEqual({fuel:22,bait:37});expect(await inventory(other)).toEqual({fuel:10,bait:20})
 expect(await worker()).toBe(0)
 const rows=(await db.query('select id,started_at from app_private.production_sites where id=any($1)',[[fuel,working,unowned]])).rows
 expect(rows.find((s:any)=>s.id===fuel).started_at).toBeNull();expect(rows.find((s:any)=>s.id===working).started_at).not.toBeNull();expect(rows.find((s:any)=>s.id===unowned).started_at).not.toBeNull()
 expect((await db.query('select started_at from app_private.bait_production_sites where id=$1',[bait])).rows[0].started_at).toBeNull()
 expect((await db.query('select started_at from app_private.bait_production_sites where id=$1',[expired])).rows[0].started_at).not.toBeNull()
 expect((await db.query('select * from app_private.production_auto_claims where user_id=$1',[owner])).rows).toHaveLength(2)
 const notices=(await db.query("select * from public.notifications where recipient_id=$1 and title='수확종이 생산물을 챙겼어요'",[owner])).rows
 expect(notices).toHaveLength(1);expect(notices[0].body).toContain('연료 12개');expect(notices[0].body).toContain('미끼 17개')
})
it('settles already ready products on equip and before removal, then stops after unequip',async()=>{
 await run();await equip();expect(await inventory()).toEqual({fuel:22,bait:20})
 await run('bait',owner,7);await equip(null);expect(await inventory()).toEqual({fuel:22,bait:27})
 await run('fuel',owner,3);expect(await worker()).toBe(0);expect(await inventory()).toEqual({fuel:22,bait:27})
})
it('does not revive expired products when equipping or disabling the relic',async()=>{
 const expired=await run('fuel',owner,15,'expired');await equip();expect(await worker()).toBe(0);expect((await db.query('select started_at from app_private.production_sites where id=$1',[expired])).rows[0].started_at).not.toBeNull()
 await run('bait',owner,4);await db.query('update public.fishing_relics set enabled=false where id=$1',[relic]);expect(await worker()).toBe(0)
})
it('keeps capped rewards intact, still claims another item, and retries fully after inventory space is freed',async()=>{
 await equip();const fuel=await run('fuel',owner,12);await run('bait',owner,17)
 await db.query(`update public.player_wallets set inventory='{"fuel":999999995,"bait":20}' where user_id=$1`,[owner])
 expect(await worker()).toBe(1);expect(await inventory()).toEqual({fuel:999999995,bait:37})
 expect((await db.query('select started_at from app_private.production_sites where id=$1',[fuel])).rows[0].started_at).not.toBeNull()
 await db.query(`update public.player_wallets set inventory=jsonb_set(inventory,'{fuel}','999999988') where user_id=$1`,[owner])
 expect(await worker()).toBe(1);expect(await inventory()).toEqual({fuel:1000000000,bait:37});expect(await worker()).toBe(0)
})
it('shares serialization with manual claims and never pays a run twice in either ordering',async()=>{
 await equip();const manual=await run(),op=crypto.randomUUID()
 await asUser(owner,"select public.production_action('claim',$1,$2) result",[op,manual])
 await asUser(owner,"select public.production_action('claim',$1,$2) result",[op,manual])
 expect(await worker()).toBe(0);expect((await inventory()).fuel).toBe(22)
 const automatic=await run();expect(await worker()).toBe(1);expect((await inventory()).fuel).toBe(34)
 await rejected(()=>asUser(owner,"select public.production_action('claim',$1,$2) result",[crypto.randomUUID(),automatic]),'PRODUCTION_IDLE')
 expect((await inventory()).fuel).toBe(34)
})
it('uses the stored item/output instead of edited facilities and records new runs independently',async()=>{
 await equip();const bait=await run('bait',owner,17)
 await db.query("update public.bait_production_facilities set output_count=999,bait_id='bait_cloud_dough' where id='wriggly-soil-box'")
 expect(await worker()).toBe(1);expect(await inventory()).toEqual({fuel:10,bait:37})
 await db.query("update app_private.bait_production_sites set started_at=clock_timestamp()-interval '1 hour',completes_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '1 hour',run_output=3,run_bait_id='bait' where id=$1",[bait])
 expect(await worker()).toBe(1);expect((await inventory()).bait).toBe(40)
 const recorded=(await db.query("select amount,item_id from app_private.production_auto_claims where site_id=$1 order by started_at",[bait])).rows
 expect(recorded).toEqual([{amount:17,item_id:'bait'},{amount:3,item_id:'bait'}])
})
it('returns auto collection in the existing state API without exposing another account or allowing direct worker access',async()=>{
 await equip();await run();await run('bait',owner,17);await run('fuel',other,99)
 const state=await asUser(owner,'select public.production_state() result');expect(state.autoClaim).toBe(true);expect(state.fuel).toBe(22)
 const inbox=await asUser(owner,'select public.notification_inbox() result');expect(inbox.notifications.some((n:any)=>n.production_auto_claim===true)).toBe(true)
 expect((await asUser(owner,'select public.bait_production_state() result')).autoClaim).toBe(true)
 expect(await inventory(other)).toEqual({fuel:10,bait:20})
 await rejected(()=>asUser(other,'select app_private.auto_claim_production($1) result',[owner]),'permission denied')
 await rejected(()=>asUser(other,'select * from app_private.production_auto_claims'),'permission denied')
 await rejected(()=>asUser(other,'select app_private.auto_claim_due_production() result'),'permission denied')
 expect((await asUser(other,'select public.production_state() result')).autoClaim).toBe(false)
})
it('passes the identical synthetic rollback fixture used for remote deployment verification',async()=>{
 await db.exec(readFileSync('tests/fixtures/harvest-bell-smoke.sql','utf8'))
})
