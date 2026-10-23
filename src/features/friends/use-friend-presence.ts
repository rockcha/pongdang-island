import {useEffect,useState} from 'react'
import {loadFriendPresence} from './presence-api'
import type {FriendPresenceState} from './presence-api'

/** One batch while the friend list is visible; failures are unknown, never offline. */
export function useFriendPresence(owner:string|undefined,friendKey:string,enabled=true){
 const [snapshot,setSnapshot]=useState<{owner:string;key:string;data:FriendPresenceState}|null>(null)
 const [error,setError]=useState(false)
 useEffect(()=>{
  setSnapshot(null);setError(false)
  if(!owner||!friendKey||!enabled)return
  let active=true,inFlight=false,revision=0,controller:AbortController|undefined
  async function load(){
   if(inFlight||document.visibilityState==='hidden'||navigator.onLine===false)return
   inFlight=true;const request=++revision,abort=new AbortController()
   controller=abort
   const timeout=setTimeout(()=>abort.abort(),10000)
   try{
    const data=await loadFriendPresence(abort.signal)
    if(active&&request===revision){setSnapshot({owner:owner!,key:friendKey,data});setError(false)}
   }catch{if(active&&request===revision){setSnapshot(null);setError(true)}}
   finally{clearTimeout(timeout);controller=undefined;inFlight=false}
  }
  const offline=()=>{revision++;controller?.abort();setSnapshot(null);setError(true)}
  const visibility=()=>{
   if(document.visibilityState==='hidden'){revision++;controller?.abort();setSnapshot(null)}
   else void load()
  }
  void load()
  const timer=setInterval(()=>void load(),15000)
  const refresh=()=>void load()
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('offline',offline)
  document.addEventListener('visibilitychange',visibility)
  return()=>{active=false;controller?.abort();clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('offline',offline);document.removeEventListener('visibilitychange',visibility)}
 },[owner,friendKey,enabled])
 const current=enabled&&snapshot&&snapshot.owner===owner&&snapshot.key===friendKey?snapshot:null
 return {friends:current?.data.friends??[],ready:Boolean(current),error}
}
