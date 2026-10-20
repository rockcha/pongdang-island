import {useEffect,useRef,useState} from 'react'

export function BrickMovementControls({enabled,onDirection,onTarget}:{enabled:boolean;onDirection:(direction:-1|0|1)=>void;onTarget:(position:number|null)=>void}){
 const pointer=useRef<number|null>(null)
 const [position,setPosition]=useState<number|null>(null)
 const clear=()=>{pointer.current=null;setPosition(null);onTarget(null);onDirection(0)}
 useEffect(()=>{
  const reset=()=>{pointer.current=null;setPosition(null);onTarget(null);onDirection(0)}
  reset()
  const hide=()=>{if(document.hidden)reset()}
  window.addEventListener('blur',reset);document.addEventListener('visibilitychange',hide)
  return()=>{window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',hide);onTarget(null);onDirection(0)}
 },[enabled,onTarget,onDirection])
 function move(element:HTMLElement,clientX:number){
  const rect=element.getBoundingClientRect();if(rect.width<=0)return
  const next=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width))
  setPosition(next);onTarget(next)
 }
 return <div role="group" aria-label="퐁이 이동 조작" aria-disabled={!enabled} tabIndex={enabled?0:-1}
  className={`relative h-16 shrink-0 touch-none select-none overflow-hidden border-t border-white/10 bg-[#50372b] text-[#ffe3bd] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e7c19b] ${enabled?'cursor-ew-resize':'opacity-40'}`}
  onPointerDown={event=>{if(!enabled||pointer.current!==null||event.button>0)return;event.preventDefault();pointer.current=event.pointerId;event.currentTarget.setPointerCapture?.(event.pointerId);move(event.currentTarget,event.clientX)}}
  onPointerMove={event=>{if(enabled&&pointer.current===event.pointerId)move(event.currentTarget,event.clientX)}}
  onPointerUp={event=>{if(pointer.current===event.pointerId)clear()}}
  onPointerCancel={event=>{if(pointer.current===event.pointerId)clear()}}
  onLostPointerCapture={event=>{if(pointer.current===event.pointerId)clear()}}
  onContextMenu={event=>event.preventDefault()}
  onKeyDown={event=>{if(enabled&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();onTarget(null);onDirection(event.key==='ArrowLeft'?-1:1)}}}
  onKeyUp={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight')clear()}}
  onBlur={clear}>
  <span className="pointer-events-none absolute inset-x-5 top-1/2 h-px bg-[#e7c19b]/30"/>
  {position!==null?<span aria-hidden="true" className="pointer-events-none absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ffe3bd]/70 bg-[#b98555]/80" style={{left:`${position*100}%`}}/>:<span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs">여기를 좌우로 문질러 퐁이를 움직여요</span>}
 </div>
}
