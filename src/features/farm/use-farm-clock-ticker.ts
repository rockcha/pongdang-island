import {useEffect,useRef} from 'react'

export function useFarmClockTicker(running:boolean,fast:boolean,readNow:()=>number,onTick:(now:number)=>void){
 const latest=useRef({readNow,onTick});latest.current={readNow,onTick}
 useEffect(()=>{
  if(!running)return
  let timer:number|undefined
  const tick=()=>latest.current.onTick(latest.current.readNow())
  const resume=()=>{
   window.clearInterval(timer)
   if(!document.hidden){tick();timer=window.setInterval(tick,fast?250:1000)}
  }
  resume();document.addEventListener('visibilitychange',resume)
  return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',resume)}
 },[running,fast])
}
