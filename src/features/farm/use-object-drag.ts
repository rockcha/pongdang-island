import {useEffect,useRef,type PointerEvent} from 'react'
import {objectFootprint,type TopviewObject} from './topview-model'

type Cell={x:number;y:number}
type Options={enabled:boolean;movingId?:number|null;readCell:(x:number,y:number)=>Cell|null;find:(id:number)=>TopviewObject|undefined;onSelect:(id:number)=>void;onPreview:(cell:Cell|null)=>void;onDrop:(id:number,cell:Cell|null)=>void;onCancel:()=>void}
type Gesture={id:number;pointer:number;x:number;y:number;start:Cell;origin:Cell;moved:boolean;element:HTMLDivElement}
export function useFarmObjectDrag(options:Options){
 const latest=useRef(options);latest.current=options
 const gesture=useRef<Gesture|null>(null),blocked=useRef(new Set<number>()),ignoreUntil=useRef(0)
 function release(current:Gesture){try{if(current.element.hasPointerCapture?.(current.pointer))current.element.releasePointerCapture(current.pointer)}catch{/* The pointer may already have been released. */}}
 function cancel(){const current=gesture.current;gesture.current=null;blocked.current.clear();if(current){ignoreUntil.current=Date.now()+500;release(current);latest.current.onCancel()}}
 useEffect(()=>{window.addEventListener('blur',cancel);return()=>window.removeEventListener('blur',cancel)},[])
 function consume(event:PointerEvent<HTMLDivElement>){event.preventDefault();event.stopPropagation()}
 function down(event:PointerEvent<HTMLDivElement>){
  if(!gesture.current&&!blocked.current.size)ignoreUntil.current=0
  if(blocked.current.size){blocked.current.add(event.pointerId);consume(event);return true}
  const current=gesture.current
  if(current&&current.pointer!==event.pointerId){cancel();blocked.current.add(current.pointer);blocked.current.add(event.pointerId);consume(event);return true}
  if(!latest.current.enabled||event.button!==0)return false
  const node=(event.target as Element).closest('[data-object-id]');if(!node)return false
  const object=latest.current.find(Number(node.getAttribute('data-object-id')));if(!object)return false
  const cell=latest.current.readCell(event.clientX,event.clientY)??object,size=objectFootprint(object)
  const start={x:Math.max(object.x,Math.min(object.x+size.w-1,cell.x)),y:Math.max(object.y,Math.min(object.y+size.h-1,cell.y))}
  gesture.current={id:object.id,pointer:event.pointerId,x:event.clientX,y:event.clientY,start,origin:{x:object.x,y:object.y},moved:false,element:event.currentTarget}
  try{event.currentTarget.setPointerCapture(event.pointerId)}catch{/* Synthetic pointer events may not support capture. */}
  event.stopPropagation();return true
 }
 function target(current:Gesture,event:PointerEvent<HTMLDivElement>){const cell=latest.current.readCell(event.clientX,event.clientY);return cell?{x:current.origin.x+cell.x-current.start.x,y:current.origin.y+cell.y-current.start.y}:null}
 function move(event:PointerEvent<HTMLDivElement>){
  if(blocked.current.has(event.pointerId)){consume(event);return true}
  const current=gesture.current;if(!current||current.pointer!==event.pointerId)return false
  if(!current.moved&&Math.hypot(event.clientX-current.x,event.clientY-current.y)>6){current.moved=true;latest.current.onSelect(current.id)}
  if(current.moved){consume(event);latest.current.onPreview(target(current,event))}else event.stopPropagation()
  return true
 }
 function up(event:PointerEvent<HTMLDivElement>){
  if(blocked.current.delete(event.pointerId)){consume(event);return true}
  const current=gesture.current;if(!current||current.pointer!==event.pointerId)return false
  gesture.current=null;ignoreUntil.current=Date.now()+500;release(current);consume(event)
  if(current.moved)latest.current.onDrop(current.id,target(current,event))
  else if(latest.current.movingId===current.id)latest.current.onDrop(current.id,current.origin)
  else latest.current.onSelect(current.id)
  return true
 }
 function abort(event:PointerEvent<HTMLDivElement>){if(blocked.current.delete(event.pointerId)){consume(event);return true}if(gesture.current?.pointer===event.pointerId){cancel();consume(event);return true}return false}
 return {down,move,up,abort,cancel,ignoresClick:()=>Date.now()<ignoreUntil.current}
}
