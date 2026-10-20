import {useEffect,useRef,useState} from 'react'
import {ChevronLeft,ChevronRight} from 'lucide-react'

export function BrickMovementControls({enabled,onDirection}:{enabled:boolean;onDirection:(direction:-1|0|1)=>void}){
 const held=useRef(new Map<string,-1|1>())
 const [direction,setDirection]=useState<-1|0|1>(0)
 function update(key:string,value:-1|1|null){
  if(value===null)held.current.delete(key)
  else{held.current.delete(key);held.current.set(key,value)}
  const next=Array.from(held.current.values()).at(-1)??0
  setDirection(next);onDirection(next)
 }
 useEffect(()=>{
  const inputs=held.current
  const clear=()=>{inputs.clear();setDirection(0);onDirection(0)}
  clear()
  const hide=()=>{if(document.hidden)clear()}
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hide)
  return()=>{window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hide);inputs.clear();onDirection(0)}
 },[enabled,onDirection])
 return <div className="shrink-0 border-t border-white/10 bg-[#50372b] text-white select-none [@media(max-height:500px)]:pt-1" role="group" aria-label="패들 이동 조작">
  <div className="grid w-full grid-cols-2 gap-px">
   {([-1,1] as const).map(value=><button key={value} type="button" disabled={!enabled} aria-label={value===-1?'왼쪽으로 이동':'오른쪽으로 이동'} aria-pressed={direction===value}
    className={`flex h-16 touch-none items-center justify-center gap-2 rounded-none border-0 text-base font-medium shadow-[0_3px_0_rgba(0,0,0,0.25)] transition-[background-color,transform] duration-75 disabled:opacity-35 [@media(max-height:500px)]:h-12 ${direction===value?'translate-y-0.5 bg-[#805337] shadow-none':'bg-[#62432f] hover:bg-[#755039]'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c19b]`}
    onContextMenu={event=>event.preventDefault()}
    onPointerDown={event=>{if(!enabled)return;event.preventDefault();event.currentTarget.setPointerCapture?.(event.pointerId);update(`pointer-${event.pointerId}`,value)}}
    onPointerUp={event=>update(`pointer-${event.pointerId}`,null)}
    onPointerCancel={event=>update(`pointer-${event.pointerId}`,null)}
    onLostPointerCapture={event=>update(`pointer-${event.pointerId}`,null)}
    onKeyDown={event=>{if(enabled&&(event.key===' '||event.key==='Enter')){event.preventDefault();update(`key-${value}-${event.key}`,value)}}}
    onKeyUp={event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();update(`key-${value}-${event.key}`,null)}}}
    onBlur={()=>{update(`key-${value}- `,null);update(`key-${value}-Enter`,null)}}>
    {value===-1?<ChevronLeft className="size-7"/>:<ChevronRight className="size-7"/>}<span>{value===-1?'왼쪽':'오른쪽'}</span>
   </button>)}
  </div>
 </div>
}
