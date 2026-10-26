import {useLayoutEffect,useRef,useState} from 'react'
import './aquarium-fit.css'

/** Reserve chrome before scaling the entire canonical scene, never its objects. */
export function fittedTankViewport(width:number,height:number,header=56,fill=false){
 const availableWidth=Math.max(1,width),availableHeight=Math.max(header+1,height)
 if(fill)return {width:availableWidth,height:availableHeight}
 const sceneWidth=Math.max(1,Math.min(488,availableWidth,(availableHeight-header)/1.6))
 return {width:sceneWidth,height:header+sceneWidth*1.6}
}
export function useFittedTankViewport(header=56,enabled=true,fill=false){
 const ref=useRef<HTMLDivElement>(null)
 const [size,setSize]=useState(()=>fittedTankViewport(320,568,header,fill))
 useLayoutEffect(()=>{
  const element=ref.current
  if(!element||!enabled)return
  const measure=()=>{
   if(!element.clientWidth||!element.clientHeight)return
   const next=fittedTankViewport(element.clientWidth,element.clientHeight,header,fill)
   setSize(old=>Math.abs(old.width-next.width)<.1&&Math.abs(old.height-next.height)<.1?old:next)
  }
  measure()
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure)
  observer?.observe(element)
  window.addEventListener('resize',measure)
  window.visualViewport?.addEventListener('resize',measure)
  return()=>{observer?.disconnect();window.removeEventListener('resize',measure);window.visualViewport?.removeEventListener('resize',measure)}
 },[enabled,header,fill])
 return {ref,...size}
}
