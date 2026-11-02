import {useEffect,type ReactElement} from 'react'
import {Popover} from '@base-ui/react/popover'
import {Sparkles,X} from 'lucide-react'
import {combatMagic,type CombatAction} from './combat-state'
import {growthBonus} from './growth'
import {spellMechanics} from './spell-mechanics'
import {merchantPotions,playerManaMax,playerMaxHp,potionBlock,potionRecoveryAmount,spellManaCost,type PracticeState} from './practice-state'
import './combat-quick-picker.css'

export function CombatQuickPicker({kind,state,open,onOpenChange,trigger,busy,onAction}:{kind:'magic'|'potion';state:PracticeState;open:boolean;onOpenChange:(open:boolean)=>void;trigger:ReactElement;busy:boolean;onAction:(action:CombatAction)=>void}){
 useEffect(()=>{
  if(!open)return
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();onOpenChange(false)}}
  document.addEventListener('keydown',escape,true)
  return()=>document.removeEventListener('keydown',escape,true)
 },[open,onOpenChange])
 const spells=state.equippedSpells.flatMap(id=>state.spells.filter(spell=>spell.id===id))
 function choose(action:CombatAction){if(busy)return;onOpenChange(false);onAction(action)}
 return <Popover.Root modal={false} open={open} onOpenChange={onOpenChange}>
  <Popover.Trigger render={trigger} disabled={busy}/>
  <Popover.Portal><Popover.Positioner side="top" align="center" sideOffset={10} collisionPadding={12} className="combat-quick-positioner">
   <Popover.Popup className="combat-quick-picker" data-quick-kind={kind}>
    <div className="combat-quick-heading"><Popover.Title>{kind==='magic'?'마법 시전':'포션 마시기'}</Popover.Title><span>{kind==='magic'?`MP ${state.mp}/${playerManaMax(state)}`:'보유 포션'}</span><Popover.Close className="combat-quick-close" aria-label="빠른 선택 닫기"><X size={15}/></Popover.Close></div>
    <div className="combat-quick-options">
     {kind==='magic'?(spells.length?spells.map(spell=>{
      const mana=spellManaCost(state,spell),blocked=state.mp<mana?'마나 부족':!(spell.id in combatMagic)?'사용 불가':null
      const description=(combatMagic[spell.id as keyof typeof combatMagic]??spell.description)+(spellMechanics[spell.id]?.damage&&growthBonus(state,'magic')?` (+${growthBonus(state,'magic')})`:'')
      return <button key={spell.id} className="combat-quick-option" disabled={busy||!!blocked} aria-label={`${spell.name} · MP ${mana} 시전`} onClick={()=>choose({type:'magic',id:spell.id})} title={description}>
       <span className="combat-quick-art">{spell.image?<img src={spell.image} alt=""/>:<Sparkles size={24}/>}</span><span className="combat-quick-copy"><strong>{spell.name}</strong><small>{blocked??description}</small></span><span className="combat-quick-cost">MP <b>{mana}</b></span>
      </button>
     }):<p className="combat-quick-empty">장착한 마법이 없어요. 보관함에서 먼저 장착해주세요.</p>):merchantPotions.map(potion=>{
      const health=potion.kind==='health',current=health?state.hp:state.mp,max=health?playerMaxHp(state):playerManaMax(state),amount=Math.min(max-current,potionRecoveryAmount(state,potion.kind)),blocked=potionBlock(state,potion.kind,true)
      return <button key={potion.kind} className="combat-quick-option" data-potion={potion.kind} disabled={busy||!!blocked} aria-label={`${potion.name} 마시기`} onClick={()=>choose({type:'potion',kind:potion.kind})}>
       <span className="combat-quick-art"><img src={potion.image} alt=""/></span><span className="combat-quick-copy"><strong>{potion.name}</strong><small>{blocked??`${health?'체력':'마나'} ${current} → ${current+amount} · +${amount} 회복`}</small></span><span className="combat-quick-count">×{state.potions[potion.kind]}</span>
      </button>
     })}
    </div>
    <Popover.Description className="combat-quick-hint">{kind==='magic'?'마법':'포션'}을 선택하면 1턴 사용 · 밖을 누르면 취소</Popover.Description>
    <Popover.Arrow className="combat-quick-arrow"><svg width="18" height="9" viewBox="0 0 18 9" aria-hidden="true"><path d="m0 0 9 8 9-8"/></svg></Popover.Arrow>
   </Popover.Popup>
  </Popover.Positioner></Popover.Portal>
 </Popover.Root>
}
