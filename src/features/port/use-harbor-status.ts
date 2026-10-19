import {useEffect,useState} from 'react'
import {useAuth} from '@/components/auth-provider'
import {loadHarbor} from './api'

export type HarborStatus={ready:number;total:number}
export function useHarborStatus():HarborStatus|null{
 const {session,recovery}=useAuth()
 const owner=session?.user.id
 const [state,setState]=useState<{owner:string;status:HarborStatus}|null>(null)
 useEffect(()=>{
  if(!owner||recovery)return
  let alive=true,revision=0
  let arrival:ReturnType<typeof setTimeout>|undefined
  async function refresh(){
   if(document.visibilityState==='hidden')return
   const current=++revision
   try{
    const data=await loadHarbor()
    if(!alive||current!==revision)return
    clearTimeout(arrival)
    const trips=data.voyages.filter(v=>!v.claimed_at)
    const offset=Date.parse(data.serverNow)-Date.now()
    function publish(){
     if(!alive)return
     const now=Date.now()+offset
     setState({owner:owner!,status:{ready:trips.filter(v=>Date.parse(v.returns_at)<=now).length,total:data.dockSlots??2}})
     const future=trips.map(v=>Date.parse(v.returns_at)-now).filter(ms=>ms>0)
     if(future.length)arrival=setTimeout(publish,Math.min(Math.min(...future)+1,2147483647))
    }
    publish()
   }catch{/* Keep navigation usable when status cannot be refreshed. */}
  }
  void refresh()
  const interval=setInterval(()=>void refresh(),60000)
  const update=()=>void refresh()
  window.addEventListener('focus',update)
  window.addEventListener('online',update)
  window.addEventListener('harbor-changed',update)
  document.addEventListener('visibilitychange',update)
  return()=>{alive=false;clearTimeout(arrival);clearInterval(interval);window.removeEventListener('focus',update);window.removeEventListener('online',update);window.removeEventListener('harbor-changed',update);document.removeEventListener('visibilitychange',update)}
 },[owner,recovery])
 return !recovery&&state?.owner===owner?state?.status??null:null
}
