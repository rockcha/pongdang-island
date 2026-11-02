import {useLayoutEffect,useRef} from 'react'

/** Current health drops promptly; a pale damage trail catches up after a pause. */
export function HealthMeter({value,max,label}:{value:number;max:number;label:string}){
 const percent=max>0?Math.max(0,Math.min(100,value/max*100)):0
 const initialPercent=useRef(percent),previous=useRef({value,max}),trail=useRef<HTMLSpanElement>(null),fill=useRef<HTMLSpanElement>(null)
 useLayoutEffect(()=>{
  const element=trail.current,foreground=fill.current
  if(!element||!foreground)return
  const damaged=value<previous.current.value&&max===previous.current.max
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false
  foreground.style.transition='none'
  foreground.style.width=`${percent}%`
  element.style.transition=damaged&&!reduced?'width 300ms ease-out 150ms':'none'
  element.style.width=`${percent}%`
  previous.current={value,max}
 },[value,max,percent])
 return <span className="exploration-health-meter"><span ref={trail} className="exploration-health-trail" aria-hidden="true" style={{width:`${initialPercent.current}%`}}/><span ref={fill} className="exploration-health-fill" aria-hidden="true" style={{width:`${initialPercent.current}%`}}/><progress aria-label={label} max={max} value={value}/></span>
}
