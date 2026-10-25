import {useEffect,useState} from 'react'
import {useAuth} from '@/components/auth-provider'
import {loadRelics,type Relic} from './api'

export function useEquippedRelic(){
 const {session,recovery}=useAuth(),owner=session?.user.id
 const [snapshot,setSnapshot]=useState<{owner:string;relic:Relic|null}|null>(null)
 useEffect(()=>{
  if(!owner||recovery)return
  let alive=true,revision=0
  const refresh=async()=>{
   if(document.hidden)return
   const request=++revision
   try{const state=await loadRelics();if(alive&&request===revision)setSnapshot({owner,relic:state.relics.find(r=>r.id===state.equippedId)??null})}catch{/* Retain the last confirmed equipment. */}
  }
  const update=()=>{void refresh()}
  update()
  window.addEventListener('relic-loadout-changed',update)
  window.addEventListener('focus',update)
  window.addEventListener('online',update)
  document.addEventListener('visibilitychange',update)
  return()=>{alive=false;revision++;window.removeEventListener('relic-loadout-changed',update);window.removeEventListener('focus',update);window.removeEventListener('online',update);document.removeEventListener('visibilitychange',update)}
 },[owner,recovery])
 return !recovery&&snapshot?.owner===owner?snapshot?.relic??null:null
}
