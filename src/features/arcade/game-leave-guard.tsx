import { useContext, useEffect, useState } from 'react'
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {usePwaUpdateBlock} from '@/features/pwa/update-blockers'

/** The data router covers links, programmatic navigation, and browser back/forward. */
export function GameLeaveGuard({active,practice,description,portalContainer,onBeforeLeave}:{active:boolean;practice:boolean;description?:string;portalContainer?:HTMLElement|null;onBeforeLeave?:()=>void|Promise<void>}) {
 usePwaUpdateBlock(active)
 const router=useContext(UNSAFE_DataRouterContext)
 useEffect(()=>{
  if(!active)return
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
  window.addEventListener('beforeunload',warn)
  return()=>window.removeEventListener('beforeunload',warn)
 },[active])
 return router?<RouteLeaveGuard active={active} practice={practice} description={description} portalContainer={portalContainer} onBeforeLeave={onBeforeLeave}/>:null
}
function RouteLeaveGuard({active,practice,description,portalContainer,onBeforeLeave}:{active:boolean;practice:boolean;description?:string;portalContainer?:HTMLElement|null;onBeforeLeave?:()=>void|Promise<void>}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const blocker=useBlocker(({currentLocation,nextLocation})=>active&&currentLocation.pathname!==nextLocation.pathname)
 async function leave(){if(busy||blocker.state!=='blocked')return;setBusy(true);setError('');try{await onBeforeLeave?.();blocker.proceed()}catch{setError('종료 처리에 실패했어요. 다시 시도해주세요.')}finally{setBusy(false)}}
 return <ConfirmDialog illustration="caution" open={blocker.state==='blocked'} onOpenChange={open=>{if(!open&&!busy&&blocker.state==='blocked')blocker.reset()}} title="게임을 나가시겠습니까?" portalContainer={portalContainer} confirmLabel="나가기" busy={busy} error={error} description={description??(practice?'나가면 연습 진행이 사라져요.':'진행 중인 게임은 돌아와 이어할 수 있지만, 시작된 시간은 계속 흘러요.')} onConfirm={()=>void leave()} />
}
