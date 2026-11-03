import {useEffect,useRef,useState,type PointerEvent} from 'react'
import {landLine,type LandCell,type LandTool} from './land-tools'

type Draft={tool:LandTool;cells:LandCell[]}
type Brush=Draft&{pointerId:number;seen:Set<string>;last:LandCell|null}
type Point={x:number;y:number}

export function useLandBrush({tool,readCell,onCommit}:{tool:LandTool|null;readCell:(x:number,y:number)=>LandCell|null;onCommit:(tool:LandTool,cells:LandCell[])=>void}){
 const latest=useRef({tool,readCell,onCommit});latest.current={tool,readCell,onCommit}
 const brush=useRef<Brush|null>(null),points=useRef(new Map<number,Point>()),pan=useRef<(Point&{left:number;top:number})|null>(null),ignoreUntil=useRef(0)
 const [draft,setDraft]=useState<Draft|null>(null)
 function cancel(){const active=!!brush.current||!!pan.current;brush.current=null;points.current.clear();pan.current=null;setDraft(null);ignoreUntil.current=active?Date.now()+500:0}
 useEffect(()=>{cancel()},[tool])
 useEffect(()=>{const blur=()=>cancel();window.addEventListener('blur',blur);return()=>{window.removeEventListener('blur',blur);brush.current=null;points.current.clear()}},[])
 function center(){const all=[...points.current.values()];return{x:all.reduce((sum,p)=>sum+p.x,0)/all.length,y:all.reduce((sum,p)=>sum+p.y,0)/all.length}}
 function append(cell:LandCell|null){
  const current=brush.current
  if(!current)return
  if(!cell){current.last=null;return}
  if(current.last?.x===cell.x&&current.last?.y===cell.y)return
  const line=current.last?landLine(current.last,cell):[cell]
  current.last=cell
  let changed=false
  for(const item of line){const key=`${item.x},${item.y}`;if(!current.seen.has(key)){current.seen.add(key);current.cells.push(item);changed=true}}
  if(changed)setDraft({tool:current.tool,cells:[...current.cells]})
 }
 function release(event:PointerEvent<HTMLDivElement>){if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
 function onPointerDown(event:PointerEvent<HTMLDivElement>){
  const active=latest.current.tool
  if(!active||event.button!==0)return
  event.preventDefault();ignoreUntil.current=0
  points.current.set(event.pointerId,{x:event.clientX,y:event.clientY})
  event.currentTarget.setPointerCapture?.(event.pointerId)
  if(points.current.size>1){brush.current=null;setDraft(null);pan.current={...center(),left:event.currentTarget.scrollLeft,top:event.currentTarget.scrollTop};return}
  if(pan.current)return
  brush.current={tool:active,cells:[],seen:new Set(),pointerId:event.pointerId,last:null}
  append(latest.current.readCell(event.clientX,event.clientY))
 }
 function onPointerMove(event:PointerEvent<HTMLDivElement>){
  if(!points.current.has(event.pointerId))return
  event.preventDefault();points.current.set(event.pointerId,{x:event.clientX,y:event.clientY})
  if(pan.current){if(points.current.size>=2){const point=center();event.currentTarget.scrollLeft=pan.current.left-(point.x-pan.current.x);event.currentTarget.scrollTop=pan.current.top-(point.y-pan.current.y)}return}
  if(brush.current?.pointerId===event.pointerId)append(latest.current.readCell(event.clientX,event.clientY))
 }
 function onPointerUp(event:PointerEvent<HTMLDivElement>){
  if(!points.current.has(event.pointerId))return
  event.preventDefault();ignoreUntil.current=Date.now()+500
  if(pan.current){points.current.delete(event.pointerId);if(!points.current.size)pan.current=null;release(event);return}
  if(brush.current?.pointerId===event.pointerId){append(latest.current.readCell(event.clientX,event.clientY));const finished=brush.current;brush.current=null;setDraft(null);latest.current.onCommit(finished.tool,finished.cells)}
  points.current.delete(event.pointerId);release(event)
 }
 function onPointerCancel(event:PointerEvent<HTMLDivElement>){if(points.current.has(event.pointerId)){cancel();release(event)}}
 function onLostPointerCapture(event:PointerEvent<HTMLDivElement>){if(points.current.has(event.pointerId))cancel()}
 return {draft,cancel,ignoresClick:()=>Date.now()<ignoreUntil.current,onPointerDown,onPointerMove,onPointerUp,onPointerCancel,onLostPointerCapture}
}
