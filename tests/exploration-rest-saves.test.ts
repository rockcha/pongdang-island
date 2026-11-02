// @vitest-environment node
import {beforeAll,afterAll,it,expect} from 'vitest'
import {createLocalDatabase,replayMigrations} from '../scripts/db/local.mjs'
import {newExplorationModel,newGrowthExplorationModel,applyExplorationAction} from '../src/features/exploration/server-engine'
let db:any
const owner=crypto.randomUUID(),other=crypto.randomUUID()
async function commit(run:string,op:string,revision:number,action:string,model:unknown,user=owner){
 await db.exec('set role service_role')
 try{return (await db.query('select public.exploration_server_commit($1,$2,$3,$4,$5,$6) r',[user,run,op,{type:action},revision,model])).rows[0].r}finally{await db.exec('reset role')}
}
async function saved(user=owner){
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])
 await db.exec('set role authenticated')
 try{return (await db.query('select public.exploration_saved_run() r')).rows[0].r}finally{await db.exec('reset role')}
}
function restModel(){
 let model=newExplorationModel(()=>.99)
 model={...model,state:{...model.state,hp:20,mp:5,market:{...model.state.market,doors:['rest-garden']}}}
 model=applyExplorationAction(model,{type:'door',index:0},0,()=>.99)
 return applyExplorationAction(model,{type:'rest'},0,()=>.99)
}
beforeAll(async()=>{db=await createLocalDatabase();await replayMigrations(db);for(const id of [owner,other])await db.query('insert into auth.users(id) values($1)',[id])},60000)
afterAll(async()=>db?.close())
it('stores and restores growth and starter magic without altering pre-growth saves',async()=>{
 for(const factory of [newExplorationModel,newGrowthExplorationModel]){
  const initial=factory(()=>.99),id=crypto.randomUUID()
  await commit(id,crypto.randomUUID(),-1,'start',initial)
  let model={...initial,state:{...initial.state,market:{...initial.state.market,doors:['rest-garden']}}}
  if(model.state.growth)model=applyExplorationAction(model,{type:'allocate-stat',stat:'attack'})
  model=applyExplorationAction(model,{type:'door',index:0},0,()=>.99)
  const checkpoint=applyExplorationAction(model,{type:'rest'},0,()=>.99)
  await commit(id,crypto.randomUUID(),0,'rest',checkpoint)
  const resumed=await commit(id,crypto.randomUUID(),1,'resume',initial)
  expect(resumed.model).toEqual(JSON.parse(JSON.stringify(checkpoint)))
  expect(resumed.model.state.growth).toEqual(checkpoint.state.growth)
  expect(resumed.model.state.equippedSpells).toEqual(initial.state.equippedSpells)
 }
})
it('saves the current position on leave, resumes it and isolates accounts',async()=>{
 const id=crypto.randomUUID(),initial=newExplorationModel(()=>.99),checkpoint=restModel(),op=crypto.randomUUID()
 await commit(id,crypto.randomUUID(),-1,'start',initial)
 expect(await saved()).toBeNull()
 const paid=await commit(id,op,0,'rest',checkpoint)
 expect(await commit(id,op,0,'rest',checkpoint)).toEqual(paid)
 expect(await saved()).toMatchObject({id,floor:1,revision:1})
 expect(await saved(other)).toBeNull()
 const changed={...checkpoint,state:{...checkpoint.state,hp:10,gold:500,market:{...checkpoint.state.market,floor:5}}}
 await commit(id,crypto.randomUUID(),1,'combat',changed)
 const left=await commit(id,crypto.randomUUID(),2,'leave',changed)
 expect(left).toMatchObject({abandoned:false,revision:3,model:JSON.parse(JSON.stringify(changed))})
 const resumeOp=crypto.randomUUID(),resumed=await commit(id,resumeOp,3,'resume',changed)
 expect(resumed.model).toEqual(JSON.parse(JSON.stringify(changed)))
 expect(await commit(id,resumeOp,3,'resume',changed)).toEqual(resumed)
 await expect(commit(id,crypto.randomUUID(),4,'resume',changed,other)).rejects.toThrow(/RUN_NOT_FOUND/)
 await commit(crypto.randomUUID(),crypto.randomUUID(),-1,'start',initial)
 expect(await saved()).toBeNull()
})
it('saves an alive run on exit without any rest and keeps retries inert',async()=>{
 const initial=newGrowthExplorationModel(()=>.99),id=crypto.randomUUID(),op=crypto.randomUUID()
 await commit(id,crypto.randomUUID(),-1,'start',initial)
 const progressed={...initial,state:{...initial.state,hp:90,market:{...initial.state.market,floor:15}}}
 await commit(id,crypto.randomUUID(),0,'descend',progressed)
 const left=await commit(id,op,1,'leave',{...progressed,state:{...progressed.state,hp:99999}})
 expect(left).toMatchObject({abandoned:false,revision:2,model:{state:{hp:90,market:{floor:15}}}})
 expect(await saved()).toMatchObject({id,floor:15,revision:2})
 expect(await commit(id,op,1,'leave',initial)).toEqual(left)
 expect((await commit(id,crypto.randomUUID(),2,'resume',initial)).model).toEqual(JSON.parse(JSON.stringify(progressed)))
})
it('cannot farm the 50-floor reward by restoring an earlier save and pays only 2000 more at 80',async()=>{
 const initial=newExplorationModel(()=>.99),id=crypto.randomUUID(),rest=restModel()
 await commit(id,crypto.randomUUID(),-1,'start',initial)
 const checkpoint={...rest,state:{...rest.state,market:{...rest.state.market,floor:49}}}
 await commit(id,crypto.randomUUID(),0,'rest',checkpoint)
 const before=(await db.query('select gold from public.player_wallets where user_id=$1',[owner])).rows[0]?.gold??0
 const won={...initial,state:{...initial.state,market:{...initial.state.market,floor:50},combat:{monsterId:'golden-pharaoh',enemyHp:0,status:'won'}}}
 expect(await commit(id,crypto.randomUUID(),1,'combat',won)).toMatchObject({rewardGold:2000})
 expect(await commit(id,crypto.randomUUID(),2,'resume',won)).toMatchObject({rewardGold:2000,model:{state:{market:{floor:49}}}})
 expect(await commit(id,crypto.randomUUID(),3,'combat',won)).toMatchObject({rewardGold:2000})
 const final={...initial,state:{...initial.state,completed:true,finalBossDefeated:true,market:{...initial.state.market,floor:80},combat:{monsterId:'black-sun-aker',enemyHp:0,status:'won'}}}
 expect(await commit(id,crypto.randomUUID(),4,'descend',final)).toMatchObject({rewardGold:4000})
 expect((await db.query('select gold from public.player_wallets where user_id=$1',[owner])).rows[0].gold).toBe(before+4000)
 expect(await saved()).toBeNull()
})
it('cannot resume without a rest save or after death, and cannot write snapshots as a player',async()=>{
 const id=crypto.randomUUID(),initial=newExplorationModel(()=>.99),checkpoint=restModel()
 await commit(id,crypto.randomUUID(),-1,'start',initial)
 await expect(commit(id,crypto.randomUUID(),0,'resume',initial)).rejects.toThrow(/NO_SAVED/)
 await commit(id,crypto.randomUUID(),0,'rest',checkpoint)
 await commit(id,crypto.randomUUID(),1,'combat',{...checkpoint,state:{...checkpoint.state,hp:0}})
 expect(await saved()).toBeNull()
 await expect(commit(id,crypto.randomUUID(),2,'resume',checkpoint)).rejects.toThrow(/NO_SAVED/)
 await db.exec('set role authenticated')
 try{await expect(db.query('update app_private.exploration_runs set saved_model=model')).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
 await db.exec('set role anon')
 try{await expect(db.query('select public.exploration_saved_run()')).rejects.toThrow(/permission denied/)}finally{await db.exec('reset role')}
})
