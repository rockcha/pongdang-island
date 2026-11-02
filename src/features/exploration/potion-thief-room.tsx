import {useEffect,useRef,useState} from 'react'
import {ChoiceLog} from './choice-log'
import {stolenPotionLabel,type StolenPotions} from './potion-theft'

export function PotionThiefRoom({stolen,busy,onFight,onLeave,canFight=true}:{stolen:StolenPotions;busy:boolean;onFight:()=>void;onLeave:()=>void;canFight?:boolean}){
 const [phase,setPhase]=useState<'approach'|'taking'|'ready'>('approach')
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 useEffect(()=>()=>clearTimeout(timer.current),[])
 function advance(){clearTimeout(timer.current);timer.current=setTimeout(()=>setPhase(phase==='approach'?'taking':'ready'),phase==='approach'?1000:1200)}
 const revealed=phase!=='approach'
 const carrying=stolen.health+stolen.mana>0
 return <section className="exploration-adventure-room is-thief" aria-label="탐험 방 · 포션 도둑">
  <div className="potion-thief-stage">{revealed&&<img className="verified-room-portrait potion-thief-entrance" src="/exploration/rooms/desert-thief.png" alt="포션 도둑"/>}</div>
  <div className="exploration-room-panel">
   <ChoiceLog speaker="탐험" text={revealed?(carrying?`도둑이 ${stolenPotionLabel(stolen)}를 챙겼다.${canFight?' 싸워서 되찾을까?':''}`:'도둑은 빈 포션 주머니를 보고 물러섭니다.'): '누군가 천천히 다가온다...'} onTextComplete={phase==='ready'?undefined:advance}/>
   {phase==='ready'&&<div className="exploration-room-decisions">{carrying&&canFight&&<button disabled={busy} onClick={onFight}>싸워서 뺏는다</button>}<button disabled={busy} onClick={onLeave}>보내준다</button></div>}
  </div>
 </section>
}
