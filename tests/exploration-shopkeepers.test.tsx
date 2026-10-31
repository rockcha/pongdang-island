import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {StrictMode} from 'react'
import {shopkeepers,getShopkeeper} from '@/features/exploration/shopkeepers'
import {enterShopkeeper} from '@/features/exploration/shop-state'
import {newPractice,toggleSpell} from '@/features/exploration/practice-state'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {explorationArmor} from '@/features/exploration/armor-catalog'
import {shamanSpells,learnShamanSpell} from '@/features/exploration/shaman-stock'
import {startMonsterCombat,resolveCombatTurn} from '@/features/exploration/combat-state'
import {plannedSpells} from '@/features/exploration/spell-catalog'
import {useNpcConversation,type ConversationMemory} from '@/features/exploration/use-npc-conversation'
afterEach(()=>{cleanup();vi.restoreAllMocks()})
it('has six distinct merchants, scenes and nine personality lines each',()=>{
 expect(shopkeepers).toHaveLength(6);expect(new Set(shopkeepers.map(x=>x.background)).size).toBe(6)
 const lines=shopkeepers.flatMap(x=>[...x.greetings,...x.purchases,...x.farewells]);expect(lines).toHaveLength(54);expect(new Set(lines).size).toBe(54)
})
it.each(shopkeepers)('$name offers only their tier and retains stock independently on the floor',profile=>{
 const entered=enterShopkeeper({...newPractice(),gold:10000},profile,()=>0)
 if(profile.kind==='equipment'){
  expect(entered.market.weaponIds).toHaveLength(3)
  expect(entered.market.armorIds).toHaveLength(profile.sellsArmor?3:0)
  expect(entered.market.weaponIds.every(id=>explorationWeapons.find(x=>x.id===id)?.tier===profile.tier)).toBe(true)
  expect(entered.market.armorIds.every(id=>explorationArmor.find(x=>x.id===id)?.tier===profile.tier)).toBe(true)
 }else{
  expect(entered.shamanStock!.spellIds).toHaveLength(3);expect(new Set(entered.shamanStock!.spellIds).size).toBe(3)
  expect(entered.shamanStock!.spellIds.every(id=>shamanSpells.find(x=>x.id===id)?.tier===profile.tier)).toBe(true)
  const learned=learnShamanSpell(entered,entered.shamanStock!.spellIds[0]);expect(learned.spells).toHaveLength(1)
  expect(enterShopkeeper(learned,profile,()=>.99).shamanStock).toBe(entered.shamanStock)
 }
 const another=enterShopkeeper(entered,getShopkeeper(profile.id==='karim'?'hasan':'karim'),()=>.99)
 const back=enterShopkeeper(another,profile,()=>.99)
 expect(profile.kind==='equipment'?back.market.weaponIds:back.shamanStock?.spellIds).toEqual(profile.kind==='equipment'?entered.market.weaponIds:entered.shamanStock?.spellIds)
 const next=enterShopkeeper({...entered,market:{...entered.market,floor:2}},profile,()=>.99)
 expect(profile.kind==='equipment'?next.market.floor:next.shamanStock?.floor).toBe(2)
})
it('remembers entrance variants across visits and greets once under StrictMode',()=>{
 vi.spyOn(Math,'random').mockReturnValue(0);const memory:ConversationMemory=new Map(),talk=vi.fn(),profile=getShopkeeper('nefera')
 function Room(){const npc=useNpcConversation(profile.greetings,talk,()=>{},memory);return <button onClick={()=>npc.say(profile.purchases)}>구매</button>}
 const first=render(<StrictMode><Room/></StrictMode>);expect(talk).toHaveBeenCalledTimes(1);const intro=talk.mock.lastCall![0]
 fireEvent.click(screen.getByText('구매'));const line=talk.mock.lastCall![0];fireEvent.click(screen.getByText('구매'));expect(talk.mock.lastCall![0]).not.toBe(line)
 first.unmount();render(<StrictMode><Room/></StrictMode>);expect(talk.mock.lastCall![0]).not.toBe(intro)
})
function ready(id:string){const owned={...newPractice(),gold:10000,shamanStock:{floor:1,spellIds:[id]}};return {...startMonsterCombat(toggleSpell(learnShamanSpell(owned,id),id),'sand-scorpion'),hp:100,mp:30,combat:{monsterId:'sand-scorpion' as const,enemyHp:1000,turn:0,status:'active' as const}}}
it.each(plannedSpells)('learns, equips and casts $name with its actual effect',spell=>{
 const state=ready(spell.id),result=resolveCombatTurn(state,{type:'magic',id:spell.id},()=>.5)
 expect(result.playerState.mp).toBe(30-spell.mana);expect(result.playerState.combat?.turn).toBe(1)
 expect(result.events[0].text).toContain(spell.name);expect(state.combat.enemyHp).toBe(1000)
 if(spell.kind==='damage'||spell.kind==='damage-status')expect(result.playerState.combat?.enemyHp).toBeLessThan(1000)
 if(spell.id==='tomb-curse')expect(result.playerState.combat?.effects).toContainEqual({kind:'weaken',amount:6,turns:3})
 if(spell.id==='sun-god-glare'||spell.id==='black-sandstorm')expect(result.playerState.combat?.effects?.some(x=>x.kind==='blind')).toBe(true)
})
it('protects two counters without mutating the player animation snapshot',()=>{
 const result=resolveCombatTurn(ready('tide'),{type:'magic',id:'tide'},()=>.5)
 expect(result.playerState.combat?.ward).toEqual({amount:8,turns:2})
 expect(result.state.combat?.ward).toEqual({amount:8,turns:1})
})
it('applies might for four following actions, then removes it',()=>{
 let state=resolveCombatTurn(ready('sun-kings-majesty'),{type:'magic',id:'sun-kings-majesty'},()=>.5).state
 expect(state.combat?.attackBuff?.turns).toBe(4)
 for(let turn=0;turn<4;turn++){const result=resolveCombatTurn(state,{type:'attack'},()=>.5);expect(result.events[0].damage).toBe(29);state=result.state}
 expect(state.combat?.attackBuff).toBeUndefined()
})
it('cleanses monster flags and bleeding before the next tick',()=>{
 const state=ready('purifying-spring');state.combat={...state.combat,playerBlind:30,playerWeaken:2,magicResistanceDown:10};const result=resolveCombatTurn({...state,playerEffects:[{kind:'bleed',amount:2,turns:3}]},{type:'magic',id:'purifying-spring'},()=>.5)
 expect(result.playerState.playerEffects).toEqual([]);expect(result.playerState.combat?.playerBlind).toBeUndefined();expect(result.playerState.combat?.magicResistanceDown).toBeUndefined()
})

it('heals forty health with oasis breath and respects healing reduction',()=>{
 const state={...ready('oasis-breath'),hp:20,playerEffects:[{kind:'burn' as const,amount:40,turns:2}]}
 const result=resolveCombatTurn(state,{type:'magic',id:'oasis-breath'},()=>.5)
 expect(result.playerState.hp).toBe(44);expect(result.events[0].healing).toBe(24)
})

it('assigns simple weapons to Hasan and intermediate weapons plus armor to Karim',()=>{
 expect(getShopkeeper('hasan')).toMatchObject({tier:'starter',sellsArmor:false})
 expect(getShopkeeper('karim')).toMatchObject({tier:'advanced',sellsArmor:true})
})
