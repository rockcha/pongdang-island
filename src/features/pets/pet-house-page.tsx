import {useRef,useState} from 'react'
import {useAccountResource} from '@/lib/account-query'
import {randomId} from '@/lib/random-id'
import {PetPreviewBoard,type PetHouseCommand} from './pet-preview-page'
import {readPetHouse,commandPetHouse,petError} from './api'
import {useGold} from '@/features/gold/gold-provider'
import type {PetJobCompletion} from './pet-job-completion-dialog'
import {petJobById} from './pet-catalog'

export function PetHousePage(){
 const query=useAccountResource('pet-house',readPetHouse)
 const {wallet}=useGold()
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const [completion,setCompletion]=useState<PetJobCompletion|null>(null)
 const lock=useRef(false),pending=useRef<{command:PetHouseCommand;id:string;claim?:PetJobCompletion}|null>(null)
 async function send(command:PetHouseCommand){
  if(lock.current)return false
  if(pending.current&&JSON.stringify(pending.current.command)!==JSON.stringify(command)){setError('이전 요청 결과를 먼저 확인해주세요.');return false}
  lock.current=true;setBusy(true);setError('')
  const pet=command.type==='claim-job'?query.data?.pets.find(p=>p.id===command.id):undefined
  const request=pending.current??{command,id:randomId(),claim:pet?.job?{pet,reward:pet.job.reward,jobName:petJobById(pet.job.id)?.name??'펫 아르바이트'}:undefined};pending.current=request
  try{const result=await commandPetHouse(request.command,request.id);pending.current=null
   if(request.claim){const returned=result.pets.find(p=>p.id===request.claim!.pet.id);if(returned&&!returned.job)setCompletion({...request.claim,pet:returned})}
   return true}
  catch(cause){if(cause&&typeof cause==='object'&&'code' in cause&&/^[0-9A-Z]{5}$/.test(String(cause.code)))pending.current=null;setError(petError(cause));return false}
  finally{lock.current=false;setBusy(false)}
 }
 if(!query.data)return <div className="p-6 text-sm" role="status">{query.error?'펫 하우스를 불러오지 못했어요.':'친구들을 불러오는 중…'}{query.error&&<button onClick={()=>void query.refetch()}>다시 불러오기</button>}</div>
 return <><PetPreviewBoard owner="live" live={{state:{...query.data,gold:wallet.gold,food:wallet.inventory.pet_food??0},busy,error,send,completion,onDismissCompletion:()=>setCompletion(null)}}/>{pending.current&&error&&<button className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-background p-3 text-sm shadow" disabled={busy} onClick={()=>void send(pending.current!.command)}>이전 요청 결과 다시 확인</button>}</>
}
