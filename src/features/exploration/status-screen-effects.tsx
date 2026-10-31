import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react'
import {createPortal} from 'react-dom'
import {Droplets} from 'lucide-react'
import {AilmentIcon,type AilmentKind} from './ailments'
import type {TurnFeedback} from './combat-state'
import type {PracticeState} from './practice-state'
import './status-screen-effects.css'

type StatusKind=AilmentKind|'magic-break'
type CueKind=StatusKind|'mana-drain'
const kinds:StatusKind[]=['bleed','blind','weaken','magic-break','burn','freeze']
const names:Record<CueKind,string>={bleed:'출혈',blind:'실명',weaken:'약화','magic-break':'마법 저항력 감소',burn:'화상',freeze:'빙결','mana-drain':'마나 흡수'}
type Cue={id:number;kinds:CueKind[];labels:CueKind[];drainX:number;drainY:number}

function playerStatuses(state:PracticeState):StatusKind[]{
 if(state.hp<=0||state.completed)return []
 const active=new Set<StatusKind>((state.playerEffects??[]).filter(effect=>effect.turns>0).map(effect=>effect.kind))
 if(state.combat?.status==='active'){
  if(state.combat.playerBlind)active.add('blind')
  if(state.combat.playerWeaken)active.add('weaken')
  if(state.combat.magicResistanceDown)active.add('magic-break')
 }
 return kinds.filter(kind=>active.has(kind))
}

function StatusArt({kind}:{kind:CueKind}){
 return <>
  <div className="status-fx-texture"/>
  {(kind==='bleed'||kind==='magic-break'||kind==='weaken'||kind==='freeze')&&<svg className="status-fx-art" viewBox="0 0 1000 700" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.5">
   {kind==='bleed'?<g strokeWidth="3"><path d="M0 180 110 95M12 210 135 120M900 620l100-95M920 660l80-65"/><path d="m0 500 55-30M950 130l50-45" opacity=".45"/></g>:kind==='magic-break'?<><path d="m0 100 44 45-18 40 58 48-25 52 35 40M1000 170l-46 28 20 35-48 28 25 50-40 22M0 600l55-28 12-35 48-15M1000 620l-50-20-20 15-30-50"/><path d="m44 145 35-18 16 32m-69 26 43 4m885 9-26-24m22 426 12-35" opacity=".7"/></>:kind==='weaken'?<g><path d="M25 90v130m-9-110h18m-18 50h18m-9 15-9 16 9 16 9-16ZM975 380v170m-9-145h18m-9 15-9 16 9 16 9-16Zm-9 65h18M20 400v150m-8-120h16m-8 30-8 14 8 14 8-14ZM980 85v130m-9-110h18m-9 35-8 14 8 14 8-14Z"/><path d="M70 9h100m660 682h100" opacity=".5"/></g>:<g><path d="M0 60 60 0M0 130 130 0M870 0l130 130M940 0l60 60M0 570l130 130M0 640l60 60m810 0 130-130m-60 130 60-60"/><path d="m25 100 5-30 30-5M925 45l10 30 30 5M35 600l5 35 35 5m870-5 25-5 5-25M0 180l45-30-15-45M1000 510l-45 35 12 35"/></g>}
  </svg>}
  {kind!=='bleed'&&kind!=='magic-break'&&kind!=='weaken'&&<div className="status-fx-motes">{Array.from({length:10},(_,index)=><i key={index} style={{'--mote-x':`${index%2===0?3+index*2:97-index*2}%`,'--mote-delay':`${-index*.61}s`,'--mote-size':`${2+index%3}px`} as CSSProperties}/>)}</div>}
 </>
}

function StatusLayer({kind,active}:{kind:StatusKind;active:boolean}){
 const [present,setPresent]=useState(active)
 useEffect(()=>{
  if(active){setPresent(true);return}
  const timer=setTimeout(()=>setPresent(false),400)
  return()=>clearTimeout(timer)
 },[active])
 return present?<div className="exploration-status-layer" data-fx={kind} data-phase={active?'active':'leaving'}><StatusArt kind={kind}/></div>:null
}

export function StatusScreenEffects({state,feedback}:{state:PracticeState;feedback:TurnFeedback|null}){
 const alive=state.hp>0&&!state.completed
 const active=useMemo(()=>playerStatuses(state),[state.playerEffects,state.combat,state.hp,state.completed])
 const previous=useRef<StatusKind[]>([]),processed=useRef(''),sequence=useRef(0)
 const [cue,setCue]=useState<Cue|null>(null)
 useEffect(()=>{
  if(!alive){previous.current=[];setCue(null);return}
  const added=active.filter(kind=>!previous.current.includes(kind));previous.current=active
  const pulses=new Set<CueKind>(added),labels=new Set<CueKind>(added)
  if(feedback&&(feedback.phase==='player'||feedback.phase==='reply')){
   const token=`${feedback.id}:${feedback.phase}`
   if(processed.current!==token){
    processed.current=token
    for(const event of feedback.events){
     if(feedback.phase==='player'&&event.effect==='bleed'&&event.target==='player'&&(event.damage??0)>0)pulses.add('bleed')
     if(feedback.phase!=='reply'||event.kind!=='status'||event.target==='monster'||!event.source)continue
     if(event.effect==='mana-drain'&&(event.manaLost??0)>0){pulses.add('mana-drain');labels.add('mana-drain')}
     else if(kinds.includes(event.effect as StatusKind)&&event.damage===undefined){pulses.add(event.effect as StatusKind);labels.add(event.effect as StatusKind)}
    }
   }
  }
  if(!pulses.size)return
  const enemy=document.querySelector('.exploration-enemy-art')?.getBoundingClientRect()
  setCue({id:++sequence.current,kinds:[...pulses],labels:[...labels],drainX:enemy?.width?enemy.left+enemy.width/2-window.innerWidth/2:0,drainY:enemy?.height?enemy.top+enemy.height/2-window.innerHeight/2:-window.innerHeight*.16})
 },[active,feedback,alive])
 useEffect(()=>{
  if(!cue)return
  const timer=setTimeout(()=>setCue(null),500)
  return()=>clearTimeout(timer)
 },[cue])
 if(!alive)return null
 return createPortal(<div className="exploration-status-screen" aria-hidden="true" style={{'--status-strength':1/Math.sqrt(Math.max(1,active.length))} as CSSProperties}>
  {kinds.map(kind=><StatusLayer key={kind} kind={kind} active={active.includes(kind)}/>)}
  {cue&&<div key={cue.id} className="exploration-status-cue">
   {cue.kinds.map(kind=><div className="exploration-status-burst" data-fx={kind} key={kind} style={{'--drain-x':`${cue.drainX}px`,'--drain-y':`${cue.drainY}px`} as CSSProperties}>{kind==='mana-drain'?<div className="status-drain-particles">{Array.from({length:12},(_,index)=><i key={index} style={{'--drain-start-x':`${(index%4-1.5)*22}px`,'--drain-start-y':`${(Math.floor(index/4)-1)*22}px`,'--drain-delay':`${index*8}ms`} as CSSProperties}/>)}</div>:<StatusArt kind={kind}/>}</div>)}
   {!!cue.labels.length&&<div className="exploration-status-toasts">{cue.labels.map(kind=><div className="exploration-status-toast" data-fx={kind} key={kind}>{kind==='mana-drain'?<Droplets/>:<AilmentIcon kind={kind}/>}<span>{names[kind]}</span></div>)}</div>}
  </div>}
 </div>,document.body)
}
