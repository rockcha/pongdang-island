import {useSyncExternalStore} from 'react'

const empty={available:false,request:0,applying:false}
let state=empty
const listeners=new Set<()=>void>()
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
