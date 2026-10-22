import {useRods} from './rod-provider'
import {fishingRods} from './fishing-rods'
import { fishingMessage } from './fishing-messages'
import type { Species } from '@/features/collection/api'
import type { TensionOptions } from './tension-game'
import { plannedFailureMessages } from './fishing-practice'
import { FishingWater } from './fishing-water'
import {FishingStandby} from './fishing-environment'
import { FishingHelp } from './fishing-help'
import {FishingRumorCard} from './fishing-rumor-card'
import { FishingReel } from './fishing-reel'
import type { FishingStart } from './fishing-reel'
import type { FishingVisual } from './fishing-water'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RotateCcw,TimerReset } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fishBehavior, fishForce, fishStrength, newTensionGame, stepTensionGame,reduceTensionWait } from './tension-game'

export function TensionFishingGame({onCaught,active=true,paused=false,regionId='pongdang',regionName,toolbarTarget,quiet=false,castId,challenge,outline,onFailed,practice=false,start,baitImage,onAdvanceWait,waitReductionSeconds=0}:{onAdvanceWait?:()=>void|Promise<void>;waitReductionSeconds?:number;baitImage?:string;regionName?:string;toolbarTarget?:HTMLElement|null;start?:FishingStart;practice?:boolean;challenge?:TensionOptions;outline?:Species|null;onFailed?:(reason:string)=>void;quiet?:boolean;castId?:string;regionId?:string;onCaught:()=>void;onCancel:()=>void;active?:boolean;paused?:boolean}){
 const {selected}=useRods()
 const rod=fishingRods.find(r=>r.id===selected)??fishingRods[0]
 const [game,setGame]=useState(()=>newTensionGame(Math.random,challenge))
 const current=useRef(game),holding=useRef(false),completed=useRef(false),failed=useRef(false),pointer=useRef<number|null>(null),pullButton=useRef<HTMLButtonElement>(null)
 const caught=useRef(onCaught),failure=useRef(onFailed)
 const [pressed,setPressed]=useState(false)
 const [helpOpen,setHelpOpen]=useState(false)
 const [advancing,setAdvancing]=useState(false)
 const advancingLock=useRef(false),appliedReduction=useRef(0)
 const [visual,setVisual]=useState<FishingVisual>({time:0,tension:38,reel:0,ending:0})
 const animation=useRef(visual)
 useLayoutEffect(()=>{
  const next=newTensionGame(Math.random,{rarity:challenge?.rarity,wait:challenge?.wait,failureAt:challenge?.failureAt,failureReason:challenge?.failureReason})
  appliedReduction.current=0
  current.current=next;holding.current=false;pointer.current=null;completed.current=false;failed.current=false
  animation.current={time:0,tension:38,reel:0,ending:0}
  setGame(next);setVisual(animation.current);setPressed(false);setHelpOpen(false)
 },[active,castId,challenge?.rarity,challenge?.wait,challenge?.failureAt,challenge?.failureReason])
 useLayoutEffect(()=>{
  const difference=waitReductionSeconds-appliedReduction.current
  appliedReduction.current=waitReductionSeconds
  if(difference>0)current.current=reduceTensionWait(current.current,difference)
 },[waitReductionSeconds,active,castId,challenge?.rarity,challenge?.wait,challenge?.failureAt,challenge?.failureReason])
 useEffect(()=>{caught.current=onCaught;failure.current=onFailed},[onCaught,onFailed])
 const release=()=>{pointer.current=null;holding.current=false;setPressed(false)}
 useEffect(()=>{if(game.phase==='playing'&&game.failureAt===undefined)pullButton.current?.focus({preventScroll:true})},[game.phase])
 useEffect(()=>{
  if(!active||helpOpen||paused){pointer.current=null;holding.current=false;setPressed(false);return}
  let raf=0,last=0
  const reset=()=>{pointer.current=null;holding.current=false;setPressed(false);last=0}
  const visibility=()=>{if(document.hidden)reset()}
  const draw=(now:number)=>{
   if(!document.hidden){if(last){const dt=Math.min((now-last)/1000,.1);current.current=stepTensionGame(current.current,dt,holding.current);setGame(current.current);const v=animation.current,terminal=current.current.phase==='won'||current.current.phase==='lost';v.time+=dt;const gaugeChange=(current.current.tension-v.tension)*(1-Math.exp(-dt*14));v.tension+=gaugeChange;v.reel+=gaugeChange*9;if(terminal)v.ending+=dt;setVisual({...v})}last=now}
   else last=0
   // Leave the surface splash visible before the catch result covers the water.
   if(current.current.phase==='won'&&animation.current.ending>=.65&&!completed.current){completed.current=true;caught.current();return}
   if(current.current.phase==='lost'&&animation.current.ending>=.65&&failure.current&&!failed.current){failed.current=true;failure.current(current.current.reason??'escape');return}
   raf=requestAnimationFrame(draw)
  }
  raf=requestAnimationFrame(draw)
  window.addEventListener('blur',reset);document.addEventListener('visibilitychange',visibility)
  return()=>{cancelAnimationFrame(raf);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',visibility)}
 },[active,helpOpen,paused])
 const waiting=game.phase==='waiting',lost=game.phase==='lost',won=game.phase==='won'
 const plannedFailure=game.failureAt!==undefined
 const label=!active?'낚싯대가 준비됐어요':fishingMessage(game)
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches
 const behavior=fishBehavior(game.time,game.seed,game.rarity)
 const tug=active&&!plannedFailure&&!helpOpen&&!paused&&!reduced&&game.phase==='playing'&&behavior.mood==='surge'?Math.min(1,fishForce(game.time,game.seed,game.rarity)/(fishStrength[game.rarity].surge*.48)):0
 // Only the crest of each effort wave gives the scenery a short, gentle jolt.
 const jolt=Math.max(0,(tug-.9)/.1)
 const sceneMotion=jolt>0?`translate(${Math.sin(visual.time*43)*jolt*1.2}px, ${Math.cos(visual.time*37)*jolt*.7}px)`:undefined
 async function advanceWait(){
  if(!onAdvanceWait||advancingLock.current||!active||paused||helpOpen||current.current.phase!=='waiting')return
  advancingLock.current=true;setAdvancing(true)
  try{await onAdvanceWait()}finally{advancingLock.current=false;setAdvancing(false)}
 }
 return <div role="group" aria-label="낚시터" className="relative h-full min-h-0 w-full">
   <div className="absolute inset-0 overflow-hidden bg-[#123c68]">
    <div className="absolute -inset-1" style={{transform:sceneMotion}}>
     <div data-fishing-camera="front" className="absolute inset-0"><FishingStandby regionId={regionId}/></div>
     <div data-fishing-effects="true" aria-hidden={!active} className="absolute inset-0 transition-opacity duration-300 motion-reduce:transition-none" style={{opacity:active?1:0}}>
     <FishingWater sceneryOverlay showGauge={active&&!plannedFailure&&game.phase==='playing'} baitImage={baitImage} rod={rod} game={game} visual={visual} mood={behavior.mood} active={active} reduced={reduced} regionId={regionId} regionName={regionName} pulling={pressed} label={quiet||(active&&plannedFailure)?undefined:label} outline={outline}/>
     </div>
    </div>
    {active&&!plannedFailure&&!waiting&&!lost&&!won&&<div className="pointer-events-none absolute inset-0 transition-opacity duration-200" style={{opacity:Math.max(0,(visual.tension-85)/15,(20-visual.tension)/20),boxShadow:'inset 0 0 65px #f3a77966'}} aria-hidden="true"/>}
   </div>
   {tug>0&&createPortal(<div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40" style={{opacity:tug*.32,background:'radial-gradient(ellipse at center, transparent 52%, #81e6df55 78%, #a6f4ef 100%)',boxShadow:'inset 0 0 42px #a6f4ef55'}}/>,document.body)}


   {!toolbarTarget&&<FishingHelp open={helpOpen} onOpenChange={open=>{release();setHelpOpen(open)}}/>}
   {active&&waiting&&!plannedFailure&&!paused&&!helpOpen&&<FishingRumorCard seed={game.seed} page={Math.floor(game.time/12)}/>}
   {onAdvanceWait&&active&&waiting&&!paused&&!helpOpen&&<Button variant="outline" disabled={advancing} onClick={()=>void advanceWait()} className="absolute left-3 top-16 z-20 min-h-11 gap-2 rounded-full border-white/60 bg-background/95 px-3 text-xs shadow-sm"><TimerReset aria-hidden="true" className="size-4"/>{advancing?'당기는 중…':'대기 10초 당기기'}<span className="text-[9px] text-muted-foreground">테스트</span></Button>}
   {active&&!plannedFailure&&!waiting&&!lost&&<span role="meter" aria-label="버티는 힘" aria-valuenow={Math.round(game.tension)} aria-valuemin={0} aria-valuemax={100} className="sr-only"/>}
   {active&&lost&&!onFailed&&<div className="absolute inset-x-4 bottom-40 mx-auto max-w-sm space-y-3 rounded-2xl bg-background/95 p-4"><p className="text-center text-xs text-muted-foreground">{game.reason&&game.reason in plannedFailureMessages?plannedFailureMessages[game.reason as keyof typeof plannedFailureMessages]:game.reason==='snap'?'너무 팽팽해져 줄이 끊어졌어요.':game.reason==='slack'?'낚싯줄이 느슨해져 물고기가 빠져나갔어요.':'조금 더 힘차게 당겨볼까요?'} {practice?'연습에서는 미끼를 사용하지 않아요.':''}</p>{!onFailed&&<Button className="min-h-12 w-full" onClick={()=>{release();failed.current=false;current.current=newTensionGame(Math.random,challenge);animation.current={time:0,tension:38,reel:0,ending:0};setVisual(animation.current);setGame(current.current)}}><RotateCcw/>다시 도전</Button>}</div>}
   {!lost&&(!quiet||active)&&<FishingReel hideGauge rod={rod} active={active} waiting={waiting||plannedFailure} won={won} pressed={pressed} reduced={reduced} tension={visual.tension} rotation={visual.reel} start={start} buttonRef={pullButton} onHold={pointerId=>{if(paused||plannedFailure||pointer.current!==null)return;pointer.current=pointerId??null;holding.current=true;setPressed(true)}} onRelease={release}/>}
 </div>
}
