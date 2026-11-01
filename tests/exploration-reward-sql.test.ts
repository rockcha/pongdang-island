// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {newExplorationModel} from '../src/features/exploration/server-engine'
let db:any
const a='00000000-0000-0000-0000-000000008901',b='00000000-0000-0000-0000-000000008902'
async function commit(uid:string,run:string,op:string,request:object,revision:number,model:unknown,role='service_role'){
 await db.exec('set role '+role)
 try{return (await db.query('select public.exploration_server_commit($1,$2,$3,$4,$5,$6) r',[uid,run,op,request,revision,model])).rows[0].r}
 finally{await db.exec('reset role')}
}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);for(const id of [a,b])await db.query('insert into auth.users(id) values($1)',[id])},60000)
afterAll(async()=>{await db?.close()})
it('allows only the server to commit state and atomically pays 2000 exactly once',async()=>{
 const id=crypto.randomUUID(),start=crypto.randomUUID(),op=crypto.randomUUID(),initial=newExplorationModel(()=>0)
 for(const role of ['anon','authenticated'])await expect(commit(a,id,start,{type:'start'},-1,initial,role)).rejects.toThrow(/permission denied/)
 const started=await commit(a,id,start,{type:'start'},-1,initial)
 expect(await commit(a,id,start,{type:'start'},-1,initial)).toEqual(started)
 const invalid={...initial,state:{...initial.state,completed:true}}
 await expect(commit(a,id,op,{type:'descend'},0,invalid)).rejects.toThrow(/INCOMPLETE/)
 expect((await db.query('select revision from app_private.exploration_runs where id=$1',[id])).rows[0].revision).toBe(0)
 const completed={...initial,state:{...initial.state,market:{...initial.state.market,floor:50},completed:true,finalBossDefeated:true,combat:{monsterId:'golden-pharaoh',enemyHp:0,status:'won',turn:20,lootClaimed:true}}}
 const before=(await db.query('select gold from public.player_wallets where user_id=$1',[a])).rows[0]?.gold??0
 const result=await commit(a,id,op,{type:'descend'},0,completed)
 expect(result).toMatchObject({revision:1,rewardGold:2000})
 const gold=(await db.query('select gold from public.player_wallets where user_id=$1',[a])).rows[0].gold
 expect(gold).toBe(before+2000)
 await db.query('update public.player_wallets set gold=gold+17 where user_id=$1',[a])
 expect(await commit(a,id,op,{type:'descend'},0,completed)).toEqual(result)
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[a])).rows[0].gold).toBe(gold+17)
 await expect(commit(a,id,crypto.randomUUID(),{type:'descend'},1,completed)).rejects.toThrow(/RUN_CLOSED/)
 expect((await db.query('select count(*)::int n from public.gold_transactions where user_id=$1 and operation_id=$2',[a,id])).rows[0].n).toBe(1)
})
it('isolates owners, rejects stale writes and conflicting retries, and closes superseded runs',async()=>{
 const id=crypto.randomUUID(),op=crypto.randomUUID(),initial=newExplorationModel(()=>0)
 await commit(b,id,op,{type:'start'},-1,initial)
 await expect(commit(a,id,crypto.randomUUID(),{type:'descend'},0,initial)).rejects.toThrow(/RUN_NOT_FOUND/)
 await expect(commit(b,id,op,{type:'different'},-1,initial)).rejects.toThrow(/OPERATION_CONFLICT/)
 await commit(b,id,crypto.randomUUID(),{type:'spell',id:'absent'},0,initial)
 await expect(commit(b,id,crypto.randomUUID(),{type:'door',index:0},0,initial)).rejects.toThrow(/REVISION_CONFLICT/)
 await commit(b,crypto.randomUUID(),crypto.randomUUID(),{type:'start'},-1,initial)
 await expect(commit(b,id,crypto.randomUUID(),{type:'descend'},1,initial)).rejects.toThrow(/RUN_CLOSED/)
 await db.exec('set role authenticated')
 try{await expect(db.query('select * from app_private.exploration_runs')).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
})
