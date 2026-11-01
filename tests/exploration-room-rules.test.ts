// @vitest-environment node
import {expect,it} from 'vitest'
import {drawPracticeFloor,refreshPracticeDoors} from '@/features/exploration/campaign'
import {newPractice,playerMaxHp,playerManaMax,type PracticeState} from '@/features/exploration/practice-state'
import {canOfferPracticeRoom,recordRoomEntry} from '@/features/exploration/room-rules'
import {createRoomVisit,enterRoomVisit,restFully} from '@/features/exploration/adventure-rooms'
import {startMonsterCombat,resolveCombatTurn} from '@/features/exploration/combat-state'
import {advanceExploration} from '@/features/exploration/run-state'
import {enterShopkeeper} from '@/features/exploration/shop-state'
import {getShopkeeper} from '@/features/exploration/shopkeepers'
import {plannedSpells} from '@/features/exploration/spell-catalog'
import type {RoomTypeId} from '@/features/exploration/room-preview'
import {seededRandom} from '../scripts/exploration/simulation'

function doorsAcrossSeeds(state:PracticeState,floor:number){
 return Array.from({length:80},(_,index)=>drawPracticeFloor(floor,seededRandom(index+1),state).doors).flat()
}

it('starts with useful doors and replaces full-resource fixed rests throughout the fifty floors',()=>{
 const fresh=newPractice(()=>0,'practice')
 expect(fresh.market.doors.some(id=>id.startsWith('rest-'))).toBe(false)
 for(let floor=1;floor<=50;floor++)for(let seed=1;seed<=32;seed++){
  const market=drawPracticeFloor(floor,seededRandom(floor*100+seed),fresh)
  if(floor===50){expect(market.doors).toEqual(['boss-pharaoh']);continue}
  expect(market.doors).toHaveLength(3)
  expect(new Set(market.doors).size).toBe(3)
  expect(market.doors.filter(id=>id==='monster')).toHaveLength(1)
  expect(market.doors.some(id=>id.startsWith('rest-')||id==='deep-well'||id==='scales'||id==='thief')).toBe(false)
 }
})

it('keeps rest for missing mana, uses equipment-adjusted caps and excludes the full-health well',()=>{
 const fresh=newPractice(()=>0,'practice'),lowMana={...fresh,mp:10}
 expect(doorsAcrossSeeds(lowMana,19)).toContain('rest-oasis')
 expect(doorsAcrossSeeds(lowMana,19)).not.toContain('deep-well')
 const equipped={...fresh,armor:[{...fresh.armor[0],maxHpBonus:25,maxManaBonus:10}]}
 expect(playerMaxHp(equipped)).toBe(125);expect(playerManaMax(equipped)).toBe(50)
 expect(canOfferPracticeRoom(equipped,'rest-camp')).toBe(true)
 expect(canOfferPracticeRoom(restFully(equipped),'rest-camp')).toBe(false)
 const sacrificed={...fresh,maxHpSacrifice:10,hp:90}
 expect(canOfferPracticeRoom(sacrificed,'rest-camp')).toBe(false)
 expect(canOfferPracticeRoom({...fresh,hp:60},'deep-well')).toBe(true)
})

it.each([
 ['rest-garden',['rest-oasis','rest-camp','rest-garden']],
 ['curse',['curse','thief']],
 ['thief',['curse','thief']],
 ['sphinx',['sphinx']],
 ['investigate-wall',['investigate-wall']],
 ['deep-well',['deep-well']],
 ['cursed-gem-eye',['cursed-gem-eye']],
 ['merchant-karim',['merchant-karim']],
] as [RoomTypeId,RoomTypeId[]][])('does not offer consecutive visits after %s', (last,blocked)=>{
 const fresh=newPractice(()=>0,'practice'),state=recordRoomEntry({...fresh,hp:60,mp:10,gold:1000,potions:{health:2,mana:2}},last)
 const offered=doorsAcrossSeeds(state,last==='merchant-karim'?18:25)
 for(const id of blocked)expect(offered).not.toContain(id)
 expect(offered).toContain('monster')
 expect(offered).toContain('chest')
})

it('allows different investigations, equipment-to-magic visits and repeated treasure or combat',()=>{
 let state=recordRoomEntry(newPractice(()=>0,'practice'),'investigate-wall')
 expect(canOfferPracticeRoom(state,'investigate-alchemy')).toBe(true)
 state=recordRoomEntry(state,'merchant-hasan')
 expect(canOfferPracticeRoom(state,'magic-nadim')).toBe(true)
 for(const id of ['monster','guardian','chest'] as const)expect(canOfferPracticeRoom(recordRoomEntry(state,id),id)).toBe(true)
})

it('counts actual entries, keeps ambush origins and forgets warnings after three subsequent visits',()=>{
 const fresh=newPractice(()=>0,'practice'),visit=createRoomVisit('warning-wall',fresh,'warning',()=>0)
 const entered=enterRoomVisit(fresh,visit)
 expect(fresh.recentRooms).toBeUndefined()
 expect(enterRoomVisit(entered,visit)).toBe(entered)
 let state=recordRoomEntry(recordRoomEntry(entered,'chest'),'monster')
 expect(doorsAcrossSeeds(state,5)).not.toContain('warning-wall')
 state=recordRoomEntry(state,'investigate-wall')
 expect(doorsAcrossSeeds(state,5)).toContain('warning-wall')
 const chest=enterRoomVisit(fresh,createRoomVisit('chest',fresh,'ambush',()=>.99))
 expect(startMonsterCombat(chest,'sand-scorpion').recentRooms).toEqual(['chest'])
 const merchant=enterShopkeeper(fresh,getShopkeeper('hasan'),()=>0)
 expect(enterShopkeeper(merchant,getShopkeeper('hasan'),()=>0).recentRooms).toEqual(['merchant-hasan'])
})

it('excludes unusable contracts, exhausted magic shops, and a trade with no spare gear',()=>{
 const fresh=newPractice(()=>0,'practice'),state={...fresh,market:{...fresh.market,floor:13}}
 expect(canOfferPracticeRoom({...state,soulLantern:'ready'},'soul-lantern')).toBe(false)
 expect(canOfferPracticeRoom({...state,hp:50},'forbidden-trade')).toBe(false)
 const learned={...state,acquiredIds:plannedSpells.filter(spell=>spell.tier==='advanced').map(spell=>spell.id)}
 expect(canOfferPracticeRoom(learned,'forbidden-trade')).toBe(false)
 expect(canOfferPracticeRoom(learned,'magic-sahira')).toBe(false)
 expect(canOfferPracticeRoom(state,'scales')).toBe(false)
 expect(canOfferPracticeRoom({...state,weapons:[...state.weapons,{id:'spare',name:'여분 무기',description:''}]},'scales')).toBe(true)
 expect(canOfferPracticeRoom(state,'broken-teleport')).toBe(false)
 expect(canOfferPracticeRoom({...state,gold:200},'broken-teleport')).toBe(true)
})

it('passes post-room resources and history through descent, including the guaranteed supplier',()=>{
 const fresh=newPractice(()=>0,'practice')
 const rested=recordRoomEntry({...fresh,market:{...fresh.market,floor:18}},'rest-camp')
 const next=advanceExploration(rested,()=>0)
 expect(next.market.floor).toBe(19)
 expect(next.market.doors.some(id=>id.startsWith('rest-'))).toBe(false)
 expect(next.recentRooms).toEqual(['rest-camp'])
 const supplied=advanceExploration({...fresh,market:{...fresh.market,floor:10}},()=>0)
 expect(supplied.forcedMerchant?.id).toBe('hasan')
 expect(supplied.market.doors).not.toContain('merchant-hasan')
 // Generating the supplier's doors does not mark the supplier visited yet.
 expect(supplied.recentRooms).toBeUndefined()
})

it('replaces only newly useless doors after healing or a checkpoint and clears their selection',()=>{
 const fresh=newPractice(()=>0,'practice'),injured={...fresh,hp:60,mp:10}
 const market=drawPracticeFloor(19,()=>.5,injured),restIndex=market.doors.indexOf('rest-oasis')
 expect(restIndex).toBeGreaterThanOrEqual(0)
 const healed={...restFully(injured),market,door:restIndex}
 const refreshed=refreshPracticeDoors(healed,()=>.5)
 expect(refreshed.market.doors.some(id=>id.startsWith('rest-'))).toBe(false)
 expect(refreshed.door).toBeNull()
 for(let index=0;index<3;index++)if(index!==restIndex)expect(refreshed.market.doors[index]).toBe(market.doors[index])
 expect(refreshed.market.monsterIds![market.doors.indexOf('monster')]).toBe(market.monsterIds![market.doors.indexOf('monster')])
 expect(refreshPracticeDoors(refreshed,()=>.5)).toBe(refreshed)
 expect(refreshPracticeDoors({...healed,mode:'test'},()=>.5).market).toBe(market)
})

it('skips the post-boss rest only when both resources are already full in practice',()=>{
 const fresh=newPractice(()=>0,'practice')
 for(const [hp,mp,needsRest] of [[100,40,false],[99,40,true],[100,39,true]] as const){
  const fight=startMonsterCombat({...fresh,hp,mp},'obsidian-anubis',{random:()=>0})
  const won=resolveCombatTurn({...fight,combat:{...fight.combat!,enemyHp:1}},{type:'attack'},()=>.5).state
  expect(won.combat?.status).toBe('won')
  expect(!!won.bossRestPending).toBe(needsRest)
 }
})
