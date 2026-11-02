import type {PracticeState} from './practice-state'
import {plannedSpells} from './spell-catalog'

/** Derive current spell definitions from saved runs without mutating their receipt. */
export function normalizeExplorationSpells(state:PracticeState):PracticeState{
 let changed=false
 const spells=state.spells.filter(spell=>spell.id!=='purifying-spring').map(spell=>{
  if(spell.id==='mana-bolt')return spell
  const definition=plannedSpells.find(item=>item.id===spell.id),image=`/exploration/magic/svg-v2/${spell.id}.svg`
  const description=definition?.description??spell.description
  if(spell.image===image&&spell.description===description)return spell
  changed=true;return {...spell,image,description}
 })
 const equippedSpells=state.equippedSpells.filter(id=>id!=='purifying-spring')
 if(!changed&&spells.length===state.spells.length&&equippedSpells.length===state.equippedSpells.length)return state
 return {...state,spells,equippedSpells}
}
