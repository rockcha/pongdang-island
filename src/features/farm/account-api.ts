import {createClient} from '@/lib/client'
import {accountCommand} from '@/lib/account-command'
import {getQueryAccount,isCurrentAccount,publishAccountResource} from '@/lib/account-cache'
import type {GoldState} from '@/features/gold/api'
import type {TopviewState} from './topview-model'
import type {FarmCommand} from './account-engine'

export type FarmAccountSnapshot={state:TopviewState;revision:number;serverNow:string;sampledAt:number;wallet:GoldState;undo:TopviewState|null;receipt:{operationId:string;applied:boolean;delta:number}|null}
export type FarmAccountConnection={snapshot:FarmAccountSnapshot;busy:boolean;now:()=>number;execute:(command:FarmCommand)=>Promise<FarmAccountSnapshot|null>}
export class FarmAccountError extends Error{
 readonly definitive:boolean
 readonly code:string
 constructor(message:string,definitive:boolean,code:string){super(message);this.definitive=definitive;this.code=code}
}
async function request(body:Record<string,unknown>,signal?:AbortSignal):Promise<FarmAccountSnapshot>{
 const {data,error}=await createClient().functions.invoke('farm-game',{body,signal})
 if(error){
  let code='FARM_UNAVAILABLE',message='농장을 저장하지 못했어요. 같은 작업의 결과를 다시 확인해주세요.',definitive=false
  const response='context'in error?error.context:undefined
  if(response instanceof Response){
   definitive=response.status>=400&&response.status<500
   try{const problem=await response.json();code=problem.error??code;if(code==='FARM_ACTION_REJECTED'&&problem.message)message=problem.message}catch{/* Transport failures retain the operation ID. */}
  }
  if(code==='FARM_STATE_CONFLICT')message='다른 작업으로 농장이나 골드가 바뀌었어요. 최신 상태를 확인한 뒤 다시 시도해주세요.'
  if(code==='FARM_NOT_RELEASED')message='현재 농장은 운영자만 이용할 수 있어요.'
  throw new FarmAccountError(message,definitive,code)
 }
 return {...data,sampledAt:Date.now()} as FarmAccountSnapshot
}
function publishWallet(data:FarmAccountSnapshot,scope:ReturnType<typeof getQueryAccount>){
 if(!isCurrentAccount(scope))return
 // Farm renders its own centered gold effect. Tell the common wallet provider
 // before publishing so it does not repeat the same visual notification.
 if(scope)window.dispatchEvent(new CustomEvent('pongdang-island-gold-effect',{detail:{owner:scope.owner,gold:data.wallet.gold}}))
 publishAccountResource('wallet',data.wallet,scope)
}
export async function readAccountFarm(signal:AbortSignal){
 const scope=getQueryAccount(),data=await request({},signal)
 if(!signal.aborted)publishWallet(data,scope)
 return data
}
export function commandAccountFarm(command:FarmCommand,revision:number,operationId:string){
 const scope=getQueryAccount()
 return accountCommand(()=>request({command,revision,operationId}),{resource:'farm',after:data=>publishWallet(data,scope)})
}
