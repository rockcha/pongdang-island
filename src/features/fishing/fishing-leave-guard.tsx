import { useContext, useEffect, useRef, useState } from 'react'
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {usePwaUpdateBlock} from '@/features/pwa/update-blockers'

type Props={active:boolean;practice:boolean;busy:boolean;onPause:(paused:boolean)=>void;onLeave:()=>Promise<void>}

export function FishingLeaveGuard(props:Props){
 usePwaUpdateBlock(props.active)
 const router=useContext(UNSAFE_DataRouterContext)
 useEffect(()=>{
  if(!props.active)return
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
  window.addEventListener('beforeunload',warn)
  return()=>window.removeEventListener('beforeunload',warn)
 },[props.active])
 return router?<RouteLeaveGuard {...props}/>:null
}

function RouteLeaveGuard({active,practice,busy,onPause,onLeave}:Props){
 const blocker=useBlocker(({currentLocation,nextLocation})=>active&&(currentLocation.pathname!==nextLocation.pathname||currentLocation.search!==nextLocation.search))
 const blocked=blocker.state==='blocked'
 const [leaving,setLeaving]=useState(false)
 const [error,setError]=useState('')
 const lock=useRef(false)
 useEffect(()=>{onPause(blocked);return()=>onPause(false)},[blocked,onPause])
 async function leave(){
  if(lock.current||busy||blocker.state!=='blocked')return
  lock.current=true;setLeaving(true);setError('')
  try{await onLeave();blocker.proceed()}
  catch{setError('낚시 정리를 확인하지 못했어요. 다시 시도해 주세요.')}
  finally{lock.current=false;setLeaving(false)}
 }
 return <ConfirmDialog illustration="fishing-leave" open={blocked} onOpenChange={open=>{if(!open&&blocker.state==='blocked'){setError('');blocker.reset()}}} title="낚시를 그만두고 이동할까요?" description={practice?'이동하면 진행 중인 연습이 끝나요.':<>지금 나가면 낚시가 중단돼요.<br/>사용한 미끼 1개는 돌려받을 수 없어요.</>} confirmLabel="그만두고 이동" cancelLabel="계속 낚시하기" busy={leaving} confirmDisabled={busy} error={error} onConfirm={()=>void leave()}/>
}
