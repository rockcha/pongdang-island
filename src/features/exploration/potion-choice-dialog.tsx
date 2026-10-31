import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {Droplets,Heart} from 'lucide-react'
import {merchantPotions,playerMaxHp,playerManaMax,potionBlock,type PotionKind,type PracticeState} from './practice-state'
import {healingAfterReduction} from './status-effects'
export function PotionChoiceDialog({state,open,onOpenChange,onUse,busy=false}:{state:PracticeState;open:boolean;onOpenChange:(open:boolean)=>void;onUse:(kind:PotionKind)=>boolean;busy?:boolean}){
 const inCombat=state.combat?.status==='active'
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="exploration-modal exploration-selection-modal exploration-potion-modal"><DialogHeader><span className="exploration-modal-eyebrow">RECOVERY</span><DialogTitle>포션 선택</DialogTitle><DialogDescription>{inCombat?'포션을 마시면 한 턴을 사용하고 적이 반격합니다.':'필요한 포션을 골라 체력이나 마나를 회복하세요.'}</DialogDescription></DialogHeader>
 <div className="exploration-choice-cards">{merchantPotions.map(potion=>{
  const health=potion.kind==='health',current=health?state.hp:state.mp,max=health?playerMaxHp(state):playerManaMax(state),amount=Math.min(max-current,health?healingAfterReduction(potion.amount,state.playerEffects??[]):potion.amount),blocked=potionBlock(state,potion.kind,inCombat),Icon=health?Heart:Droplets
  return <article className="exploration-choice-card" data-kind={potion.kind} key={potion.kind}><div className="exploration-choice-art"><img src={potion.image} alt=""/><span className="exploration-item-count">×{state.potions[potion.kind]}</span></div><h3>{potion.name}</h3><p className="exploration-choice-power"><Icon size={14}/>{health?'체력':'마나'} {potion.amount} 회복</p><div className="exploration-recovery-meter"><span>현재 {current} / {max}</span><progress aria-label={`${potion.name} 회복 미리보기`} value={Math.min(max,current+amount)} max={max}/><small>{blocked??`사용 후 ${current+amount} / ${max} · +${amount}`}</small></div><button className="exploration-choice-confirm" aria-label={`${potion.name} 마시기`} disabled={busy||!!blocked} onClick={()=>{if(onUse(potion.kind))onOpenChange(false)}}>{blocked??'마시기'}</button></article>
 })}</div><button className="exploration-modal-return" onClick={()=>onOpenChange(false)}>{inCombat?'취소 · 턴 소모 없음':'닫기'}</button></DialogContent></Dialog>
}
