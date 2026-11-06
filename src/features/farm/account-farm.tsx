import {useMemo,useRef,useState} from 'react'
import {useAccountResource} from '@/lib/account-query'
import {readGold} from '@/features/gold/api'
import {randomId} from '@/lib/random-id'
import {TopviewFarm} from './topview-farm'
import {commandAccountFarm,readAccountFarm,FarmAccountError} from './account-api'
import type {FarmCommand} from './account-engine'

export function AccountFarm(){
 const query=useAccountResource('farm',readAccountFarm),wallet=useAccountResource('wallet',readGold)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false)
 const locked=useRef(false),uncertainRef=useRef(false),pending=useRef<{command:FarmCommand;id:string;revision:number}|null>(null)
 const snapshot=useMemo(()=>query.data?{...query.data,state:{...query.data.state,gold:wallet.data?.gold??query.data.wallet.gold}}:null,[query.data,wallet.data?.gold])
 async function execute(command:FarmCommand,retry=false){
  if(locked.current||!snapshot)return null
  if(uncertainRef.current&&!retry)return null
  if(pending.current&&JSON.stringify(command)!==JSON.stringify(pending.current.command)){setError('이전 작업의 결과를 먼저 확인해주세요.');return null}
  locked.current=true;setBusy(true);setError('')
  pending.current??={command,id:randomId(),revision:snapshot.revision}
  try{
   const p=pending.current,result=await commandAccountFarm(p.command,p.revision,p.id)
   pending.current=null;uncertainRef.current=false;setUncertain(false)
   return result
  }catch(cause){
   if(cause instanceof FarmAccountError&&cause.definitive){pending.current=null;uncertainRef.current=false;setUncertain(false);if(cause.code==='FARM_STATE_CONFLICT')await query.refetch()}
   else{uncertainRef.current=true;setUncertain(true)}
   setError(cause instanceof Error?cause.message:'농장을 저장하지 못했어요.')
   return null
  }finally{locked.current=false;setBusy(false)}
 }
 if(!snapshot)return <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center"><p role={query.isError?'alert':'status'}>{query.isError?'농장을 불러오지 못했어요.':'농장을 준비하고 있어요…'}</p>{query.isError&&<button onClick={()=>void query.refetch()}>다시 불러오기</button>}</div>
 return <><TopviewFarm account={{snapshot,busy,now:()=>Date.parse(snapshot.serverNow)+Math.max(0,Date.now()-snapshot.sampledAt),execute:command=>execute(command)}}/>{(error||busy)&&<div className="fixed inset-x-4 top-28 z-[250] mx-auto max-w-sm rounded-xl border bg-background p-3 text-center text-sm shadow-sm" role={error?'alert':'status'}>{busy?'농장을 저장하고 있어요…':error}{uncertain&&!busy&&<button className="mt-2 block w-full rounded-lg bg-primary p-2 text-primary-foreground" onClick={()=>{if(pending.current)void execute(pending.current.command,true)}}>이전 작업 결과 확인</button>}</div>}</>
}
