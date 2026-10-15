import { fishingMessage } from './fishing-messages'
import type { Species } from '@/features/collection/api'
import type { TensionOptions } from './tension-game'
import { plannedFailureMessages } from './fishing-practice'
import { FishingWater } from './fishing-water'
import type { FishingVisual } from './fishing-water'
import { useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fishBehavior, fishForce, fishStrength, newTensionGame, stepTensionGame } from './tension-game'

export function TensionFishingGame({onCaught,onCancel,active=true,regionId='pongdang',quiet=false,challenge,outline,onFailed,practice=false}:{practice?:boolean;challenge?:TensionOptions;outline?:Species|null;onFailed?:(reason:string)=>void;quiet?:boolean;regionId?:string;onCaught:()=>void;onCancel:()=>void;active?:boolean}){
 const [game,setGame]=useState(()=>newTensionGame(Math.random,challenge))
 const current=useRef(game),holding=useRef(false),completed=useRef(false),failed=useRef(false),pointer=useRef<number|null>(null),pullButton=useRef<HTMLButtonElement>(null)
 const caught=useRef(onCaught),failure=useRef(onFailed)
 const [pressed,setPressed]=useState(false)
 const [visual,setVisual]=useState<FishingVisual>({time:0,tension:38,reel:0,ending:0})
 const animation=useRef(visual)
 useEffect(()=>{caught.current=onCaught;failure.current=onFailed},[onCaught,onFailed])
 const release=()=>{pointer.current=null;holding.current=false;setPressed(false)}
 useEffect(()=>{if(game.phase==='playing')pullButton.current?.focus({preventScroll:true})},[game.phase])
 useEffect(()=>{
  if(!active)return
  let raf=0,last=0
  const reset=()=>{pointer.current=null;holding.current=false;setPressed(false);last=0}
  const visibility=()=>{if(document.hidden)reset()}
  const draw=(now:number)=>{
   if(!document.hidden){if(last){const dt=Math.min((now-last)/1000,.1);current.current=stepTensionGame(current.current,dt,holding.current);setGame(current.current);const v=animation.current,terminal=current.current.phase==='won'||current.current.phase==='lost';v.time+=dt;v.tension+=(current.current.tension-v.tension)*(1-Math.exp(-dt*14));v.reel+=(holding.current?Math.max(-35,230*(1-fishForce(current.current.time,current.current.seed,current.current.rarity)/fishStrength[current.current.rarity].reel)):-55)*dt;if(terminal)v.ending+=dt;setVisual({...v})}last=now}
   else last=0
   if(current.current.phase==='won'&&animation.current.ending>=1.15&&!completed.current){completed.current=true;caught.current();return}
   if(current.current.phase==='lost'&&animation.current.ending>=.65&&failure.current&&!failed.current){failed.current=true;failure.current(current.current.reason??'escape');return}
   raf=requestAnimationFrame(draw)
  }
  raf=requestAnimationFrame(draw)
  window.addEventListener('blur',reset);document.addEventListener('visibilitychange',visibility)
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',visibility)}
 },[active])
 const waiting=game.phase==='waiting',lost=game.phase==='lost',won=game.phase==='won'
 const label=!active?'낚싯대가 준비됐어요':fishingMessage(game)
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches
 return <div role="group" aria-label="낚시터" className="relative h-full min-h-0 w-full">
   <div className="absolute inset-0 overflow-hidden bg-[#123c68]">
    <FishingWater game={game} visual={visual} mood={fishBehavior(game.time,game.seed,game.rarity).mood} active={active} reduced={reduced} regionId={regionId} pulling={pressed} label={quiet?undefined:label} outline={outline}/>
    {active&&!waiting&&!lost&&!won&&<div className="pointer-events-none absolute inset-0 transition-opacity duration-200" style={{opacity:Math.max(0,(visual.tension-85)/15,(20-visual.tension)/20),boxShadow:'inset 0 0 65px #f3a77966'}} aria-hidden="true"/>}
    <span className="absolute right-3 top-3 rounded-full bg-black/15 px-3 py-1 text-[11px] text-white/85">{!active?'낚시 준비':waiting?'입질 대기':lost?'다시 도전할 수 있어요':`남은 거리 ${Math.round((1-game.progress)*100)}%`}</span>
   </div>


   {active&&!waiting&&!lost&&<span role="meter" aria-label="버티는 힘" aria-valuenow={Math.round(game.tension)} aria-valuemin={0} aria-valuemax={100} className="sr-only"/>}
   {active&&(lost?<div className="absolute inset-x-4 bottom-40 mx-auto max-w-sm space-y-3 rounded-2xl bg-background/95 p-4"><p className="text-center text-xs text-muted-foreground">{game.reason&&game.reason in plannedFailureMessages?plannedFailureMessages[game.reason as keyof typeof plannedFailureMessages]:game.reason==='snap'?'너무 팽팽해져 줄이 끊어졌어요.':game.reason==='slack'?'버티는 힘이 다해 물고기를 놓쳤어요.':'조금 더 힘차게 당겨볼까요?'} {practice?'연습에서는 미끼를 사용하지 않아요.':'사용한 미끼 1개는 소모됐어요.'}</p>{!onFailed&&<Button className="min-h-12 w-full" onClick={()=>{release();failed.current=false;current.current=newTensionGame(Math.random,challenge);animation.current={time:0,tension:38,reel:0,ending:0};setVisual(animation.current);setGame(current.current)}}><RotateCcw/>다시 도전</Button>}</div>:<button ref={pullButton} type="button" disabled={waiting||won} aria-label="꾹 눌러 당기기" aria-pressed={pressed} className={`absolute bottom-6 right-5 flex size-24 touch-none select-none transition-[transform,box-shadow] duration-150 motion-reduce:transition-none items-center justify-center rounded-full text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${pressed?'scale-95 bg-primary-hover text-primary-foreground shadow-[0_0_28px_#94cfff55]':'bg-primary text-primary-foreground'}`}
    onPointerDown={e=>{if(pointer.current!==null||waiting||won)return;e.preventDefault();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);holding.current=true;setPressed(true)}}
    onPointerUp={e=>{if(pointer.current===e.pointerId)release()}} onPointerCancel={release} onLostPointerCapture={release} onContextMenu={e=>e.preventDefault()}
    onKeyDown={e=>{if(!waiting&&!won&&(e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();holding.current=true;setPressed(true)}}} onKeyUp={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();release()}}} onBlur={release}><svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true"><circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="4"/><circle cx="50" cy="50" r="45" fill="none" stroke={game.tension>85||game.tension<20?'#ffc0a5':'#d8efff'} strokeWidth="4" strokeDasharray={`${visual.tension/100*283} 283`} transform="rotate(-90 50 50)"/><g transform={`rotate(${reduced?0:visual.reel} 50 50)`}><circle cx="50" cy="50" r="24" fill="none" stroke="currentColor" strokeOpacity=".7" strokeWidth="2"/><path d="M29 50h42M50 29v42" stroke="currentColor" strokeWidth="3"/><circle cx="69" cy="50" r="7" fill="#e4bf91"/><circle cx="50" cy="50" r="7" fill="currentColor"/></g></svg><span className="sr-only">{waiting?'찌가 잠기면 시작해요':pressed?'당기는 중 · 떼면 줄 풀기':'꾹 눌러 당기기'}</span></button>)}
   {active&&!lost&&!won&&<p className="pointer-events-none absolute bottom-32 right-4 max-w-40 text-center text-[11px] text-white/85">{waiting?'입질이 오면 꾹 눌러 버텨요':won?'조금만 기다려주세요':'0에서 1.5초면 놓쳐요 · 꾹 눌러 회복'}</p>}
   {active&&<Button variant="ghost" className="absolute bottom-24 left-4 min-h-11 bg-black/20 px-4 text-xs text-white hover:bg-black/30 hover:text-white" onClick={onCancel}>그만하기</Button>}
 </div>
}
