import {useEffect,useRef,useState} from 'react'
import {Check} from 'lucide-react'
import {toast} from 'sonner'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {boostFriendExpedition} from './api'
import type {FriendExpedition,FriendExpeditionState} from './api'

export function FriendTailwindButton({nickname,status,statusError=false,expanded=false,now,onBoost}:{nickname:string;status?:FriendExpedition;statusError?:boolean;expanded?:boolean;now:number;onBoost:(data:FriendExpeditionState)=>void}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [pending,setPending]=useState<string|null>(null)
 const locked=useRef(false),alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 const sailing=!!status?.expedition_id&&Date.parse(status.returns_at??'')>now
 const available=!statusError&&sailing&&!status?.boosted
 const label=statusError?'확인 불가':!status?'확인 중':!sailing?'통발 없음':status.boosted?'도움 완료':'물고기 유인하기'
 async function send(){
  if(locked.current||!pending)return
  locked.current=true;setBusy(true);setError('')
  try{
   const data=await boostFriendExpedition(pending)
   if(!alive.current)return
   onBoost(data);setOpen(false);setPending(null)
   toast.success(`${nickname}님의 통발에 물고기를 유인했어요.`)
  }catch(cause){if(alive.current){const message=String((cause as {message?:string})?.message??'');setError(message.includes('FRIENDSHIP_REQUIRED')?'현재 친구인 주민의 통발만 도울 수 있어요.':message.includes('EXPEDITION_NOT_SAILING')||message.includes('EXPEDITION_NOT_FOUND')?'이미 수확 준비가 끝난 통발이에요.':message.includes('PGRST202')?'물고기 유인 업데이트가 아직 서버에 반영되지 않았어요.':'물고기를 유인하지 못했어요. 다시 시도해주세요.')}}
  finally{locked.current=false;if(alive.current)setBusy(false)}
 }
 return <>
  <Button variant={expanded?'default':'ghost'} aria-label={`${nickname}님 ${label}`} title={label} disabled={!available||busy} className={expanded?'min-h-14 w-full gap-2 rounded-xl':'h-auto min-h-12 min-w-14 flex-col gap-0 rounded-xl px-1 text-primary disabled:opacity-35'} onClick={()=>{setPending(status!.expedition_id);setError('');setOpen(true)}}>
   {status?.boosted?<Check className="size-6"/>:<img src="/app-icons/fish-trap.png" alt="" className="size-7 object-contain"/>}<span className={expanded?'text-sm':'text-[9px] leading-4'}>{label}</span>
  </Button>
  <ConfirmDialog illustration="trap" open={open} onOpenChange={value=>{if(!busy){setOpen(value);if(!value)setPending(null)}}} title={`${nickname}님의 통발에 물고기를 유인할까요?`} description="수확이 10분 빨라져요. 남은 시간이 10분 이하면 바로 수확할 수 있어요. 같은 통발에는 한 번만 도울 수 있어요." busy={busy} error={error} onConfirm={()=>void send()}/>
 </>
}
