import {useSyncExternalStore} from 'react'

const empty={available:false,request:0,applying:false}
let state=empty
const listeners=new Set<()=>void>()
export const OPEN_PWA_UPDATE_MENU='pwa:open-update-menu'
export function openPwaUpdateMenu(){window.dispatchEvent(new Event(OPEN_PWA_UPDATE_MENU))}
function publish(next:typeof state){
 if(next.available===state.available&&next.request===state.request&&next.applying===state.applying)return
 state=next;listeners.forEach(listener=>listener())
}
export function setPwaUpdateAvailable(available:boolean){publish(available?{...state,available}:empty)}
export function setPwaUpdateApplying(applying:boolean){publish({...state,applying})}
export function requestPwaUpdate(){
 if(state.available&&!state.applying)publish({...state,request:state.request+1})
}
export function usePwaUpdate(){
 return useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener)}},()=>state,()=>empty)
}
