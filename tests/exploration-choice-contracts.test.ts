import {expect,it} from 'vitest'
import {acceptChoiceRoom,choiceRoomBlock,forbiddenSpells} from '@/features/exploration/choice-room-state'
import {fixedPracticeRooms,canUseTeleport,drawPracticeFloor} from '@/features/exploration/campaign'
import {newPractice,playerManaMax,usePotion} from '@/features/exploration/practice-state'
import {restFully} from '@/features/exploration/adventure-rooms'
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'
import {advanceExploration} from '@/features/exploration/run-state'
it('sacrifices maximum mana once and respects the new cap through rest and potions',()=>{
 const fresh=newPractice(()=>0),state=acceptChoiceRoom(fresh,'soul-lantern')
 expect(state.mp).toBe(30);expect(playerManaMax(state)).toBe(30);expect(state.soulLantern).toBe('ready')
 expect(acceptChoiceRoom(state,'soul-lantern')).toBe(state)
 expect(restFully({...state,mp:0}).mp).toBe(30)
 expect(usePotion({...state,mp:25,potions:{health:0,mana:1}},'mana').mp).toBe(30)
 expect(fresh.mp).toBe(40)
})
it('revives from a lethal hit exactly once at 20 hp and keeps the mana sacrifice',()=>{
 let state=startMonsterCombat({...acceptChoiceRoom(newPractice(()=>0),'soul-lantern'),hp:1,mp:0,potions:{health:0,mana:2}},'ancient-giant')
 let result=resolveCombatTurn(state,{type:'potion',kind:'mana'},()=>0)
 expect(result.state.hp).toBe(20);expect(result.state.soulLantern).toBe('spent');expect(result.state.combat?.status).toBe('active')
 expect(result.events.some(event=>event.healing===20&&event.kind==='system')).toBe(true)
 state={...result.state,hp:1,mp:0}
 result=resolveCombatTurn(state,{type:'potion',kind:'mana'},()=>0)
 expect(result.state.combat?.status).toBe('lost');expect(playerManaMax(result.state)).toBe(30)
})
it('also consumes the lantern for lethal bleeding',()=>{
 const state=startMonsterCombat({...acceptChoiceRoom(newPractice(()=>0),'soul-lantern'),hp:1,playerEffects:[{kind:'bleed',amount:3,turns:2}]},'sand-scorpion')
 const result=resolveCombatTurn(state,{type:'attack'},()=>.99)
 expect(result.state.soulLantern).toBe('spent');expect(result.state.hp).toBeGreaterThan(0)
 expect(result.state.playerEffects).toEqual([])
})
it('uses the deep well to trade all mana for full health',()=>{
 const state=acceptChoiceRoom({...newPractice(()=>0),hp:12,mp:40},'deep-well')
 expect(state.hp).toBe(100);expect(state.mp).toBe(0)
})
it('exchanges exactly 50 hp for an unowned advanced spell without charging blocked trades',()=>{
 const fresh={...newPractice(()=>0),hp:51},next=acceptChoiceRoom(fresh,'forbidden-trade',()=>0)
 expect(next.hp).toBe(1);expect(next.spells).toHaveLength(1)
 expect(forbiddenSpells(next).some(spell=>spell.id===next.spells[0].id)).toBe(false)
 expect(next.acquiredIds).toContain(next.spells[0].id)
 const low={...fresh,hp:50};expect(acceptChoiceRoom(low,'forbidden-trade')).toBe(low)
 const full={...fresh,acquiredIds:forbiddenSpells(fresh).map(spell=>spell.id)}
 expect(choiceRoomBlock(full,'forbidden-trade')).toBeTruthy();expect(acceptChoiceRoom(full,'forbidden-trade')).toBe(full)
})
it('rolls either gold or a current-mana loss with an exact fifty-percent boundary',()=>{
 const initial=newPractice(()=>0)
 for(const roll of [0,.25,.499999]){const random=()=>roll,state=acceptChoiceRoom(initial,'cursed-gem-eye',random);expect(state.gold).toBe(initial.gold+500);expect(state.mp).toBe(initial.mp);expect(startMonsterCombat(state,'sand-scorpion').combat?.monsterId).toBe('sand-scorpion')}
 for(const roll of [.5,.75,.99999]){const state=acceptChoiceRoom(initial,'cursed-gem-eye',()=>roll);expect(state.gold).toBe(initial.gold);expect(state.mp).toBe(20);expect(playerManaMax(state)).toBe(40)}
 expect(initial.mp).toBe(40);expect(initial.gold).toBe(100000)
})
it.each([0,3,19,20])('clamps the gem mana loss at zero for current mana %s',mp=>{
 const state={...newPractice(),mp},result=acceptChoiceRoom(state,'cursed-gem-eye',()=>.5)
 expect(result.mp).toBe(Math.max(0,mp-20));expect(result.gold).toBe(state.gold);expect(choiceRoomBlock(result,'cursed-gem-eye')).toBeNull()
})
it('teleports three floors, charges once, and never skips a fixed room',()=>{
 for(let floor=1;floor<=50;floor++){
  const expected=floor>=7&&floor+3<=50&&![floor,floor+1,floor+2].some(level=>fixedPracticeRooms[level]||[11,21,31,41].includes(level))
  expect(canUseTeleport(floor)).toBe(expected)
  const initial=newPractice(()=>0,'practice'),state={...initial,gold:200,market:drawPracticeFloor(floor,()=>0)}
  const accepted=acceptChoiceRoom(state,'broken-teleport')
  if(!expected){expect(accepted).toBe(state);continue}
  expect(accepted.gold).toBe(0)
  const moved=advanceExploration(accepted,()=>0)
  expect(moved.market.floor).toBe(floor+3);expect(moved.pendingFloorAdvance).toBeUndefined()
 }
})
it('only generates contracts in their intended floor bands and safe teleport floors',()=>{
 let seed=12345;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296)
 for(let floor=1;floor<=50;floor++)for(let draw=0;draw<60;draw++){
  const {doors}=drawPracticeFloor(floor,random)
  if(doors.includes('soul-lantern'))expect(floor>=7&&floor<=45).toBe(true)
  if(doors.includes('forbidden-trade'))expect(floor>=7&&floor<=17).toBe(true)
  if(doors.includes('deep-well'))expect(floor>=6).toBe(true)
  if(doors.includes('cursed-gem-eye'))expect(floor>=11&&floor<=45).toBe(true)
  if(doors.includes('broken-teleport'))expect(canUseTeleport(floor)).toBe(true)
 }
})
