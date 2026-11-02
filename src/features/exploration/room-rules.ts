import {playerMaxHp,playerManaMax,practiceSpells,type PracticeState} from './practice-state'
import {choiceRoomBlock,type ChoiceRoomId} from './choice-room-state'
import {acquiredItemIds} from './acquisition-history'
import {plannedSpells} from './spell-catalog'
import {shopkeeperForRoom} from './shopkeepers'
import type {RoomTypeId} from './room-preview'

// Record entries, not offered doors. An ambush keeps its original room entry.
export function recordRoomEntry(state:PracticeState,id:RoomTypeId):PracticeState{
 return {...state,recentRooms:[...(state.recentRooms??[]),id].slice(-3)}
}

export function canOfferPracticeRoom(state:PracticeState|undefined,id:RoomTypeId):boolean{
 if(!state)return true
 const recent=state.recentRooms??[],last=recent.at(-1)
 if(id==='monster'||id==='guardian'||id==='chest'||id.startsWith('boss-'))return true
 if(id===last)return false
 if(id.startsWith('rest-'))return !last?.startsWith('rest-')&&(state.hp<playerMaxHp(state)||state.mp<playerManaMax(state))
 if(id==='deep-well'&&state.hp>=playerMaxHp(state))return false
 if(id==='warning-wall'&&recent.includes(id))return false
 if((id==='curse'||id==='thief')&&(last==='curse'||last==='thief'))return false
 if(id==='thief'&&state.potions.health+state.potions.mana===0)return false
 if(id==='scales'&&!state.weapons.some(item=>item.id!==state.weaponId)&&!state.armor.some(item=>item.id!==state.armorId)&&!state.spells.some(item=>!state.equippedSpells.includes(item.id)))return false
 if(['soul-lantern','forbidden-trade','broken-teleport'].includes(id)&&choiceRoomBlock(state,id as ChoiceRoomId))return false
 const merchant=shopkeeperForRoom(id)
 if(merchant?.kind==='magic'){
  const acquired=acquiredItemIds(state)
  const spells=merchant.tier==='starter'?practiceSpells:plannedSpells.filter(spell=>spell.tier===merchant.tier&&spell.available)
  if(!spells.some(spell=>!acquired.has(spell.id)))return false
 }
 return true
}
