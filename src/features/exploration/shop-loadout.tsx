import {Shield,Sparkles,Swords} from 'lucide-react'
import {GearAttributes,WeaponEffect} from './equipment-stats'
import {combatMagic} from './combat-state'
import {spellManaCost,type PracticeState} from './practice-state'
import './shop-loadout.css'

export function ShopLoadout({state}:{state:PracticeState}){
 return <section className="exploration-shop-loadout" aria-label="현재 장착 능력치"><h3>현재 장착 중</h3><div className="shop-loadout-grid">
  {(['weapon','armor'] as const).map(kind=>{
   const gear=(kind==='weapon'?state.weapons:state.armor).find(item=>item.id===(kind==='weapon'?state.weaponId:state.armorId))
   return <article key={kind}><div className="shop-loadout-heading">{kind==='weapon'?<Swords size={13}/>:<Shield size={13}/>}<small>{kind==='weapon'?'무기':'방어구'}</small><strong>{gear?.name??'미장착'}</strong></div>{gear&&<><GearAttributes gear={gear}/><WeaponEffect gear={gear} compact/></>}</article>
  })}
  {[0,1].map(index=>{
   const spell=state.spells.find(item=>item.id===state.equippedSpells[index])
   return <article key={`spell-${index}`}><div className="shop-loadout-heading"><Sparkles size={13}/><small>마법 {index+1}</small><strong>{spell?.name??'미장착'}</strong></div>{spell&&<><span className="shop-loadout-mana">마나 {spellManaCost(state,spell)} 소모</span><p>{combatMagic[spell.id as keyof typeof combatMagic]??spell.description}</p></>}</article>
  })}
 </div></section>
}
