import {useCallback,useEffect,useRef,useState} from 'react'
import {loadFriendExpeditions} from './api'
import type {FriendExpeditionState} from './api'

/** Fetch all friends together; never carry another account's availability over. */
export function useFriendExpeditions(owner:string|undefined,friendKey:string){
 const [snapshot,setSnapshot]=useState<{owner:string|undefined;data:FriendExpeditionState}|null>(null)
 const [now,setNow]=useState(0),[error,setError]=useState(false)
 const generation=useRef(0),offset=useRef(0)
 const apply=useCallback((data:FriendExpeditionState)=>{
  generation.current++
  offset.current=Date.parse(data.serverNow)-Date.now()
  setNow(Date.now()+offset.current);setSnapshot({owner,data});setError(false)
 },[owner])
 useEffect(()=>{
  let alive=true,inFlight=false
  generation.current++;setSnapshot(null);setError(false)
  if(!owner||!friendKey)return
  async function reload(){
   if(inFlight||document.visibilityState==='hidden')return
   inFlight=true;const request=++generation.current
   try{const data=await loadFriendExpeditions();if(alive&&request===generation.current)apply(data)}
   catch{if(alive&&request===generation.current)setError(true)}
   finally{inFlight=false}
  }
  void reload()
  const tick=setInterval(()=>setNow(Date.now()+offset.current),1000)
  const poll=setInterval(()=>void reload(),30000)
  const focus=()=>void reload()
  window.addEventListener('focus',focus);window.addEventListener('online',focus);window.addEventListener('expedition-changed',focus);document.addEventListener('visibilitychange',focus)
  return()=>{alive=false;generation.current++;clearInterval(tick);clearInterval(poll);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);window.removeEventListener('expedition-changed',focus);document.removeEventListener('visibilitychange',focus)}
 },[owner,friendKey,apply])
 return {friends:snapshot?.owner===owner?snapshot?.data.friends??[]:[],now,error,apply}
}
