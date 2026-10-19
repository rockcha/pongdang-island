import {useEffect,useSyncExternalStore} from 'react'
const blockers=new Set<symbol>()
const listeners=new Set<()=>void>()
const notify=()=>listeners.forEach(listener=>listener())
export function usePwaUpdateBlock(active:boolean){
 useEffect(()=>{
  if(!active)return
  const token=Symbol();blockers.add(token);notify()
  return()=>{blockers.delete(token);notify()}
 },[active])
}
export function usePwaUpdateBlocked(){
 return useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener)}},()=>blockers.size>0,()=>false)
}
