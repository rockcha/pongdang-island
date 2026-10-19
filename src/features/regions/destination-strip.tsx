import { Children, cloneElement, isValidElement, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'

/** Native touch momentum, mouse dragging, and normal keyboard button navigation. */
export function DestinationStrip({children}:{children:ReactNode}){
 const viewport=useRef<HTMLDivElement>(null)
 const middle=useRef<HTMLDivElement>(null)
 const cycle=useRef(0)
 const items=Children.toArray(children)
 useLayoutEffect(()=>{
  const element=viewport.current,group=middle.current
  if(!element||!group)return
  const measure=()=>{
   const bounds=group.getBoundingClientRect(),width=bounds.width+8
   if(width<=8)return
   const selected=group.querySelector<HTMLElement>('[aria-pressed="true"]')?.getBoundingClientRect()
   const initial=selected?selected.left-bounds.left+selected.width/2-element.clientWidth/2:0
   const offset=cycle.current?((element.scrollLeft%cycle.current)+cycle.current)%cycle.current:((initial%width)+width)%width
   cycle.current=width;element.scrollLeft=width+offset
  }
  measure()
  if(typeof ResizeObserver==='undefined')return
  const observer=new ResizeObserver(measure);observer.observe(group)
  return()=>observer.disconnect()
 },[items.length])
 const drag=useRef<{id:number;x:number;scroll:number;moved:boolean}|null>(null)
 const suppressClick=useRef(false)
 return <div ref={viewport} role="group" aria-label="지도 목록"
  className="flex shrink-0 cursor-grab select-none gap-2 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden active:cursor-grabbing"
  onDragStart={event=>event.preventDefault()}
  onScroll={event=>{
   const width=cycle.current,element=event.currentTarget
   if(!width)return
   const shift=element.scrollLeft<width?-width:element.scrollLeft>=width*2?width:0
   if(shift){element.scrollLeft-=shift;if(drag.current)drag.current.scroll-=shift}
  }}
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
 >{[-1,0,1].map(copy=><div key={copy} ref={copy===0?middle:undefined} aria-hidden={copy===0?undefined:true} className="flex shrink-0 gap-2">{copy===0?items:items.map(item=>isValidElement<{tabIndex?:number}>(item)?cloneElement(item,{tabIndex:-1}):item)}</div>)}</div>
}
