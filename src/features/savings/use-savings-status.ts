import {useEffect,useState} from 'react'
import {useAuth} from '@/components/auth-provider'
import {loadSavings} from './api'
import {savingsStatus} from './savings-time'

export type SavingsMenuStatus='미납'|'수령 가능'|null
export function useSavingsStatus():SavingsMenuStatus{
 const {session,recovery}=useAuth(),owner=session?.user.id
 const [state,setState]=useState<{owner:string;label:SavingsMenuStatus}|null>(null)
 useEffect(()=>{
  if(!owner||recovery)return
  let alive=true,revision=0,timer:ReturnType<typeof setTimeout>|undefined
  async function refresh(){
   if(document.visibilityState==='hidden')return
   const request=++revision
   try{
    const data=await loadSavings()
    if(!alive||request!==revision)return
    clearTimeout(timer)
    const account=data.account,offset=Date.parse(data.serverNow)-Date.now()
    function publish(){
     if(!alive)return
     const now=Date.now()+offset,status=account?savingsStatus(account,now):null
     setState({owner:owner!,label:status==='matured'?'수령 가능':status==='due'||status==='missed'?'미납':null})
     if(!account||account.closed_at)return
     const future=[account.nextOpenAt,account.depositDeadline,account.maturesAt].filter((v):v is string=>!!v).map(v=>Date.parse(v)-now).filter(ms=>ms>0)
     if(future.length)timer=setTimeout(publish,Math.min(Math.min(...future)+1,2147483647))
    }
    publish()
   }catch{/* Preserve the last confirmed status until the next refresh. */}
  }
  const update=()=>void refresh()
  update();const poll=setInterval(update,60000)
  window.addEventListener('focus',update);window.addEventListener('online',update);window.addEventListener('savings-changed',update);document.addEventListener('visibilitychange',update)
  return()=>{alive=false;clearTimeout(timer);clearInterval(poll);window.removeEventListener('focus',update);window.removeEventListener('online',update);window.removeEventListener('savings-changed',update);document.removeEventListener('visibilitychange',update)}
 },[owner,recovery])
 return !recovery&&state?.owner===owner?state?.label??null:null
}
