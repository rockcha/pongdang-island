// @vitest-environment node
import {beforeAll, beforeEach, afterAll, it, expect} from 'vitest'
import {createLocalDatabase, replayMigrations} from '../scripts/db/local.mjs'
let db:any
const user='00000000-0000-0000-0000-000000000893',other='00000000-0000-0000-0000-000000000894'
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);for(const id of [user,other])await db.query('insert into auth.users(id) values($1)',[id])},60000)
afterAll(async()=>{await db?.close()})
beforeEach(async()=>{await db.exec('truncate public.notifications,app_private.production_sites,app_private.production_operations,public.gold_transactions');await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,100000,'{}') on conflict(user_id) do update set gold=100000,inventory='{}'",[user])})
async function rpc(sql:string,args:unknown[],owner=user){await db.exec('set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);return (await db.query(sql,args)).rows[0].result}finally{await db.exec('reset role')}}
const buy=(facility='tin-grandpa-hearth',quantity=1,op=crypto.randomUUID())=>rpc('select public.production_purchase($1,$2,$3) result',[facility,quantity,op])
const act=(action:string,facility:string,op=crypto.randomUUID(),owner=user)=>rpc('select public.production_action($1,$2,$3) result',[action,op,facility],owner)
it('allows mixed facilities beyond four across both purchase APIs and replays purchases once',async()=>{
 await buy('tin-grandpa-hearth',2);await act('buy','shell-coal-mini-kiln')
 expect((await buy('dock-grandma-refining-pot',2)).sites).toHaveLength(5)
 const op=crypto.randomUUID(),r=await buy('dock-grandma-refining-pot',1,op)
 expect(r.sites).toHaveLength(6)
 expect(r.sites.filter((s:any)=>s.kind==='trash')).toHaveLength(3)
 expect((await buy('dock-grandma-refining-pot',1,op)).gold).toBe(r.gold)
 expect((await buy('otter-hand-press')).sites).toHaveLength(7)
 expect((await act('buy','tin-grandpa-hearth')).sites).toHaveLength(8)
})
it.each(['tin-grandpa-hearth','dock-grandma-refining-pot'])('allows all four sites of one category: %s',async facility=>{
 const result=await buy(facility,4)
 expect(result.sites).toHaveLength(4)
 expect(new Set(result.sites.map((s:any)=>s.kind)).size).toBe(1)
 expect((await buy()).sites).toHaveLength(5)
})
it.each([['tin-grandpa-hearth',400],['shell-coal-mini-kiln',175]] as const)('refunds half exactly once, protects another owner and frees a purchase slot: %s',async(facility,refund)=>{
 const r=await buy(facility,2),id=r.sites[0].siteId,op=crypto.randomUUID()
 await expect(act('sell',id,crypto.randomUUID(),other)).rejects.toThrow(/NOT_OWNED/)
 const sold=await act('sell',id,op)
 expect(sold.gold).toBe(r.gold+refund);expect(sold.sites).toHaveLength(1)
 expect((await act('sell',id,op)).gold).toBe(sold.gold)
 await expect(act('sell',id)).rejects.toThrow(/NOT_OWNED/)
 await expect(act('claim',id,op)).rejects.toThrow(/OPERATION_CONFLICT/)
 expect((await buy('shell-coal-mini-kiln')).sites).toHaveLength(2)
 expect((await db.query("select count(*)::int n from public.gold_transactions where action='sell'")).rows[0].n).toBe(1)
})
it('preserves legacy excess sites and prevents sale until running or ready output is handled',async()=>{
 await db.query("insert into app_private.production_sites(user_id,facility_id) select $1,'tin-grandpa-hearth' from generate_series(1,5)",[user])
 expect((await buy()).sites).toHaveLength(6)
 const sites=(await db.query('select id from app_private.production_sites where user_id=$1',[user])).rows
 await db.query("update app_private.production_sites set started_at=now()-interval '1 hour',completes_at=now()-interval '1 minute',expires_at=now()+interval '1 hour',run_output=1 where id=$1",[sites[0].id])
 await expect(act('sell',sites[0].id)).rejects.toThrow(/BUSY/)
 await act('claim',sites[0].id);await act('sell',sites[0].id)
 expect((await buy()).sites).toHaveLength(6)
 await act('sell',sites[1].id);expect((await buy()).sites).toHaveLength(6)
})
