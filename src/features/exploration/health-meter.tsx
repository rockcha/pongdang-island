import {useLayoutEffect,useRef} from 'react'

/** The native meter stays current; only the muted damage trail is delayed. */
export function HealthMeter({value,max,label}:{value:number;max:number;label:string}){
 const percent=max>0?Math.max(0,Math.min(100,value/max*100)):0
 const initialPercent=useRef(percent),previous=useRef({value,max}),trail=useRef<HTMLSpanElement>(null)
 useLayoutEffect(()=>{
  const element=trail.current
  if(!element)return
  const damaged=value<previous.current.value&&max===previous.current.max
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false
  element.style.transition=damaged&&!reduced?'width 750ms cubic-bezier(.22,.61,.36,1) 400ms':'none'
  element.style.width=`${percent}%`
  previous.current={value,max}
 },[value,max,percent])
 return <span className="exploration-health-meter"><span ref={trail} className="exploration-health-trail" aria-hidden="true" style={{width:`${initialPercent.current}%`}}/><progress aria-label={label} max={max} value={value}/></span>
}
