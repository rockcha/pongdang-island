import {formatBasicAttack} from './attack-roll'
import {Heart,Sparkles} from 'lucide-react'
import type {Gear} from './practice-state'
import {AilmentIcon} from './ailments'
import {hasWeaponEffect,weaponEffectText} from './weapon-catalog'

export type StatKind='attack'|'critical'|'evasion'|'defense'|'resistance'|'health'|'escape'
export function StatIcon({kind}:{kind:StatKind}){
 return <svg className="exploration-stat-icon" data-stat={kind} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  {kind==='attack'?<><path d="m9 16 11-12-1 5-8 9M6 13l7 7M9 17l-5 5-2-2 5-5"/><path d="m4 4 1 4m-3-2 4 1" opacity=".5"/></>:kind==='critical'?<><path d="m12 2 2.5 5.5L21 6l-2 6 4 3-6 2-1 5-4-4-5 3 1-6-6-3 6-2Z"/><path d="m10 9 4 3-4 3Z" fill="currentColor" stroke="none"/></>:kind==='evasion'?<><path d="m15 3-4 7 5 3-4 8M17 6l4 3-4 6M3 8h5M2 13h5M4 18h4"/><path d="m10 12 2 2-3 5" opacity=".5"/></>:kind==='defense'?<><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="M8 8h8v7H8ZM12 8v7" fill="currentColor" fillOpacity=".12"/></>:kind==='resistance'?<><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m12 6 1.5 4.5L17 12l-3.5 1.5L12 18l-1.5-4.5L7 12l3.5-1.5Z" fill="currentColor" fillOpacity=".2"/></>:kind==='health'?<><path d="M12 21 3.5 12.5C-2 6 7 1 12 7c5-6 14-1 8.5 5.5Z"/><path d="M12 10v7m-3-3.5h6"/></>:<><path d="M14 3h6v18h-6M11 7l5 5-5 5M3 12h13"/></>}
 </svg>
}
const hints={attack:'표시된 고정 공격력 또는 공격 범위 · 치명타와 적 방어력은 이후 적용',critical:'일반 공격의 치명타 확률 · 직접 피해 2배',evasion:'물리 기본 공격 회피율 · 마법에는 적용되지 않아요',defense:'물리 피해를 이 수치만큼 감소시켜요',resistance:'마법 피해를 이 수치만큼 감소시켜요',health:'장착 시 증가하는 최대 체력',escape:'도망 성공률에 더하는 값'}
export function StatValue({kind,label,value,compact=false}:{kind:StatKind;label:string;value:string|number;compact?:boolean}){
 return <span className="equipment-stat" data-stat={kind} title={hints[kind]} aria-label={compact?`${label} ${value}`:undefined}><StatIcon kind={kind}/>{!compact&&<span>{label}</span>}<b>{value}</b></span>
}
export function GearAttributes({gear,compact=false}:{gear:Gear;compact?:boolean}){
 return <div className="equipment-attributes">{gear.attack!==undefined?<><StatValue compact={compact} kind="attack" label="공격력" value={formatBasicAttack(gear.attack,gear.attackVariance)}/><StatValue compact={compact} kind="critical" label="치명타" value={`${gear.critical??0}%`}/></>:<><StatValue compact={compact} kind="defense" label="방어력" value={gear.reduction??0}/><StatValue compact={compact} kind="resistance" label="마법 저항력" value={gear.magicReduction??0}/><StatValue compact={compact} kind="evasion" label="회피율" value={`${gear.evasion??0}%`}/><StatValue compact={compact} kind="health" label="최대 체력" value={`+${gear.maxHpBonus??0}`}/></>}{!!gear.escapeBonus&&<StatValue compact={compact} kind="escape" label="도망" value={`+${gear.escapeBonus}%p`}/>}</div>
}
export function WeaponEffect({gear,showEmpty=false,compact=false}:{gear:Gear;showEmpty?:boolean;compact?:boolean}){
 if(!showEmpty&&!hasWeaponEffect(gear))return null
 return <div className="equipment-effect" data-ailment={gear.proc?.kind} data-bonus={gear.lifesteal?'lifesteal':gear.cleanseChance?'cleanse':undefined}>{gear.proc?<AilmentIcon kind={gear.proc.kind}/>:gear.lifesteal?<Heart size={17}/>:gear.cleanseChance?<Sparkles size={17}/>:null}<span>{compact&&gear.lifesteal?`피흡 ${gear.lifesteal}%`:weaponEffectText(gear)}</span></div>
}
