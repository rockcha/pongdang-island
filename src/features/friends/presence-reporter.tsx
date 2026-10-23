import {useEffect} from 'react'
import {getNickname,useAuth} from '@/components/auth-provider'
import {pingPlayerPresence} from './presence-api'
import type {PresenceStatus} from './presence-api'

export function PresenceReporter(){
 const {session,recovery}=useAuth()
 const owner=!recovery&&getNickname(session)?session?.user.id:undefined
 useEffect(()=>{
  if(!owner)return
  const sessionId=crypto.randomUUID()
  let revision=0,lastState:PresenceStatus|undefined,lastSent=0
  const send=(state:PresenceStatus,force=false)=>{
   if(!force&&state===lastState&&Date.now()-lastSent<25000)return
   lastState=state;lastSent=Date.now()
   void pingPlayerPresence(sessionId,state,++revision).catch(()=>{/* Presence must never interrupt gameplay. */})
  }
  const update=()=>send(navigator.onLine===false?'offline':document.visibilityState==='hidden'?'away':'online')
  const close=()=>send('offline',true)
  update()
  const timer=setInterval(()=>{if(document.visibilityState!=='hidden')update()},30000)
  document.addEventListener('visibilitychange',update)
  window.addEventListener('online',update);window.addEventListener('offline',update)
  window.addEventListener('focus',update);window.addEventListener('pageshow',update);window.addEventListener('pagehide',close)
  return()=>{
   clearInterval(timer);document.removeEventListener('visibilitychange',update)
   window.removeEventListener('online',update);window.removeEventListener('offline',update)
   window.removeEventListener('focus',update);window.removeEventListener('pageshow',update);window.removeEventListener('pagehide',close)
   close()
  }
 },[owner])
 return null
}
