import {beforeAll,afterAll,expect,it} from 'vitest'
import {randomUUID} from 'node:crypto'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {initialAccountFarm} from '@/features/farm/account-engine'
let db:Awaited<ReturnType<typeof createLocalDatabase>>
const owner=randomUUID(),other=randomUUID(),seed=initialAccountFarm()
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);await db.query('insert into auth.users(id) values($1),($2)',[owner,other]);await db.query('insert into public.player_wallets(user_id,gold) values($1,10000) on conflict(user_id) do update set gold=10000',[owner])},120000)
afterAll(async()=>{await db?.close()})
async function snapshot(uid=owner){return (await db.query<{s:any}>('select public.topview_farm_snapshot($1,$2) s',[uid,JSON.stringify(seed)])).rows[0].s}
async function commit(s:any,delta:number,id=randomUUID(),command={type:'buy'},state={...s.state,gold:s.state.gold+delta}){return (await db.query<{s:any}>('select public.topview_farm_commit($1,$2,$3,$4,$5,$6,$7) s',[owner,id,JSON.stringify(command),s.revision,s.state.gold,JSON.stringify(state),delta])).rows[0].s}

it('loads the real wallet with a persistent isolated farm, without minting practice money',async()=>{
 const s=await snapshot();expect(s.state.gold).toBe(10000);expect(s.wallet.gold).toBe(10000);expect((await snapshot()).revision).toBe(s.revision)
 const theirs=await snapshot(other);expect(theirs.wallet.gold).toBe(0);expect(theirs.state.gold).toBe(0)
})
it('commits gold and save together and makes an ambiguous retry exactly once',async()=>{
 const s=await snapshot(),id=randomUUID(),r=await commit(s,-2000,id)
 expect(r.wallet.gold).toBe(8000);expect(r.revision).toBe(s.revision+1);expect(r.receipt.applied).toBe(true)
 const retry=await commit(s,-2000,id);expect(retry.wallet.gold).toBe(8000);expect(retry.receipt.applied).toBe(false)
 await expect(commit(s,-2000,id,{type:'buyLand'})).rejects.toThrow('OPERATION_CONFLICT')
 expect((await db.query<{n:number}>('select count(*)::int n from public.gold_transactions where user_id=$1 and operation_id=$2',[owner,id])).rows[0].n).toBe(1)
})
it('rejects stale gold, stale revision and insufficient funds without changing the wallet or farm',async()=>{
 const s=await snapshot()
 await expect(commit({...s,revision:s.revision-1},-1)).rejects.toThrow('FARM_STATE_CONFLICT')
 await expect(commit({...s,state:{...s.state,gold:s.state.gold+1}},-1)).rejects.toThrow('FARM_STATE_CONFLICT')
 await expect(commit(s,-20000)).rejects.toThrow('INSUFFICIENT_GOLD')
 await expect(commit(s,-100,randomUUID(),{type:'buy'},{...s.state,gold:s.state.gold})).rejects.toThrow('INVALID_FARM_STATE')
 expect((await snapshot()).wallet.gold).toBe(s.wallet.gold)
})
it('rolls back wallet changes if recording the shared financial receipt fails',async()=>{
 const s=await snapshot(),id=randomUUID()
 await db.query("insert into public.gold_transactions(user_id,operation_id,action,item_id,delta) values($1,$2,'buy','other:purchase',0)",[owner,id])
 await expect(commit(s,-100,id)).rejects.toThrow()
 const current=await snapshot();expect(current.wallet.gold).toBe(s.wallet.gold);expect(current.revision).toBe(s.revision)
})
it('supports a layout undo without reversing a completed purchase or giving money back',async()=>{
 const s=await snapshot(),moved={...s.state,objects:s.state.objects.map((o:any)=>o.kind==='bench'?{...o,x:8,y:10}:o)}
 const r=await commit(s,0,randomUUID(),{type:'move'},moved)
 expect(r.undo).toBeTruthy()
 const undone=await commit(r,0,randomUUID(),{type:'undo'},{...r.undo,gold:r.state.gold,nextId:r.state.nextId})
 expect(undone.wallet.gold).toBe(s.wallet.gold);expect(undone.undo).toBeNull()
 await expect(commit(undone,0,randomUUID(),{type:'undo'})).rejects.toThrow('INVALID_FARM_UNDO')
})
it('denies browser roles all settlement functions and private farm tables',async()=>{
 const rows=(await db.query<{anon:boolean;auth:boolean;service:boolean}>("select has_function_privilege('anon','public.topview_farm_commit(uuid,uuid,jsonb,bigint,integer,jsonb,integer)','execute') anon,has_function_privilege('authenticated','public.topview_farm_snapshot(uuid,jsonb,uuid,jsonb)','execute') auth,has_function_privilege('service_role','public.topview_farm_commit(uuid,uuid,jsonb,bigint,integer,jsonb,integer)','execute') service")).rows[0]
 expect(rows).toEqual({anon:false,auth:false,service:true})
 await db.exec('set role authenticated')
 try{await expect(snapshot(other)).rejects.toThrow('permission denied');await expect(db.query('select * from app_private.topview_farms')).rejects.toThrow('permission denied')}finally{await db.exec('reset role')}
})
