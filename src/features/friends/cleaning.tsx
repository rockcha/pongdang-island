import {randomId} from '@/lib/random-id'
import {useEffect,useRef,useState} from 'react'
import type {CSSProperties,PointerEvent} from 'react'
import {toast} from 'sonner'
import {Button} from '@/components/ui/button'
import {cleanFriendAquarium,visitError} from './aquarium-api'
import './feeding.css'

type Point={x:number;y:number}
type Bubble=Point&{id:number}
type Stroke={pointer:number;last:Point;distance:number;sinceBubble:number}
export function Cleaning({tank,blocked,onActiveChange}:{tank:string;blocked:boolean;onActiveChange:(active:boolean)=>void}){
 const [active,setActive]=useState(false),[cursor,setCursor]=useState<Point|null>(null),[strokes,setStrokes]=useState(0)
 const [pending,setPending]=useState(false),[error,setError]=useState(''),[bubbles,setBubbles]=useState<Bubble[]>([])
 const operation=useRef<string|null>(null),locked=useRef(false),alive=useRef(true),stroke=useRef<Stroke|null>(null),nextBubble=useRef(0)
 const surface=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLButtonElement>(null),wasActive=useRef(false)
 const timers=useRef<ReturnType<typeof setTimeout>[]>([])
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;timers.current.forEach(clearTimeout)}},[])
 useEffect(()=>{if(active)surface.current?.focus({preventScroll:true});else if(wasActive.current)trigger.current?.focus({preventScroll:true});wasActive.current=active},[active])
 function stop(){setActive(false);setCursor(null);stroke.current=null;onActiveChange(false)}
 function start(){if(strokes===3){setStrokes(0);operation.current=null}setError('');setActive(true);onActiveChange(true)}
 function foam(point:Point){
  const bubble={...point,id:++nextBubble.current};setBubbles(old=>[...old.slice(-24),bubble])
  const timer=setTimeout(()=>{timers.current=timers.current.filter(t=>t!==timer);if(alive.current)setBubbles(old=>old.filter(b=>b.id!==bubble.id))},1400)
  timers.current.push(timer)
 }
 function point(event:PointerEvent<HTMLButtonElement>){const rect=event.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(rect.width,event.clientX-rect.left)),y:Math.max(0,Math.min(rect.height,event.clientY-rect.top))}}
 function down(event:PointerEvent<HTMLButtonElement>){
  if(locked.current||event.isPrimary===false||event.button!==0)return
  event.preventDefault();event.currentTarget.setPointerCapture?.(event.pointerId)
  const p=point(event);setCursor(p);stroke.current={pointer:event.pointerId,last:p,distance:0,sinceBubble:0}
 }
 function move(event:PointerEvent<HTMLButtonElement>){
  const p=point(event);if(event.pointerType!=='touch'||stroke.current)setCursor(p)
  const s=stroke.current;if(!s||s.pointer!==event.pointerId||locked.current)return
  const distance=Math.hypot(p.x-s.last.x,p.y-s.last.y);s.distance+=distance;s.sinceBubble+=distance;s.last=p
  if(s.sinceBubble>=18){foam(p);s.sinceBubble=0}
 }
 function up(event:PointerEvent<HTMLButtonElement>){
  const s=stroke.current;if(!s||s.pointer!==event.pointerId)return
  const p=point(event);s.distance+=Math.hypot(p.x-s.last.x,p.y-s.last.y);stroke.current=null
  if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
  if(event.pointerType==='touch')setCursor(null)
  if(s.distance>=64)void finish(p)
 }
 async function finish(p:Point){
  if(locked.current)return
  if(!operation.current)operation.current=randomId()
  locked.current=true;setPending(true);setError('')
  try{
   const result=await cleanFriendAquarium(tank,operation.current,strokes+1)
   if(!alive.current)return
   setStrokes(result.clicks);foam(p)
   if(result.completed){stop();toast.success('청소를 완료했어요.')}
  }catch(cause){if(alive.current)setError(visitError(cause))}
  finally{locked.current=false;if(alive.current)setPending(false)}
 }
 return <>
  {active&&<button ref={surface} type="button" className={`aquarium-feeding-surface aquarium-cleaning-surface absolute inset-0 z-10 ${cursor?'has-food-cursor':''}`} aria-label={`어항 문지르기 ${strokes}/3`} aria-disabled={pending} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{stroke.current=null;setCursor(null)}} onLostPointerCapture={()=>{stroke.current=null}} onPointerLeave={()=>{if(!stroke.current)setCursor(null)}} onClick={event=>{if(event.detail===0)void finish({x:event.currentTarget.clientWidth/2,y:event.currentTarget.clientHeight/2})}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();stop()}}}>
   {cursor&&<img src="/aquarium/cleaning-brush.png" alt="" draggable={false} className="aquarium-cleaning-cursor" style={{left:cursor.x,top:cursor.y}}/>}
  </button>}
  <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">{bubbles.flatMap(b=>Array.from({length:5},(_,i)=><span key={`${b.id}-${i}`} className="aquarium-soap-bubble" style={{left:b.x+(i*11)%31-15,top:b.y+(i*7)%23-11,width:10+i*3,height:10+i*3,'--bubble-drift':`${(i-2)*12}px`,animationDelay:`${i*35}ms`} as CSSProperties}/>))}</div>
  {!blocked&&<div className={`absolute bottom-0 z-20 flex flex-col items-stretch gap-2 ${active?'inset-x-0':'right-0 w-1/2'}`}>
   {error&&<p role="alert" className="rounded-lg bg-background/95 p-2 text-xs text-destructive">{error}</p>}
   <div className="flex w-full justify-center gap-0"><Button ref={trigger} variant="secondary" className="h-16 min-h-16 min-w-0 flex-1 shrink gap-2 rounded-none border-t border-l border-border bg-secondary px-2 text-sm" disabled={pending||active} onClick={start} aria-label={`청소하기 ${strokes}/3`}><img src="/aquarium/cleaning-brush.png" alt="" className="size-8 shrink-0 object-contain"/><span className="truncate">{active?'청소 중':strokes===3?'다시 청소':'청소하기'}</span><span className="shrink-0 tabular-nums">{strokes}/3</span></Button>{active&&<Button variant="secondary" className="h-16 min-h-16 rounded-none border-t border-l border-border px-4" disabled={pending} onClick={stop}>그만하기</Button>}</div>
  </div>}
 </>
}
