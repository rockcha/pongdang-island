import {createClient} from '@/lib/client'
import {accountCommand} from '@/lib/account-command'
import {invalidateAccountResource,appQueryClient,accountQueryKey,getQueryAccount,isCurrentAccount} from '@/lib/account-cache'
import type {ExplorationAction,ExplorationModel} from './server-engine'
export type ExplorationReceipt={id:string;revision:number;model:ExplorationModel;rewardGold:number;finishedAt:string|null;abandoned:boolean}
export type ExplorationRequest={runId:string;operationId:string;revision:number;action:ExplorationAction|{type:'start'|'leave'}}
async function invoke(body:ExplorationRequest|{runId:string;operationId:string;revision:number;action:{type:'state'}},signal?:AbortSignal):Promise<ExplorationReceipt>{
 const {data,error}=await createClient().functions.invoke<ExplorationReceipt>('exploration-game',{body,signal})
 if(error){
  const response=(error as {context?:Response}).context
  const code=response?await response.clone().json().then(v=>v.error).catch(()=>undefined):undefined
  throw Object.assign(Error(code??error.message),{definitive:!!code&&response?.status!==503})
 }
 if(!data||data.id!==body.runId||!data.model||!Number.isInteger(data.revision)||![0,2000].includes(data.rewardGold))throw Error('INVALID_EXPLORATION_RECEIPT')
 return data
}
export function readExplorationRun(id:string,signal:AbortSignal){return invoke({runId:id,operationId:id,revision:-1,action:{type:'state'}},signal)}
export function commandExploration(request:ExplorationRequest){
 const scope=getQueryAccount()
 return accountCommand(async()=>{
  const receipt=await invoke(request)
  const current=scope&&isCurrentAccount(scope)?appQueryClient.getQueryData<ExplorationReceipt>(accountQueryKey(scope.owner,['exploration-run',request.runId])):undefined
  return current&&current.revision>receipt.revision?current:receipt
 },{resource:['exploration-run',request.runId],invalidate:request.action.type==='start'?[]:['exploration-ranking'],after:receipt=>{if(receipt.rewardGold>0)invalidateAccountResource('wallet')}})
}
