import {useEffect,useRef} from 'react'
import {refreshReturnNotifications} from './api'

/** Server-side notices persist while offline; the timer delivers them promptly in an open app. */
export function useReturnNotifications(owner:string|undefined,refresh:()=>Promise<void>){
 const latestRefresh=useRef(refresh)
 latestRefresh.current=refresh
 useEffect(()=>{
  if(!owner)return
  let active=true,loading=false
  let arrival:ReturnType<typeof setTimeout>|undefined
  let debounce:ReturnType<typeof setTimeout>|undefined
  async function check(reload=false){
   if(!active||loading||document.visibilityState==='hidden')return
   loading=true
   try{
    const status=await refreshReturnNotifications()
    if(!active)return
    clearTimeout(arrival)
    if(status.nextAt){
     const remaining=Date.parse(status.nextAt)-Date.parse(status.serverNow)
     if(Number.isFinite(remaining))arrival=setTimeout(()=>void check(true),Math.min(Math.max(remaining+50,1000),2147483647))
    }
    if(status.created>0||reload)await latestRefresh.current()
   }catch{
    // A missed realtime event or an unavailable scheduler must not hide the existing inbox.
    if(active&&reload)await latestRefresh.current().catch(()=>{})
   }finally{loading=false}
  }
  const update=()=>{clearTimeout(debounce);debounce=setTimeout(()=>void check(true),120)}
  void check()
  const interval=setInterval(update,300000)
  for(const event of ['focus','online','harbor-changed','expedition-changed','production-changed'])window.addEventListener(event,update)
  document.addEventListener('visibilitychange',update)
  return()=>{
   active=false;clearInterval(interval);clearTimeout(arrival);clearTimeout(debounce)
   for(const event of ['focus','online','harbor-changed','expedition-changed','production-changed'])window.removeEventListener(event,update)
   document.removeEventListener('visibilitychange',update)
  }
 },[owner])
}
