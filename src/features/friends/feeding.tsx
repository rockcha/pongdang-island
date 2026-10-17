import {useEffect,useRef,useState} from 'react'
import type {CSSProperties,MouseEvent} from 'react'
import {toast} from 'sonner'
import {Button} from '@/components/ui/button'
import {feedFriendAquarium,visitError} from './aquarium-api'
import './feeding.css'

type Point={x:number;y:number}
type Drop=Point&{id:number;distance:number}
export function Feeding({tank,blocked=false,onActiveChange}:{tank:string;blocked?:boolean;onActiveChange?:(active:boolean)=>void}){
 const [active,setActive]=useState(false),[cursor,setCursor]=useState<Point|null>(null)
 const [clicks,setClicks]=useState(0),[pending,setPending]=useState(false),[drops,setDrops]=useState<Drop[]>([]),[error,setError]=useState('')
 const operation=useRef<string|null>(null),locked=useRef(false),alive=useRef(true),nextDrop=useRef(0)
 const surface=useRef<HTMLButtonElement>(null),trigger=useRef<HTMLButtonElement>(null),wasActive=useRef(false)
 const timers=useRef<ReturnType<typeof setTimeout>[]>([])
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;timers.current.forEach(clearTimeout)}},[])
 useEffect(()=>{if(active)surface.current?.focus({preventScroll:true});else if(wasActive.current)trigger.current?.focus({preventScroll:true});wasActive.current=active},[active])
 function start(){
  if(clicks===3){setClicks(0);operation.current=null}
  setError('');setActive(true);onActiveChange?.(true)
 }
 function stop(){setActive(false);setCursor(null);onActiveChange?.(false)}
 async function feed(event:MouseEvent<HTMLButtonElement>){
  if(locked.current)return
  const rect=event.currentTarget.getBoundingClientRect()
  // Keyboard activation pours at the center; pointer/touch pours where pressed.
  const x=event.detail===0?rect.width/2:Math.max(0,Math.min(rect.width,event.clientX-rect.left))
  const y=event.detail===0?rect.height/3:Math.max(0,Math.min(rect.height,event.clientY-rect.top))
  const point={x:rect.width?x/rect.width*100:50,y:rect.height?y/rect.height*100:33}
  if(!operation.current)operation.current=crypto.randomUUID()
  const step=clicks+1
  locked.current=true;setPending(true);setError('')
  try{
   const result=await feedFriendAquarium(tank,operation.current,step)
   if(!alive.current)return
   setClicks(result.clicks)
   const drop={...point,id:++nextDrop.current,distance:Math.max(40,rect.height-y+16)}
   setDrops(current=>[...current,drop])
   const timer=setTimeout(()=>{timers.current=timers.current.filter(value=>value!==timer);if(alive.current)setDrops(current=>current.filter(item=>item.id!==drop.id))},2600)
   timers.current.push(timer)
   if(result.completed){stop();toast.success('먹이 주기를 완료했어요.')}
  }catch(cause){if(alive.current)setError(visitError(cause))}
  finally{locked.current=false;if(alive.current)setPending(false)}
 }
 return <>
  {active&&<button ref={surface} type="button" className={`aquarium-feeding-surface absolute inset-0 z-10 ${cursor?'has-food-cursor':''}`} aria-label={`어항에 먹이 떨어뜨리기 ${clicks}/3`} aria-disabled={pending} aria-describedby="feeding-instructions" onClick={event=>void feed(event)} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();stop()}}} onPointerMove={event=>{if(event.pointerType==='touch')return;const rect=event.currentTarget.getBoundingClientRect();setCursor({x:event.clientX-rect.left,y:event.clientY-rect.top})}} onPointerLeave={()=>setCursor(null)}>
   {cursor&&<img src="/aquarium/food-canister.png" alt="" draggable={false} className={`aquarium-food-cursor ${pending?'is-pouring':''}`} style={{left:cursor.x,top:cursor.y}}/>}
  </button>}
  <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">{drops.flatMap(drop=>Array.from({length:12},(_,i)=><span key={`${drop.id}-${i}`} className="aquarium-food" style={{left:`calc(${drop.x}% + ${(i*7)%21-10}px)`,top:`${drop.y}%`,animationDelay:`${i*25}ms`,animationDuration:`${1500+i%4*160}ms`,'--food-fall':`${drop.distance}px`} as CSSProperties}/>))}</div>
  {!blocked&&<div className={`absolute bottom-3 z-20 flex flex-col items-center gap-2 ${active?'inset-x-3':'left-3 w-[calc(50%_-_1rem)]'}`}>
   {error&&<p role="alert" className="rounded-lg bg-background/95 p-2 text-xs text-destructive">{error}</p>}
   {active&&<p id="feeding-instructions" className="pointer-events-none rounded-full bg-background/95 px-3 py-1.5 text-xs shadow-sm" aria-live="polite">{pending?'먹이를 주고 있어요…':'먹이를 줄 곳을 눌러주세요.'} ({clicks}/3)</p>}
   <div className="flex w-full justify-center gap-2"><Button ref={trigger} className="h-11 min-h-11 min-w-0 flex-1 shrink gap-1.5 rounded-full px-3 text-xs shadow-sm" disabled={pending||active} onClick={start} aria-label={`먹이 주기 ${clicks}/3`}><img src="/aquarium/food-canister.png" alt="" className="size-7 shrink-0 object-contain"/><span className="truncate">{active?'먹이 주는 중':clicks===3?'다시 먹이 주기':'먹이 주기'}</span><span className="shrink-0 text-xs tabular-nums">{clicks}/3</span></Button>{active&&<Button variant="secondary" className="min-h-11 rounded-full" disabled={pending} onClick={stop}>그만하기</Button>}</div>
  </div>}
 </>
}
