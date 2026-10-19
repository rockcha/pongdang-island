import { useContext, useEffect } from 'react'
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router'
import { ConfirmDialog } from '@/components/confirm-dialog'

/** The data router covers links, programmatic navigation, and browser back/forward. */
export function GameLeaveGuard({active,practice,description}:{active:boolean;practice:boolean;description?:string}) {
 const router=useContext(UNSAFE_DataRouterContext)
 useEffect(()=>{
  if(!active)return
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''}
  window.addEventListener('beforeunload',warn)
  return()=>window.removeEventListener('beforeunload',warn)
 },[active])
 return router?<RouteLeaveGuard active={active} practice={practice} description={description}/>:null
}
function RouteLeaveGuard({active,practice,description}:{active:boolean;practice:boolean;description?:string}) {
 const blocker=useBlocker(({currentLocation,nextLocation})=>active&&currentLocation.pathname!==nextLocation.pathname)
 return <ConfirmDialog illustration="caution" open={blocker.state==='blocked'} onOpenChange={open=>{if(!open&&blocker.state==='blocked')blocker.reset()}} title="게임을 나가시겠습니까?" description={practice?'나가면 연습 진행이 사라져요.':description??'진행 중인 게임은 돌아와 이어할 수 있지만, 시작된 시간은 계속 흘러요.'} onConfirm={()=>{if(blocker.state==='blocked')blocker.proceed()}} />
}
