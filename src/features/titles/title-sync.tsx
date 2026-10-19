import {useEffect} from 'react'
import {useAuth} from '@/components/auth-provider'
import {useSocial} from '@/features/social/social-provider'
import {syncTitles} from './api'

export function TitleSync(){
 const {session}=useAuth();const {refresh}=useSocial()
 useEffect(()=>{if(!session)return;let active=true,running=false;
  const sync=async()=>{if(running||document.visibilityState==='hidden')return;running=true;try{const n=await syncTitles();if(active&&n>0)await refresh()}catch{/* The drawer exposes connection failures; background checks retry later. */}finally{running=false}}
  void sync();const timer=setInterval(()=>void sync(),30000);window.addEventListener('focus',sync);window.addEventListener('quest-progress-changed',sync);document.addEventListener('visibilitychange',sync)
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',sync);window.removeEventListener('quest-progress-changed',sync);document.removeEventListener('visibilitychange',sync)}
 },[session?.user.id,refresh])
 return null
}
