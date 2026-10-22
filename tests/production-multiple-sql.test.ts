// @vitest-environment node
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {createLocalDatabase,migrationFiles} from '../scripts/db/local.mjs'
let db:any
const user='00000000-0000-0000-0000-000000000881',other='00000000-0000-0000-0000-000000000882',catalog='tin-grandpa-hearth'
// Historical migration contract, including legacy excess ownership. Current limits
// and the upgrade from these sites are covered in production-resale-sql.test.ts.
beforeAll(async()=>{db=await createLocalDatabase();for(const file of migrationFiles().filter(f=>f<'20261022053008'))await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));for(const id of [user,other])await db.query('insert into auth.users(id) values($1)',[id])},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{await db.exec('truncate public.notifications,app_private.production_sites,app_private.production_operations');await db.query('delete from public.player_collectibles where user_id=$1',[user]);await db.query('delete from public.gold_transactions where user_id=$1',[user]);await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,100000,'{\"fuel\":3}') on conflict(user_id) do update set gold=100000,inventory=excluded.inventory",[user])})
async function asUser(sql:string,args:unknown[]=[],owner=user){await db.exec('set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);return (await db.query(sql,args)).rows[0]?.result}finally{await db.exec('reset role')}}
const purchase=(q:any,op=crypto.randomUUID())=>asUser('select public.production_purchase($1,$2,$3) result',[catalog,q,op])
const act=(kind:string,site:string,op=crypto.randomUUID(),materials={})=>asUser('select public.production_action($1,$2,$3,$4) result',[kind,op,site,JSON.stringify(materials)])
async function stock(n:number){await db.query("insert into public.player_collectibles(user_id,species_id) select $1,'shared-drift-scrap-wood' from generate_series(1,$2)",[user,n])}
const bulk=(kind:string,steps:any[],op=crypto.randomUUID())=>asUser('select public.production_bulk_action($1,$2,$3,false) result',[kind,op,JSON.stringify(steps)])
it('buys several independently identified sites, charges once and keeps a replay idempotent',async()=>{
 const op=crypto.randomUUID(),r=await purchase(3,op)
 expect(r.gold).toBe(97600);expect(r.sites).toHaveLength(3);expect(new Set(r.sites.map((s:any)=>s.siteId)).size).toBe(3)
 expect(r.facilities.find((f:any)=>f.id===catalog).ownedCount).toBe(3)
 expect((await purchase(3,op)).gold).toBe(97600);expect((await purchase(3,op)).sites).toHaveLength(3)
 await expect(purchase(2,op)).rejects.toThrow(/OPERATION_CONFLICT/)
 expect((await db.query('select count(*)::int n from public.gold_transactions where user_id=$1',[user])).rows[0].n).toBe(1)
})
it('rejects invalid quantity, insufficient gold and anonymous/private access without a partial purchase',async()=>{
 for(const q of [0,-1,101,null])await expect(purchase(q)).rejects.toThrow(/INVALID_PRODUCTION_QUANTITY/)
 await db.query('update public.player_wallets set gold=1500 where user_id=$1',[user])
 await expect(purchase(2)).rejects.toThrow(/INSUFFICIENT_GOLD/)
 expect((await asUser('select public.production_state() result')).sites).toHaveLength(0)
 await expect(asUser('select app_private.production_site($1) result',[catalog])).rejects.toThrow(/permission denied/)
 await db.exec('set role anon');try{await expect(db.query('select public.production_purchase($1,1,gen_random_uuid())',[catalog])).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
})
it('keeps old purchase receipts valid and rejects ambiguous catalog references instead of choosing a sibling',async()=>{
 const op=crypto.randomUUID();await act('buy',catalog,op);const r=await purchase(2)
 expect((await act('buy',catalog,op)).sites).toHaveLength(3)
 await stock(4)
 await expect(act('start',catalog,crypto.randomUUID(),{'shared-drift-scrap-wood':4})).rejects.toThrow(/PRODUCTION_SITE_REQUIRED/)
 await expect(asUser('select public.production_materials($1) result',[r.sites[0].siteId],other)).rejects.toThrow(/NOT_OWNED/)
 await expect(asUser('select public.production_action($1,$2,$3,$4) result',['start',crypto.randomUUID(),r.sites[0].siteId,JSON.stringify({'shared-drift-scrap-wood':4})],other)).rejects.toThrow(/NOT_OWNED/)
 await act('start',r.sites[0].siteId,crypto.randomUUID(),{'shared-drift-scrap-wood':4})
 const state=await asUser('select public.production_state() result')
 expect(state.sites.filter((s:any)=>s.startedAt)).toHaveLength(1)
})
it('runs duplicate kinds atomically in bulk and claims/discards only the requested instances',async()=>{
 const r=await purchase(3),ids=r.sites.map((s:any)=>s.siteId),steps=ids.map((facility:string)=>({facility,materials:{'shared-drift-scrap-wood':4}}))
 await stock(11);await expect(bulk('start',steps)).rejects.toThrow(/INSUFFICIENT_MATERIALS/)
 expect((await asUser('select public.production_state() result')).sites.every((s:any)=>!s.startedAt)).toBe(true)
 expect((await db.query('select count(*)::int n from public.player_collectibles where user_id=$1 and consumed_at is not null',[user])).rows[0].n).toBe(0)
 await stock(1);const op=crypto.randomUUID();await bulk('start',steps,op);expect((await bulk('start',steps,op)).replayed).toBe(true)
 await db.query("update app_private.production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()+interval '1 hour' where id=$1",[ids[0]])
 await db.query("update app_private.production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()-interval '1 minute' where id=$1",[ids[2]])
 const claim=crypto.randomUUID();expect((await act('claim',ids[0],claim)).fuel).toBe(4);expect((await act('claim',ids[0],claim)).fuel).toBe(4)
 const state=await bulk('discard',[{facility:ids[2],materials:{}}])
 expect(state.fuel).toBe(4);expect(state.sites.find((s:any)=>s.siteId===ids[1]).startedAt).toBeTruthy()
 expect(state.sites.find((s:any)=>s.siteId===ids[2]).startedAt).toBeNull()
})
it('rejects two aliases that refer to the same actual instance',async()=>{
 const r=await purchase(1);await stock(8)
 await expect(bulk('start',[{facility:catalog,materials:{'shared-drift-scrap-wood':4}},{facility:r.sites[0].siteId,materials:{'shared-drift-scrap-wood':4}}])).rejects.toThrow(/INVALID_PRODUCTION/)
 expect((await asUser('select public.production_state() result')).sites[0].startedAt).toBeNull()
})
it('starts more than one hundred owned instances in a single bulk receipt',async()=>{
 await purchase(100);const state=await purchase(1);await stock(404)
 const steps=state.sites.map((s:any)=>({facility:s.siteId,materials:{'shared-drift-scrap-wood':4}}))
 const result=await bulk('start',steps)
 expect(result.receipt.count).toBe(101)
 expect(result.sites.filter((s:any)=>s.startedAt)).toHaveLength(101)
 expect(result.gold).toBe(19200)
},20000)
it('preserves an existing running site and operation receipt while migrating the old composite key',async()=>{
 const legacy=await createLocalDatabase(),name='20261022041313_production_multiple_sites.sql',files=migrationFiles()
 try{
  for(const file of files.slice(0,files.indexOf(name)))await legacy.exec(readFileSync('supabase/migrations/'+file,'utf8'))
  await legacy.query('insert into auth.users(id) values($1)',[user]);await legacy.query("select set_config('request.jwt.claim.sub',$1,false)",[user])
  await legacy.query("insert into public.player_wallets(user_id,gold,inventory) values($1,10000,'{}') on conflict(user_id) do update set gold=10000",[user])
  await legacy.query('select public.production_action($1,$2,$3)',['buy',crypto.randomUUID(),catalog])
  await legacy.query("insert into public.player_collectibles(user_id,species_id) select $1,'shared-drift-scrap-wood' from generate_series(1,4)",[user])
  const op=crypto.randomUUID();await legacy.query('select public.production_action($1,$2,$3,$4)',['start',op,catalog,JSON.stringify({'shared-drift-scrap-wood':4})])
  const before=(await legacy.query('select to_jsonb(s) snapshot from app_private.production_sites s')).rows[0].snapshot
  await legacy.exec(readFileSync('supabase/migrations/'+name,'utf8'))
  const after=(await legacy.query("select to_jsonb(s)-'id' snapshot from app_private.production_sites s")).rows[0].snapshot
  expect(after).toEqual(before)
  const replay=(await legacy.query('select public.production_action($1,$2,$3,$4) result',['start',op,catalog,JSON.stringify({'shared-drift-scrap-wood':4})])).rows[0].result
  expect(replay.replayed).toBe(true);expect(replay.sites).toHaveLength(1);expect(replay.sites[0].startedAt).toBeTruthy()
 }finally{await legacy.close()}
},60000)
