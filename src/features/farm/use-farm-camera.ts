import {useEffect,useLayoutEffect,useRef,type PointerEvent,type RefObject} from 'react'
import {MAP_W,TILE} from './topview-model'

type Point={x:number;y:number}
type Anchor=Point&{worldX:number;worldY:number}
type Options={viewport:RefObject<HTMLDivElement|null>;svg:RefObject<SVGSVGElement|null>;zoom:number;setZoom:(zoom:number)=>void;manual:()=>void;cancelTool:()=>void;brushActive:boolean}
const clamp=(zoom:number)=>Math.min(1.8,Math.max(.25,zoom))
export function useFarmCamera(options:Options){
 const latest=useRef(options);latest.current=options
 const zoomRef=useRef(options.zoom);zoomRef.current=options.zoom
 const pending=useRef<Anchor|null>(null),skipCenter=useRef(false),ignoreUntil=useRef(0)
 const points=useRef(new Map<number,Point>()),pinch=useRef<{distance:number;zoom:number;anchor:Anchor}|null>(null)
 const multiTouch=useRef(false),single=useRef<{point:Point;left:number;top:number;moved:boolean}|null>(null)
 function anchorAt(point:Point):Anchor|null{
  const bounds=latest.current.svg.current?.getBoundingClientRect();if(!bounds?.width)return null
  const scale=bounds.width/((MAP_W+4)*TILE)
  return {...point,worldX:(point.x-bounds.left)/scale,worldY:(point.y-bounds.top)/scale}
 }
 function adjust(anchor:Anchor,zoom:number){
  const svg=latest.current.svg.current,el=latest.current.viewport.current;if(!svg||!el)return
  const bounds=svg.getBoundingClientRect()
  el.scrollLeft+=bounds.left+anchor.worldX*zoom-anchor.x
  el.scrollTop+=bounds.top+anchor.worldY*zoom-anchor.y
 }
 function changeZoom(zoom:number,anchor:Anchor){
  const next=clamp(zoom),previous=zoomRef.current;zoomRef.current=next
  latest.current.manual();pending.current=anchor;skipCenter.current=true
  if(next===previous){adjust(anchor,next);pending.current=null;requestAnimationFrame(()=>{skipCenter.current=false})}
  latest.current.setZoom(next)
 }
 useLayoutEffect(()=>{if(pending.current){adjust(pending.current,options.zoom);pending.current=null}},[options.zoom])
 useEffect(()=>{
  const el=options.viewport.current;if(!el)return
  const wheel=(event:WheelEvent)=>{
   event.preventDefault();latest.current.cancelTool()
   const anchor=anchorAt({x:event.clientX,y:event.clientY});if(!anchor)return
   const unit=event.deltaMode===1?16:event.deltaMode===2?el.clientHeight:1,delta=Math.max(-400,Math.min(400,event.deltaY*unit))
   changeZoom(zoomRef.current*Math.exp(-delta*.0015),anchor)
  }
  el.addEventListener('wheel',wheel,{passive:false})
  return()=>el.removeEventListener('wheel',wheel)
 },[options.viewport])
 function reset(){points.current.clear();pinch.current=null;multiTouch.current=false;single.current=null}
 useEffect(()=>{const blur=()=>{reset();ignoreUntil.current=Date.now()+500;latest.current.cancelTool()};window.addEventListener('blur',blur);return()=>window.removeEventListener('blur',blur)},[])
 function pair(){const [a,b]=[...points.current.values()];return {center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))}}
 function onPointerDownCapture(event:PointerEvent<HTMLDivElement>){
  if(event.pointerType!=='touch'||event.button!==0)return
  points.current.set(event.pointerId,{x:event.clientX,y:event.clientY})
  if(points.current.size===1){const el=event.currentTarget;single.current={point:{x:event.clientX,y:event.clientY},left:el.scrollLeft,top:el.scrollTop,moved:false};return}
  event.preventDefault();event.stopPropagation();latest.current.cancelTool();multiTouch.current=true;single.current=null
  const {center,distance}=pair(),anchor=anchorAt(center)
  if(anchor)pinch.current={distance,zoom:zoomRef.current,anchor}
 }
 function onPointerMoveCapture(event:PointerEvent<HTMLDivElement>){
  if(!points.current.has(event.pointerId))return
  points.current.set(event.pointerId,{x:event.clientX,y:event.clientY})
  if(multiTouch.current){
   event.preventDefault();event.stopPropagation()
   if(points.current.size>=2&&pinch.current){const {center,distance}=pair(),start=pinch.current;changeZoom(start.zoom*distance/start.distance,{...start.anchor,...center})}
   return
  }
  if(latest.current.brushActive||!single.current)return
  const start=single.current,dx=event.clientX-start.point.x,dy=event.clientY-start.point.y
  if(Math.abs(dx)+Math.abs(dy)>6)start.moved=true
  if(start.moved){event.preventDefault();event.stopPropagation();event.currentTarget.scrollLeft=start.left-dx;event.currentTarget.scrollTop=start.top-dy}
 }
 function onPointerUpCapture(event:PointerEvent<HTMLDivElement>){
  if(!points.current.has(event.pointerId))return
  if(multiTouch.current){event.preventDefault();event.stopPropagation();ignoreUntil.current=Date.now()+500}
  else if(single.current?.moved&&!latest.current.brushActive)ignoreUntil.current=Date.now()+500
  points.current.delete(event.pointerId)
  if(!points.current.size)reset()
 }
 function onPointerCancelCapture(event:PointerEvent<HTMLDivElement>){if(points.current.has(event.pointerId)){latest.current.cancelTool();reset();ignoreUntil.current=Date.now()+500}}
 return {skipCenter,ignoresClick:()=>Date.now()<ignoreUntil.current,onPointerDownCapture,onPointerMoveCapture,onPointerUpCapture,onPointerCancelCapture}
}
