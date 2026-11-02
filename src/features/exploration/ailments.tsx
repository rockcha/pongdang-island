import {useState} from 'react'
import {Flame,Info} from 'lucide-react'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import type {PracticeState} from './practice-state'
import {plannedSpells} from './spell-catalog'

import {ailmentDefinitions as definitions,ailmentDescription,type AilmentKind,type EnemyAilment} from './ailment-rules'
export {ailmentDescription,type AilmentKind,type EnemyAilment} from './ailment-rules'
const effectRules:Record<AilmentKind,string>={bleed:'지속 피해량과 남은 횟수는 걸린 효과의 아이콘에서 확인할 수 있어요.',freeze:'대상의 행동을 막습니다. 같은 상대를 연속으로 얼리는 데에는 제한이 있어요.',burn:'지속 피해를 주는 효과가 아니라, 포션과 치유 효과로 회복하는 양을 줄여요.',weaken:'공격으로 주는 피해를 줄입니다. 감소량과 적용 횟수는 걸린 효과에 따라 달라요.',blind:'기본 공격이 빗나갈 확률을 높입니다. 마법의 명중에는 영향을 주지 않아요.'}
export function AilmentIcon({kind}:{kind:AilmentKind|'magic-break'|'shield'|'might'|'lantern'}){
 if(kind==='lantern')return <Flame className="ailment-icon" size={18} aria-hidden="true"/>
 if(kind==='shield'||kind==='might')return <svg className="ailment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{kind==='shield'?<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/>:<path d="m14 3 7 1-1 7-10 10-7-7ZM4 10l10 10"/>}</svg>
 if(kind==='magic-break')return <svg className="ailment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m12 6 2 4 4 2-4 2-2 4-2-4-4-2 4-2ZM3 3l18 18"/></svg>
 return <svg className="ailment-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {kind==='bleed'?<><path d="M12 3C10 7 5 11 5 15a7 7 0 0 0 14 0c0-4-5-8-7-12Z" fill="currentColor" fillOpacity=".15"/><path d="M8 15a4 4 0 0 0 4 4"/></>:kind==='freeze'?<><path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M17 19l-1-4 4-1M4 14l4 1-1 4M17 5l-1 4 4 1"/></>:kind==='burn'?<><path d="M13 2c1 6-5 6-4 11-2-1-2-3-2-3-5 7-1 12 5 12 7 0 11-8 5-14 0 3-2 4-2 4 1-5-2-10-2-10Z" fill="currentColor" fillOpacity=".12"/><path d="M8 17h8M12 13v8M7 22 18 11"/></>:kind==='weaken'?<><path d="m16 3 3 1-1 4-8 8-3-3ZM5 12l7 7M8 16l-5 5M15 13v8m-3-3 3 3 3-3"/></>:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><path d="m3 3 18 18M10 10a3 3 0 0 0 4 4"/></>}
 </svg>
}

export function EnemyAilments({effects,spellEffects=[],shield}:{effects:EnemyAilment[];spellEffects?:import('./timed-spells').TimedSpellEffect[];shield?:{remaining:number;turns?:number}}){
 const [selected,setSelected]=useState<string|null>(null)
 const effect=effects.find(item=>item.kind===selected)
 const spells=spellEffects.filter(effect=>effect.id==='solar-brand'||effect.id==='silent-seal')
 const selectedSpell=plannedSpells.find(spell=>spell.id===selected&&spells.some(effect=>effect.id===selected))
 if(!effects.length&&!spells.length&&!(shield&&shield.remaining>0))return null
 return <><ul className="exploration-ailments" aria-label="몬스터 상태이상">{effects.map(item=><li key={item.kind}><button className="ailment-badge" data-ailment={item.kind} aria-label={ailmentDescription(item)} onClick={()=>setSelected(item.kind)}>
  <AilmentIcon kind={item.kind}/><span>{definitions[item.kind].name}</span><strong>{item.kind==='freeze'?'봉쇄':item.kind==='bleed'?`−${item.amount}`:item.kind==='weaken'?`−${item.amount}`:`${item.amount}%`}</strong><small>{item.turns}{item.kind==='freeze'?'회':'턴'}</small>
 </button></li>)}{spells.map(effect=>{const spell=plannedSpells.find(spell=>spell.id===effect.id)!;return <li key={effect.id}><button className="ailment-badge" aria-label={spell.description} onClick={()=>setSelected(effect.id)}><img className="ailment-icon" src={spell.image} alt=""/><span>{spell.name}</span><small>{effect.turns}T</small></button></li>})}<EnemyShieldBadge shield={shield}/></ul><Dialog open={!!effect||!!selectedSpell} onOpenChange={open=>{if(!open)setSelected(null)}}><DialogContent className="exploration-modal exploration-ailment-guide"><DialogHeader><DialogTitle>{effect?definitions[effect.kind].name:selectedSpell?.name??'상태이상'}</DialogTitle><DialogDescription>{effect?ailmentDescription(effect):selectedSpell?.description??''}</DialogDescription></DialogHeader><p>{effect?definitions[effect.kind].rule:selectedSpell?.description??''}</p></DialogContent></Dialog></>
}

function EnemyShieldBadge({shield}:{shield?:{remaining:number;turns?:number}}){
 const [open,setOpen]=useState(false)
 if(!shield||shield.remaining<=0)return null
 return <li><button className="ailment-badge enemy-shield-badge" aria-label={`보호막 ${shield.remaining}`} onClick={()=>setOpen(true)}><AilmentIcon kind="shield"/><span>보호막</span><strong>{shield.remaining}</strong></button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="exploration-modal exploration-ailment-guide"><DialogHeader><DialogTitle>적 보호막</DialogTitle><DialogDescription>남은 보호막량 {shield.remaining}</DialogDescription></DialogHeader><p>방어력·마법 저항력을 적용하기 전의 직접 피해를 흡수합니다. 넘친 피해에만 방어력·마저가 적용됩니다. 턴 제한 없이 소진되거나 전투가 끝날 때 해제됩니다. 출혈은 막지 못합니다.</p></DialogContent></Dialog></li>
}

export function PlayerAilments({state}:{state:PracticeState}){
 const [selected,setSelected]=useState<string|null>(null)
 const effects=state.playerEffects??[]
 const badges:Array<{id:string;kind:AilmentKind|'magic-break'|'shield'|'might'|'lantern';name:string;count:string;detail:string;rule:string;spellId?:string;buff?:boolean}>=effects.map(effect=>({id:effect.kind,kind:effect.kind,name:definitions[effect.kind].name,count:`${effect.turns}${effect.kind==='freeze'?'회':'턴'}`,detail:ailmentDescription(effect),rule:effect.kind==='bleed'?'플레이어 행동이 끝날 때 체력이 감소합니다. 방어력으로 줄일 수 없으며, 정화로 해제할 수 있어요.':definitions[effect.kind].rule}))
 if(state.soulLantern==='ready')badges.push({id:'soul-lantern',kind:'lantern',name:'영혼의 등불',count:'1회',detail:'사망 시 체력 20으로 부활',rule:'이번 탐험에서 사망하면 한 번 부활하고 등불이 꺼집니다. 전투가 끝나도 유지되며 보스전에서도 적용됩니다. 점화할 때 바친 최대 체력 10은 부활 후에도 돌아오지 않습니다.'})
 if(state.combat?.status==='active'){
  const {shield,attackBuff,ward}=state.combat
  if(ward)badges.push({id:'ward',kind:'shield',name:'물결의 보호',count:ward.turns+'회',detail:'받는 피해 '+ward.amount+' 감소',rule:'다음 반격을 받을 때마다 횟수를 소모합니다. 출혈에는 적용되지 않아요.'})
  if(shield&&shield.remaining>0)badges.unshift({id:'shield',kind:'shield',name:`보호막 ${shield.remaining}`,count:'',detail:'남은 보호막량 '+shield.remaining,rule:'방어력·마법 저항력을 적용하기 전의 직접 피해를 흡수합니다. 넘친 피해에만 방어력·마저가 적용됩니다. 턴 제한 없이 전투 종료나 소진까지 유지됩니다. 재시전 시 합산 없이 더 큰 양을 유지하며 출혈은 막지 못합니다.'})
  if(attackBuff)badges.push({id:'might',kind:'might',name:state.combat.attackBuffName??'태양왕의 위엄',count:attackBuff.turns+'턴',detail:'공격력 +'+attackBuff.attack+' · 치명타 +'+attackBuff.critical+'%p',rule:'남은 행동 동안 기본 공격이 강화됩니다. 중첩 없이 지속시간을 갱신합니다.'})
  if(state.combat.magicResistanceDown)badges.push({id:'magic-break',kind:'magic-break',name:'마저 감소',count:'1턴',detail:`마법 저항력 ${state.combat.magicResistanceDown} 감소 · 1턴 남음`,rule:'다음 턴의 적 행동이 끝나면 해제됩니다. 저항력은 음수가 될 수 있으며, 다시 맞으면 중첩 없이 1턴으로 갱신합니다.'})
  if(state.combat.playerWeaken)badges.push({id:'combat-weaken',kind:'weaken',name:'약화',count:'1회',detail:`다음 기본 공격력 ${state.combat.playerWeaken} 감소`,rule:'다음 기본 공격을 시도하면 해제됩니다. 마법 사용으로는 소모되지 않으며, 중첩되지 않아요.'})
  if(state.combat.playerBlind)badges.push({id:'combat-blind',kind:'blind',name:'실명',count:'1회',detail:`다음 기본 공격 1회의 명중률 ${state.combat.playerBlind}% 감소`,rule:'기본 공격을 시도하면 해제됩니다. 마법 사용으로는 소모되지 않아요.'})
 }
 for(const badge of badges){
  badge.buff=['ward','shield','might','soul-lantern'].includes(badge.id)
  badge.spellId=badge.id==='ward'?(state.combat?.wardSpellId??'tide'):badge.id==='shield'?state.combat?.shieldSpellId:badge.id==='might'?(state.combat?.attackBuffSpellId??state.spells.find(spell=>spell.name===badge.name)?.id):undefined
  const spell=state.spells.find(spell=>spell.id===badge.spellId)??plannedSpells.find(spell=>spell.id===badge.spellId)
  if(spell&&badge.id!=='shield')badge.name=spell.name
 }
 if(state.combat?.status==='active')for(const effect of state.combat.spellEffects??[]){
  if(effect.id==='solar-brand'||effect.id==='silent-seal')continue
  const spell=plannedSpells.find(spell=>spell.id===effect.id)!
  badges.push({id:effect.id,spellId:effect.id,kind:'shield',buff:true,name:spell.name,count:`${effect.turns}턴`,detail:spell.description,rule:'시전한 턴의 적 행동부터 적용됩니다. 같은 마법은 중첩되지 않고 남은 턴을 갱신하며 전투 종료 시 해제됩니다.'})
  if(effect.id==='sandstone-skin')badges.push({id:'skin-evasion',kind:'weaken',name:'회피 감소',count:`${effect.turns}턴`,detail:'사암의 피부 · 회피율 −10%p',rule:'사암의 피부가 유지되는 동안 적용되며 회피율은 0%보다 낮아지지 않습니다.'})
 }
 const current=badges.find(badge=>badge.id===selected)
 return <div className="exploration-player-ailments">{[true,false].map(buff=><section key={String(buff)} className="exploration-effect-half" aria-label={buff?'버프':'상태이상'}><span className="exploration-effect-label">{buff?'버프':'상태이상'}</span>{badges.some(badge=>!!badge.buff===buff)?<ul aria-label={buff?'탐험가 버프':'탐험가 상태이상'}>{badges.filter(badge=>!!badge.buff===buff).map(badge=><li key={badge.id}><button className="ailment-badge" data-ailment={badge.kind} data-beneficial={buff} aria-label={`${badge.name} · ${badge.detail} · ${badge.count} 남음`} onClick={()=>setSelected(badge.id)}>{badge.spellId?<img className="ailment-icon" src={`/exploration/magic/svg-v2/${badge.spellId}.svg`} alt=""/>:<AilmentIcon kind={badge.kind}/>}<span>{badge.name}</span>{badge.count&&<small>{badge.count}</small>}</button></li>)}</ul>:<span className="exploration-no-ailments">없음</span>}</section>)}<Dialog open={!!current} onOpenChange={open=>{if(!open)setSelected(null)}}><DialogContent className="exploration-modal exploration-ailment-guide"><DialogHeader><DialogTitle>{current?.name??'상태이상'}</DialogTitle><DialogDescription>{current?.detail}</DialogDescription></DialogHeader><p>{current?.rule}</p><small>{current?.count} 남음</small></DialogContent></Dialog></div>
}

export function AilmentGuide({label='상태이상 안내'}:{label?:string}){
 const [open,setOpen]=useState(false)
 return <><button className="ailment-guide-button" aria-label={label} title={label} onClick={()=>setOpen(true)}><Info size={14}/></button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="exploration-modal exploration-ailment-guide"><DialogHeader><DialogTitle>상태이상</DialogTitle><DialogDescription>상태이상 칸에 현재 효과와 남은 횟수를 표시해요. 각 효과를 누르면 자세한 수치를 확인할 수 있어요.</DialogDescription></DialogHeader><div className="ailment-guide-list">{(Object.keys(definitions) as AilmentKind[]).map(kind=><article key={kind} data-ailment={kind}><AilmentIcon kind={kind}/><div><h3>{definitions[kind].name}</h3><p>{definitions[kind].rule}</p><small>{effectRules[kind]}</small></div></article>)}</div><p className="ailment-guide-note">효과량과 지속시간은 무기·마법마다 달라요. 현재 걸린 효과의 아이콘을 누르면 실제 수치를 확인할 수 있어요.</p></DialogContent></Dialog></>
}
