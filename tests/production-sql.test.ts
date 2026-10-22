// @vitest-environment node
import {beforeAll,afterAll,beforeEach,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import catalog from '../supabase/catalog/catalog.json'
let db:any
const u='00000000-0000-0000-0000-000000000891',other='00000000-0000-0000-0000-000000000892',facility='tin-grandpa-hearth'
async function asUser(id:string,sql:string,args:unknown[]=[]){await db.exec('set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);return (await db.query(sql,args)).rows}finally{await db.exec('reset role')}}
async function action(kind:string,id=crypto.randomUUID(),materials={}){return (await asUser(u,'select public.production_action($1,$2,$3,$4) result',[kind,id,facility,JSON.stringify(materials)]))[0].result}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);for(const id of [u,other])await db.query('insert into auth.users(id) values($1)',[id])},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{await db.exec('truncate app_private.production_sites,app_private.production_operations');await db.query('delete from public.gold_transactions where user_id=$1',[u]);await db.query('delete from public.player_collectibles where user_id=$1',[u]);await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,10000,'{\"fuel\":3,\"bait\":2}') on conflict(user_id) do update set gold=10000,inventory=excluded.inventory",[u])})
it('supports repeat purchases, replays without charging and protects private tables',async()=>{
 const op=crypto.randomUUID(),r=await action('buy',op)
 expect(r.gold).toBe(9200);expect(r.facilities.find((f:any)=>f.id===facility).owned).toBe(true)
 expect((await action('buy',op)).replayed).toBe(true)
 expect((await action('buy')).facilities.find((f:any)=>f.id===facility).ownedCount).toBe(2)
 await expect(action('start',op)).rejects.toThrow(/OPERATION_CONFLICT/)
 await expect(asUser(u,'select * from app_private.production_sites')).rejects.toThrow(/permission denied/)
 const stranger=(await asUser(other,'select public.production_state() result'))[0].result
 expect(stranger.facilities.some((f:any)=>f.owned)).toBe(false)
 await db.exec('set role anon');try{await expect(db.query('select public.production_state()')).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
})
async function add(species='shared-drift-scrap-wood',count=4){await db.query('insert into public.player_collectibles(user_id,species_id) select $1,$2 from generate_series(1,$3)',[u,species,count])}
it('runs every fish refinery with exact fish consumption, timing, payout and idempotent receipts',async()=>{
 const fish=catalog.production_facilities.filter(f=>f.kind==='fish')
 expect(fish).toHaveLength(18)
 await db.query('update public.player_wallets set gold=100000 where user_id=$1',[u])
 await add('shared-drift-scrap-wood',100)
 let fuel=3
 for(const f of fish){
  const run=async(kind:string,op=crypto.randomUUID(),materials={})=>(await asUser(u,'select public.production_action($1,$2,$3,$4) result',[kind,op,f.id,JSON.stringify(materials)]))[0].result
  await run('buy')
  await expect(run('start',crypto.randomUUID(),{'shared-drift-scrap-wood':f.input_count})).rejects.toThrow(/INSUFFICIENT_MATERIALS/)
  await add('shared-refining-smelt',f.input_count)
  const op=crypto.randomUUID(),materials={'shared-refining-smelt':f.input_count}
  const started=await run('start',op,materials),site=started.facilities.find((s:any)=>s.id===f.id)
  expect(new Date(site.completesAt).getTime()-new Date(site.startedAt).getTime()).toBe(f.production_minutes*60000)
  expect(new Date(site.expiresAt).getTime()-new Date(site.completesAt).getTime()).toBe(f.storage_minutes*60000)
  expect(site.runOutput).toBe(f.output_count)
  expect((await run('start',op,materials)).replayed).toBe(true)
  await expect(run('claim')).rejects.toThrow(/NOT_READY/)
  await db.query("update app_private.production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()+interval '1 hour' where user_id=$1 and facility_id=$2",[u,f.id])
  const receipt=crypto.randomUUID();fuel+=f.output_count
  expect((await run('claim',receipt)).fuel).toBe(fuel)
  expect((await run('claim',receipt)).fuel).toBe(fuel)
 }
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and consumed_at is not null',[u])).rows[0].n).toBe(fish.reduce((n,f)=>n+f.input_count,0))
 expect((await db.query("select count(*)::int n from public.player_collectibles where user_id=$1 and species_id='shared-drift-scrap-wood' and consumed_at is null",[u])).rows[0].n).toBe(100)
})
it('consumes exactly the selected stored materials, snapshots output and cannot claim early',async()=>{
 await action('buy');await add();await add('shared-reclaimed-oil-can',2)
 const op=crypto.randomUUID();await action('start',op,{'shared-drift-scrap-wood':3,'shared-reclaimed-oil-can':1})
 expect((await action('start',op,{'shared-drift-scrap-wood':3,'shared-reclaimed-oil-can':1})).replayed).toBe(true)
 const consumed=(await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and consumed_at is not null and sold_at is not null',[u])).rows[0].n
 expect(consumed).toBe(4)
 await expect(action('claim')).rejects.toThrow(/NOT_READY/)
 await expect(action('start',crypto.randomUUID(),{'shared-drift-scrap-wood':4})).rejects.toThrow(/BUSY/)
 const run=(await db.query('select * from app_private.production_sites where user_id=$1',[u])).rows[0]
 expect(new Date(run.expires_at).getTime()-new Date(run.completes_at).getTime()).toBe(90*60000)
})
it('rejects invalid quantities, wrong-kind and unavailable materials atomically',async()=>{
 await action('buy');await add('shared-refining-smelt',4)
 await expect(action('start',crypto.randomUUID(),{'shared-refining-smelt':4})).rejects.toThrow(/INSUFFICIENT_MATERIALS/)
 await add();await expect(action('start',crypto.randomUUID(),{'shared-drift-scrap-wood':3})).rejects.toThrow(/INVALID_MATERIAL_COUNT/)
 await expect(action('start',crypto.randomUUID(),{'shared-drift-scrap-wood':-4})).rejects.toThrow(/INVALID_MATERIALS/)
 await db.query('update public.player_collectibles set sold_at=now() where user_id=$1 and species_id=$2',[u,'shared-drift-scrap-wood'])
 await expect(action('start',crypto.randomUUID(),{'shared-drift-scrap-wood':4})).rejects.toThrow(/INSUFFICIENT_MATERIALS/)
 expect((await db.query('select count(*)::int n from public.player_collectibles where consumed_at is not null')).rows[0].n).toBe(0)
})
async function shift(expired=false){await db.query("update app_private.production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()+case when $2 then interval '-1 minute' else interval '30 minutes' end where user_id=$1",[u,expired])}
it('claims once, keeps other inventory and allows another cycle',async()=>{
 await action('buy');await add();await action('start',crypto.randomUUID(),{'shared-drift-scrap-wood':4});await shift()
 const op=crypto.randomUUID();expect((await action('claim',op)).fuel).toBe(4);expect((await action('claim',op)).fuel).toBe(4)
 expect((await db.query('select inventory from public.player_wallets where user_id=$1',[u])).rows[0].inventory).toEqual({fuel:4,bait:2})
 await expect(action('claim')).rejects.toThrow(/IDLE/)
})
it('expires production without a cron job, blocks receipt and discards once without fuel',async()=>{
 await action('buy');await add();await action('start',crypto.randomUUID(),{'shared-drift-scrap-wood':4})
 await expect(action('discard')).rejects.toThrow(/NOT_EXPIRED/)
 await shift(true);await expect(action('claim')).rejects.toThrow(/EXPIRED/)
 const op=crypto.randomUUID();expect((await action('discard',op)).fuel).toBe(3);expect((await action('discard',op)).replayed).toBe(true)
 expect((await action('discard',op)).facilities.find((f:any)=>f.id===facility).startedAt).toBeNull()
})

const secondFacility='shell-coal-mini-kiln'
async function buyPair(){await action('buy');await asUser(u,'select public.production_action($1,$2,$3)', ['buy',crypto.randomUUID(),secondFacility])}
const pairSteps=(species='shared-drift-scrap-wood')=>[{facility,materials:{[species]:4}},{facility:secondFacility,materials:{[species]:5}}]
async function bulk(kind:string,steps:any[],id=crypto.randomUUID(),allow=false,owner=u){return (await asUser(owner,'select public.production_bulk_action($1,$2,$3,$4) result',[kind,id,JSON.stringify(steps),allow]))[0].result}
it('requires the valuable-material guard for fish batches too and never falls back to other stock',async()=>{
 const targets=['dock-grandma-refining-pot','conch-spiral-distiller']
 for(const id of targets)await asUser(u,'select public.production_action($1,$2,$3)',['buy',crypto.randomUUID(),id])
 const species=(await db.query("select id from public.collectible_species where kind='fish' and rarity='epic' order by id limit 1")).rows[0].id
 await add(species,3);await add('shared-refining-smelt',3);await add('shared-drift-scrap-wood',10)
 const steps=targets.map((facility,i)=>({facility,materials:{[species]:i+1}}))
 await expect(bulk('start',steps)).rejects.toThrow(/VALUABLE_MATERIAL_CONFIRM_REQUIRED/)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and consumed_at is not null',[u])).rows[0].n).toBe(0)
 const op=crypto.randomUUID();await bulk('start',steps,op,true)
 expect((await bulk('start',steps,op,true)).replayed).toBe(true)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and consumed_at is not null and species_id=$2',[u,species])).rows[0].n).toBe(3)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and consumed_at is not null and species_id<>$2',[u,species])).rows[0].n).toBe(0)
})
it('rolls back every site and material if a later site lacks materials',async()=>{
 await buyPair();await add('shared-drift-scrap-wood',8)
 await expect(bulk('start',pairSteps())).rejects.toThrow(/INSUFFICIENT_MATERIALS/)
 expect((await db.query('select count(*)::int n from app_private.production_sites where user_id=$1 and started_at is not null',[u])).rows[0].n).toBe(0)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and consumed_at is not null',[u])).rows[0].n).toBe(0)
})
it('requires confirmation for valuable materials and consumes only the reviewed species',async()=>{
 await buyPair()
 const species=(await db.query("select id from public.collectible_species where kind='trash' and rarity='epic' order by id limit 1")).rows[0].id
 await add(species,9);await add('shared-drift-scrap-wood',9)
 await expect(bulk('start',pairSteps(species))).rejects.toThrow(/VALUABLE_MATERIAL_CONFIRM_REQUIRED/)
 const op=crypto.randomUUID();await bulk('start',pairSteps(species),op,true);expect((await bulk('start',pairSteps(species),op,true)).replayed).toBe(true)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and consumed_at is not null and species_id=$2',[u,species])).rows[0].n).toBe(9)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and consumed_at is not null and species_id=$2',[u,'shared-drift-scrap-wood'])).rows[0].n).toBe(0)
})
it('claims and discards whole batches once, preserving fuel on discard',async()=>{
 await buyPair();await add('shared-drift-scrap-wood',18);const steps=pairSteps()
 await bulk('start',steps);await shift()
 const targets=steps.map(s=>({...s,materials:{}})),claim=crypto.randomUUID()
 expect((await bulk('claim',targets,claim)).fuel).toBe(5);expect((await bulk('claim',targets,claim)).fuel).toBe(5)
 await bulk('start',steps);await shift(true)
 await expect(bulk('claim',targets)).rejects.toThrow(/EXPIRED/)
 const discard=crypto.randomUUID();expect((await bulk('discard',targets,discard)).fuel).toBe(5);expect((await bulk('discard',targets,discard)).replayed).toBe(true)
})
it('rejects duplicate targets, another owner, anonymous calls and operation conflicts',async()=>{
 await buyPair();await add('shared-drift-scrap-wood',9)
 await expect(bulk('start',[pairSteps()[0],pairSteps()[0]])).rejects.toThrow(/INVALID_PRODUCTION/)
 await expect(bulk('start',pairSteps(),crypto.randomUUID(),false,other)).rejects.toThrow(/NOT_OWNED/)
 const op=crypto.randomUUID();await bulk('start',pairSteps(),op)
 await expect(bulk('discard',pairSteps().map(s=>({...s,materials:{}})),op)).rejects.toThrow(/OPERATION_CONFLICT/)
 await db.exec('set role anon');try{await expect(db.query("select public.production_bulk_action('claim',gen_random_uuid(),'[]')")).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
})
