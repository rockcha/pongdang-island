// @vitest-environment node
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
let db:any
const user='00000000-0000-0000-0000-000000009895',other='00000000-0000-0000-0000-000000009896'
async function call(action:string,facility:string,op=crypto.randomUUID(),owner=user){
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated')
 try{return (await db.query('select public.bait_production_action($1,$2,$3,1) r',[action,op,facility])).rows[0].r}finally{await db.exec('reset role')}
}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);await db.query('insert into auth.users(id) values($1),($2)',[user,other])},60000)
beforeEach(async()=>{
 await db.exec('truncate app_private.bait_production_sites,app_private.bait_production_operations')
 await db.query('delete from public.gold_transactions where user_id=$1',[user])
 await db.query("insert into public.player_wallets(user_id,gold,inventory) values($1,10000,'{\"fuel\":100}') on conflict(user_id) do update set gold=10000,inventory=excluded.inventory",[user])
})
afterAll(async()=>await db?.close())
it('refunds half once, removes only the selected site and replays after deletion',async()=>{
 let state=await call('buy','wriggly-soil-box');state=await call('buy','wriggly-soil-box')
 const id=state.sites[0].siteId,op=crypto.randomUUID()
 await expect(call('sell',id,crypto.randomUUID(),other)).rejects.toThrow(/PRODUCTION_NOT_OWNED/)
 const sold=await call('sell',id,op)
 expect(sold.gold).toBe(9550);expect(sold.sites).toHaveLength(1)
 expect(sold.receipt).toMatchObject({action:'sell',siteId:id,gold:150,count:1})
 expect((await call('sell',id,op))).toMatchObject({gold:9550,replayed:true})
 await expect(call('sell',id)).rejects.toThrow(/PRODUCTION_NOT_OWNED/)
 await expect(call('buy','wriggly-soil-box',op)).rejects.toThrow(/OPERATION_CONFLICT/)
 expect((await db.query("select count(*)::int n from public.gold_transactions where user_id=$1 and action='sell' and delta=150",[user])).rows[0].n).toBe(1)
})
it('requires clearing working, ready and expired runs before sale',async()=>{
 const state=await call('buy','wriggly-soil-box'),id=state.sites[0].siteId
 await call('start',id)
 await expect(call('sell',id)).rejects.toThrow(/PRODUCTION_BUSY/)
 await db.query("update app_private.bait_production_sites set started_at=clock_timestamp()-interval '2 hours',completes_at=clock_timestamp()-interval '1 minute',expires_at=clock_timestamp()+interval '1 hour' where id=$1",[id])
 await expect(call('sell',id)).rejects.toThrow(/PRODUCTION_BUSY/)
 await db.query("update app_private.bait_production_sites set expires_at=clock_timestamp()-interval '1 second' where id=$1",[id])
 await expect(call('sell',id)).rejects.toThrow(/PRODUCTION_BUSY/)
 await call('discard',id)
 expect((await call('sell',id)).sites).toHaveLength(0)
})
it('rolls back the sale at the gold limit',async()=>{
 const state=await call('buy','wriggly-soil-box'),id=state.sites[0].siteId
 await db.query('update public.player_wallets set gold=1000000000 where user_id=$1',[user])
 await expect(call('sell',id)).rejects.toThrow(/GOLD_LIMIT/)
 expect((await db.query('select id from app_private.bait_production_sites where id=$1',[id])).rows).toHaveLength(1)
})
