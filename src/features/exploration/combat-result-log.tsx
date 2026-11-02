import type {ReactNode} from 'react'
import type {CombatEvent} from './combat-state'
import {ChoiceLog} from './choice-log'

function resultSentence(event:CombatEvent):{sentence:ReactNode;tone:string}|undefined{
 if(event.kind==='system'&&event.spellId==='soul-knot')return {sentence:<>영혼의 매듭으로 <strong>체력 1</strong>로 살아남았습니다.</>,tone:'recovery'}
 if(event.effect==='miss'&&event.kind==='player')return {sentence:'공격이 빗나갔습니다.',tone:'neutral'}
 if(event.damage!==undefined&&(event.kind==='monster'||event.kind==='player'||event.effect==='bleed')){
  const incoming=event.kind==='monster'||event.target==='player'
  return {sentence:<>{event.effect==='bleed'&&'출혈로 '}{event.critical&&<small className="combat-result-critical">치명타</small>}<strong>{event.damage} 피해</strong>를 {incoming?'입었습니다.':'입혔습니다.'}</>,tone:incoming?'harm':'damage'}
 }
 if(event.healing!==undefined)return {sentence:<>{event.effect==='enemy-heal'&&'적이 '}<strong>체력 {event.healing}</strong>를 회복했습니다.</>,tone:event.effect==='enemy-heal'?'neutral':'recovery'}
 if(event.manaRestored!==undefined)return {sentence:<><strong>마나 {event.manaRestored}</strong>를 회복했습니다.</>,tone:'mana'}
 return undefined
}

/** Keep the complete events accessible and in history. */
export function CombatResultLog({event,text,speaker,nickname,avatarPath,moveName}:{event?:CombatEvent;text:string;speaker:string;nickname?:string;avatarPath?:string|null;moveName?:string}){
 const result=event&&resultSentence(event)
 if(!result)return <ChoiceLog event={event} speaker={speaker} nickname={nickname} avatarPath={avatarPath} className="exploration-enemy-intent" text={text}/>
 return <div className="exploration-choice-log exploration-enemy-intent combat-result-log" data-tone={result.tone} role="status" aria-live="polite" aria-label="탐험 로그">
  <div className="combat-result-sentences" aria-hidden="true">
   <p data-tone={result.tone}>{moveName&&<span className="combat-used-move-name">{moveName} · </span>}{result.sentence}</p>
  </div>
  <span className="sr-only">{speaker}: {text}</span>
 </div>
}
