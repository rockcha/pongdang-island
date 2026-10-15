import { useRef } from 'react'
import type { ReactNode } from 'react'

/** Native touch momentum, mouse dragging, and normal keyboard button navigation. */
export function DestinationStrip({children}:{children:ReactNode}){
 const drag=useRef<{id:number;x:number;scroll:number;moved:boolean}|null>(null)
 const suppressClick=useRef(false)
 return <div role="group" aria-label="지도 조각 목록"
  className="flex shrink-0 cursor-grab select-none gap-2 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden active:cursor-grabbing"
  onDragStart={event=>event.preventDefault()}
  onPointerDown={event=>{
   suppressClick.current=false
   if(event.pointerType!=='mouse'||event.button!==0)return
   drag.current={id:event.pointerId,x:event.clientX,scroll:event.currentTarget.scrollLeft,moved:false}
  }}
  onPointerMove={event=>{
   const state=drag.current
   if(!state||state.id!==event.pointerId)return
   const delta=event.clientX-state.x
   if(!state.moved&&Math.abs(delta)<6)return
   state.moved=true;suppressClick.current=true
   event.currentTarget.setPointerCapture?.(event.pointerId)
   event.currentTarget.scrollLeft=state.scroll-delta
   event.preventDefault()
  }}
  onPointerUp={()=>{drag.current=null}}
  onPointerCancel={()=>{drag.current=null;suppressClick.current=false}}
  onLostPointerCapture={()=>{drag.current=null}}
  onClickCapture={event=>{if(suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=false}}}
 >{children}</div>
}
