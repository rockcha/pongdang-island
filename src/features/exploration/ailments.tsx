import {useState} from 'react'
import {Info} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import type {PracticeState} from './practice-state'

export type AilmentKind='bleed'|'freeze'|'burn'|'weaken'|'blind'
export type EnemyAilment={kind:AilmentKind;amount:number;turns:number}
const definitions={
 bleed:{name:'출혈',rule:'적 행동 종료 시 지속 피해',example:2},
 freeze:{name:'빙결',rule:'남은 횟수만큼 행동 불가',example:1},
 burn:{name:'화상',rule:'받는 치유량 감소',example:40},
 weaken:{name:'약화',rule:'공격 피해 감소',example:2},
 blind:{name:'실명',rule:'공격이 빗나갈 확률 증가',example:20},
} as const
export function ailmentDescription(effect:EnemyAilment){
 const {kind,amount,turns}=effect
 const detail=kind==='bleed'?`턴당 피해 ${amount}`:kind==='freeze'?'행동 불가':kind==='burn'?`치유량 ${amount}% 감소`:kind==='weaken'?`공격 피해 ${amount} 감소`:`빗나갈 확률 +${amount}%p`
 return `${definitions[kind].name} · ${detail} · ${turns}${kind==='freeze'?'회':'턴'} 남음`
}
export function AilmentIcon({kind}:{kind:AilmentKind|'magic-break'|'shield'|'might'}){
 if(kind==='shield'||kind==='might')return <svg className="ailment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{kind==='shield'?<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/>:<path d="m14 3 7 1-1 7-10 10-7-7ZM4 10l10 10"/>}</svg>
 if(kind==='magic-break')return <svg className="ailment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m12 6 2 4 4 2-4 2-2 4-2-4-4-2 4-2ZM3 3l18 18"/></svg>
 return <svg className="ailment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {kind==='bleed'?<><path d="M12 3C10 7 5 11 5 15a7 7 0 0 0 14 0c0-4-5-8-7-12Z" fill="currentColor" fillOpacity=".15"/><path d="M8 15a4 4 0 0 0 4 4"/></>:kind==='freeze'?<><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M17 19l-1-4 4-1M4 14l4 1-1 4M17 5l-1 4 4 1"/></>:kind==='burn'?<><path d="M13 2c1 6-5 6-4 11-2-1-2-3-2-3-5 7-1 12 5 12 7 0 11-8 5-14 0 3-2 4-2 4 1-5-2-10-2-10Z" fill="currentColor" fillOpacity=".12"/><path d="M8 17h8M12 13v8M7 22 18 11"/></>:kind==='weaken'?<><path d="m16 3 3 1-1 4-8 8-3-3ZM5 12l7 7M8 16l-5 5M15 13v8m-3-3 3 3 3-3"/></>:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><path d="m3 3 18 18M10 10a3 3 0 0 0 4 4"/></>}
 </svg>
}

export function EnemyAilments({effects}:{effects:EnemyAilment[]}){
 const [selected,setSelected]=useState<AilmentKind|null>(null)
 const effect=effects.find(item=>item.kind===selected)
 if(!effects.length)return null
 return <><ul className="exploration-ailments" aria-label="몬스터 상태이상">{effects.map(item=><li key={item.kind}><button className="ailment-badge" data-ailment={item.kind} aria-label={ailmentDescription(item)} onClick={()=>setSelected(item.kind)}>
  <AilmentIcon kind={item.kind}/><span>{definitions[item.kind].name}</span><strong>{item.kind==='freeze'?'봉쇄':item.kind==='bleed'?`−${item.amount}`:item.kind==='weaken'?`−${item.amount}`:`${item.amount}%`}</strong><small>{item.turns}{item.kind==='freeze'?'회':'턴'}</small>
 </button></li>)}</ul><Dialog open={!!effect} onOpenChange={open=>{if(!open)setSelected(null)}}><DialogContent className="exploration-modal exploration-ailment-guide"><DialogHeader><DialogTitle>{effect?definitions[effect.kind].name:'상태이상'}</DialogTitle><DialogDescription>{effect?ailmentDescription(effect):''}</DialogDescription></DialogHeader><p>{effect?definitions[effect.kind].rule:''}</p></DialogContent></Dialog></>
}

export function PlayerAilments({state}:{state:PracticeState}){
 const [selected,setSelected]=useState<string|null>(null)
 const effects=state.playerEffects??[]
 const badges:Array<{id:string;kind:AilmentKind|'magic-break'|'shield'|'might';name:string;count:string;detail:string;rule:string}>=effects.map(effect=>({id:effect.kind,kind:effect.kind,name:definitions[effect.kind].name,count:`${effect.turns}${effect.kind==='freeze'?'회':'턴'}`,detail:ailmentDescription(effect),rule:effect.kind==='bleed'?'플레이어 행동이 끝날 때 체력이 감소합니다. 방어력으로 줄일 수 없으며, 정화로 해제할 수 있어요.':definitions[effect.kind].rule}))
 if(state.combat?.status==='active'){
  const {shield,attackBuff}=state.combat
  if(shield)badges.push({id:'shield',kind:'shield',name:'보호막',count:shield.turns+'턴',detail:'공격 피해 '+shield.remaining+' 흡수',rule:'남은 흡수량이나 지속시간이 소진되면 해제됩니다. 출혈에는 적용되지 않아요.'})
  if(attackBuff)badges.push({id:'might',kind:'might',name:'태양왕의 위엄',count:attackBuff.turns+'턴',detail:'공격력 +'+attackBuff.attack+' · 치명타 +'+attackBuff.critical+'%p',rule:'남은 행동 동안 기본 공격이 강화됩니다. 중첩 없이 지속시간을 갱신합니다.'})
  if(state.combat.magicResistanceDown)badges.push({id:'magic-break',kind:'magic-break',name:'마저 감소',count:'1턴',detail:`마법 저항력 ${state.combat.magicResistanceDown} 감소 · 1턴 남음`,rule:'다음 턴의 적 행동이 끝나면 해제됩니다. 저항력은 음수가 될 수 있으며, 다시 맞으면 중첩 없이 1턴으로 갱신합니다.'})
  if(state.combat.playerWeaken)badges.push({id:'combat-weaken',kind:'weaken',name:'약화',count:'1회',detail:`다음 기본 공격력 ${state.combat.playerWeaken} 감소`,rule:'다음 기본 공격을 시도하면 해제됩니다. 마법 사용으로는 소모되지 않으며, 중첩되지 않아요.'})
  if(state.combat.playerBlind)badges.push({id:'combat-blind',kind:'blind',name:'실명',count:'1회',detail:`다음 기본 공격 1회의 명중률 ${state.combat.playerBlind}% 감소`,rule:'기본 공격을 시도하면 해제됩니다. 마법 사용으로는 소모되지 않아요.'})
 }
 const current=badges.find(badge=>badge.id===selected)
 if(!badges.length)return null
 return <div className="exploration-player-ailments"><span className="sr-only">탐험가 상태이상</span><ul aria-label="탐험가 상태이상">{badges.map(badge=><li key={badge.id}><button className="ailment-badge" data-ailment={badge.kind} aria-label={badge.id===badge.kind?badge.detail:`${badge.name} · ${badge.detail} · ${badge.count} 남음`} onClick={()=>setSelected(badge.id)}><AilmentIcon kind={badge.kind}/><span>{badge.name}</span><small>{badge.count}</small></button></li>)}</ul><Dialog open={!!current} onOpenChange={open=>{if(!open)setSelected(null)}}><DialogContent className="exploration-modal exploration-ailment-guide"><DialogHeader><DialogTitle>{current?.name??'상태이상'}</DialogTitle><DialogDescription>탐험가 상태이상 · {current?.detail}</DialogDescription></DialogHeader><p>{current?.rule}</p><small>{current?.count} 남음</small></DialogContent></Dialog></div>
}

export function AilmentGuide(){
 const [open,setOpen]=useState(false)
 return <><button className="ailment-guide-button" aria-label="상태이상 안내" title="상태이상 안내" onClick={()=>setOpen(true)}><Info size={14}/></button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="exploration-modal exploration-ailment-guide"><DialogHeader><DialogTitle>상태이상</DialogTitle><DialogDescription>몬스터 체력바 아래에 효과와 남은 턴을 표시해요. 아이콘을 누르면 자세히 볼 수 있어요.</DialogDescription></DialogHeader><div className="ailment-guide-list">{(Object.keys(definitions) as AilmentKind[]).map(kind=><article key={kind} data-ailment={kind}><AilmentIcon kind={kind}/><div><h3>{definitions[kind].name}</h3><p>{definitions[kind].rule}</p><small>{ailmentDescription({kind,amount:definitions[kind].example,turns:kind==='freeze'?1:2})}</small></div></article>)}</div><p className="ailment-guide-note">위 수치는 표시 예시예요. 실제 효과량과 지속시간은 무기·마법마다 달라요.</p></DialogContent></Dialog></>
}
