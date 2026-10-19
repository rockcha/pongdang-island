import {useEffect,useState} from 'react'
import {useAuth} from '@/components/auth-provider'
import {loadExpeditions} from './api'

export type ExpeditionStatus='sailing'|'returned'|null
export function useExpeditionStatus():ExpeditionStatus{
 const {session,recovery}=useAuth()
 const owner=session?.user.id
 const [state,setState]=useState<{owner:string;status:ExpeditionStatus}|null>(null)
 useEffect(()=>{
  if(!owner||recovery)return
  let alive=true,revision=0
  let arrival:ReturnType<typeof setTimeout>|undefined
  async function refresh(){
   if(document.visibilityState==='hidden')return
   const current=++revision
   try{
    const data=await loadExpeditions()
    if(!alive||current!==revision)return
    clearTimeout(arrival)
    const remaining=data.active?Date.parse(data.active.returns_at)-Date.parse(data.serverNow):0
    const status:ExpeditionStatus=!data.active?null:remaining>0?'sailing':'returned'
    setState({owner:owner!,status})
    if(status==='sailing')arrival=setTimeout(()=>{if(alive)setState({owner:owner!,status:'returned'})},Math.min(remaining,2147483647))
   }catch{/* Keep navigation usable when status cannot be refreshed. */}
  }
  void refresh()
  const interval=setInterval(()=>void refresh(),60000)
  const update=()=>void refresh()
  window.addEventListener('focus',update)
  window.addEventListener('online',update)
  window.addEventListener('expedition-changed',update)
  document.addEventListener('visibilitychange',update)
  return()=>{alive=false;clearTimeout(arrival);clearInterval(interval);window.removeEventListener('focus',update);window.removeEventListener('online',update);window.removeEventListener('expedition-changed',update);document.removeEventListener('visibilitychange',update)}
 },[owner,recovery])
 return !recovery&&state?.owner===owner?state?.status??null:null
}
