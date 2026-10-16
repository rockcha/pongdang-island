import { fishingMessage } from './fishing-messages'
import type { Species } from '@/features/collection/api'
import type { TensionOptions } from './tension-game'
import { plannedFailureMessages } from './fishing-practice'
import { FishingWater } from './fishing-water'
import { FishingHelp } from './fishing-help'
import { FishingReel } from './fishing-reel'
import type { FishingStart } from './fishing-reel'
import type { FishingVisual } from './fishing-water'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fishBehavior, fishForce, fishStrength, newTensionGame, stepTensionGame } from './tension-game'

export function TensionFishingGame({onCaught,onCancel,active=true,regionId='pongdang',quiet=false,challenge,outline,onFailed,practice=false,start}:{start?:FishingStart;practice?:boolean;challenge?:TensionOptions;outline?:Species|null;onFailed?:(reason:string)=>void;quiet?:boolean;regionId?:string;onCaught:()=>void;onCancel:()=>void;active?:boolean}){
 const [game,setGame]=useState(()=>newTensionGame(Math.random,challenge))
 const current=useRef(game),holding=useRef(false),completed=useRef(false),failed=useRef(false),pointer=useRef<number|null>(null),pullButton=useRef<HTMLButtonElement>(null)
 const caught=useRef(onCaught),failure=useRef(onFailed)
 const [pressed,setPressed]=useState(false)
 const [helpOpen,setHelpOpen]=useState(false)
 const [visual,setVisual]=useState<FishingVisual>({time:0,tension:38,reel:0,ending:0})
 const animation=useRef(visual)
 useEffect(()=>{caught.current=onCaught;failure.current=onFailed},[onCaught,onFailed])
 const release=()=>{pointer.current=null;holding.current=false;setPressed(false)}
 useEffect(()=>{if(game.phase==='playing')pullButton.current?.focus({preventScroll:true})},[game.phase])
 useEffect(()=>{
  if(!active||helpOpen)return
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
 },[active,helpOpen])
 const waiting=game.phase==='waiting',lost=game.phase==='lost',won=game.phase==='won'
 const label=!active?'낚싯대가 준비됐어요':fishingMessage(game)
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches
 const behavior=fishBehavior(game.time,game.seed,game.rarity)
 const tug=active&&!helpOpen&&!reduced&&game.phase==='playing'&&behavior.mood==='surge'?Math.min(1,fishForce(game.time,game.seed,game.rarity)/(fishStrength[game.rarity].surge*.48)):0
 // Only the crest of each effort wave gives the scenery a short, gentle jolt.
 const jolt=Math.max(0,(tug-.9)/.1)
 const sceneMotion=jolt>0?`translate(${Math.sin(visual.time*43)*jolt*1.2}px, ${Math.cos(visual.time*37)*jolt*.7}px)`:undefined
 return <div role="group" aria-label="낚시터" className="relative h-full min-h-0 w-full">
   <div className="absolute inset-0 overflow-hidden bg-[#123c68]">
    <div className="absolute -inset-1" style={{transform:sceneMotion}}>
     <FishingWater game={game} visual={visual} mood={behavior.mood} active={active} reduced={reduced} regionId={regionId} pulling={pressed} label={quiet?undefined:label} outline={outline}/>
    </div>
    {active&&!waiting&&!lost&&!won&&<div className="pointer-events-none absolute inset-0 transition-opacity duration-200" style={{opacity:Math.max(0,(visual.tension-85)/15,(20-visual.tension)/20),boxShadow:'inset 0 0 65px #f3a77966'}} aria-hidden="true"/>}
   </div>
   {tug>0&&createPortal(<div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40" style={{opacity:tug*.32,background:'radial-gradient(ellipse at center, transparent 52%, #81e6df55 78%, #a6f4ef 100%)',boxShadow:'inset 0 0 42px #a6f4ef55'}}/>,document.body)}


   <FishingHelp open={helpOpen} onOpenChange={open=>{release();setHelpOpen(open)}}/>
   {active&&!waiting&&!lost&&<span role="meter" aria-label="버티는 힘" aria-valuenow={Math.round(game.tension)} aria-valuemin={0} aria-valuemax={100} className="sr-only"/>}
   {active&&lost&&!onFailed&&<div className="absolute inset-x-4 bottom-40 mx-auto max-w-sm space-y-3 rounded-2xl bg-background/95 p-4"><p className="text-center text-xs text-muted-foreground">{game.reason&&game.reason in plannedFailureMessages?plannedFailureMessages[game.reason as keyof typeof plannedFailureMessages]:game.reason==='snap'?'너무 팽팽해져 줄이 끊어졌어요.':game.reason==='slack'?'낚싯줄이 느슨해져 물고기가 빠져나갔어요.':'조금 더 힘차게 당겨볼까요?'} {practice?'연습에서는 미끼를 사용하지 않아요.':'사용한 미끼 1개는 소모됐어요.'}</p>{!onFailed&&<Button className="min-h-12 w-full" onClick={()=>{release();failed.current=false;current.current=newTensionGame(Math.random,challenge);animation.current={time:0,tension:38,reel:0,ending:0};setVisual(animation.current);setGame(current.current)}}><RotateCcw/>다시 도전</Button>}</div>}
   {!lost&&(!quiet||active)&&<FishingReel active={active} waiting={waiting} won={won} pressed={pressed} reduced={reduced} tension={visual.tension} rotation={visual.reel} start={start} buttonRef={pullButton} onHold={pointerId=>{if(pointer.current!==null)return;pointer.current=pointerId??null;holding.current=true;setPressed(true)}} onRelease={release}/>}
   {active&&<Button variant="ghost" className="absolute bottom-24 left-4 min-h-11 bg-black/20 px-4 text-xs text-white hover:bg-black/30 hover:text-white" onClick={onCancel}>그만하기</Button>}
 </div>
}
