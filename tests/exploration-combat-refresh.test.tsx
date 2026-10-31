import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {newPractice,practiceSpells,playerManaMax} from '@/features/exploration/practice-state'
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'
import {acceptChoiceRoom} from '@/features/exploration/choice-room-state'
import {createRoomVisit,restFully} from '@/features/exploration/adventure-rooms'
import {advanceExploration,enterBossOasis} from '@/features/exploration/run-state'
import {ScorpionRoom} from '@/features/exploration/scorpion-room'
import {AilmentGuide} from '@/features/exploration/ailments'
import {plannedSpells} from '@/features/exploration/spell-catalog'
import {combatTime,combatTimings} from '@/features/exploration/combat-timing'
import {SpellCastEffect} from '@/features/exploration/spell-cast-effect'
import {WeaponAttackEffect} from '@/features/exploration/weapon-attack-effect'
const roll=()=>.99
afterEach(()=>{cleanup();vi.useRealTimers()})
it('clears player bleeding on victory, enemy bleeding kills and successful escapes',()=>{
 const base=startMonsterCombat({...newPractice(),playerEffects:[{kind:'bleed',amount:2,turns:3}]},'sand-scorpion')
 const killed=resolveCombatTurn({...base,combat:{...base.combat!,enemyHp:1}},{type:'attack'},roll)
 expect(killed.state.playerEffects).toEqual([]);expect(killed.state.hp).toBe(100)
 const fled=resolveCombatTurn(base,{type:'flee'},()=>0);expect(fled.state.combat?.status).toBe('escaped');expect(fled.state.playerEffects).toEqual([])
 const dot=resolveCombatTurn({...base,combat:{...base.combat!,enemyHp:20,effects:[{kind:'bleed',amount:30,turns:2}]}},{type:'attack'},roll)
 expect(dot.state.combat?.status).toBe('won');expect(dot.state.playerEffects).toEqual([])
})
it('spends five mana and keeps water protection for exactly two counters',()=>{
 const initial=startMonsterCombat({...newPractice(),spells:practiceSpells,equippedSpells:['tide']},'ancient-giant')
 const first=resolveCombatTurn(initial,{type:'magic',id:'tide'},roll)
 expect(first.state.mp).toBe(35);expect(first.state.combat?.ward?.turns).toBe(1)
 const second=resolveCombatTurn(first.state,{type:'attack'},roll)
 expect(second.state.combat?.ward).toBeUndefined()
 const without={...first.state,combat:{...first.state.combat!,ward:undefined}}
 expect(resolveCombatTurn(without,{type:'attack'},roll).state.hp).toBe(second.state.hp-8)
})
it('recharges a spent lantern, never stacks charges and keeps at least ten maximum mana',()=>{
 let state=acceptChoiceRoom(newPractice(),'soul-lantern');expect(acceptChoiceRoom(state,'soul-lantern')).toBe(state)
 state=acceptChoiceRoom({...state,soulLantern:'spent'},'soul-lantern');expect(playerManaMax(state)).toBe(20);expect(state.soulLantern).toBe('ready')
 state=acceptChoiceRoom({...state,soulLantern:'spent'},'soul-lantern');expect(playerManaMax(state)).toBe(10)
 const spent={...state,soulLantern:'spent' as const};expect(acceptChoiceRoom(spent,'soul-lantern')).toBe(spent)
})
it('ends the turn on a bleeding revival and also revives against the final boss',()=>{
 const base=acceptChoiceRoom(newPractice(),'soul-lantern')
 const bleeding=resolveCombatTurn(startMonsterCombat({...base,hp:1,playerEffects:[{kind:'bleed',amount:2,turns:2}]},'ancient-giant'),{type:'attack'},roll)
 expect(bleeding.state.hp).toBe(20);expect(bleeding.events.some(e=>e.kind==='monster')).toBe(false)
 const boss=resolveCombatTurn(startMonsterCombat({...base,hp:1},'golden-pharaoh'),{type:'attack'},roll)
 expect(boss.playerState.hp).toBe(1);expect(boss.state.hp).toBe(20);expect(boss.state.soulLantern).toBe('spent');expect(boss.state.combat?.status).toBe('active')
 expect(boss.events.find(e=>e.healing===20)?.phase).toBe('reply')
})
it('records a lethal enemy hit in the reply phase while preserving the alive player snapshot',()=>{
 const result=resolveCombatTurn(startMonsterCombat({...newPractice(),hp:1},'ancient-giant'),{type:'attack'},roll)
 expect(result.playerState.hp).toBe(1);expect(result.state.hp).toBe(0)
 expect(result.events.find(e=>e.text==='사망하였습니다.')?.phase).toBe('reply')
})
it('requires a post-boss oasis after settling loot without consuming a floor',()=>{
 const initial=startMonsterCombat(newPractice(),'obsidian-anubis')
 const won=resolveCombatTurn({...initial,combat:{...initial.combat!,enemyHp:1}},{type:'attack'},roll).state
 expect(won.bossRestPending).toBe(true);expect(advanceExploration(won)).toBe(won);expect(enterBossOasis(won)).toBe(won)
 const claimed={...won,combat:{...won.combat!,lootClaimed:true}},oasis=enterBossOasis(claimed)
 expect(oasis.market.floor).toBe(initial.market.floor);expect(oasis.combat).toBeNull();expect(oasis.bossRestPending).toBe(false)
 expect(restFully({...oasis,hp:1,mp:0}).hp).toBe(100)
 expect(advanceExploration(oasis).market.floor).toBe(initial.market.floor+1)
})
it('keeps a guarded chest closed until the victory opening button is selected',async()=>{
 vi.useFakeTimers();const fresh=newPractice(),visit=createRoomVisit('chest',fresh,'test',roll)
 expect(visit.outcome.kind).toBe('monster');if(visit.outcome.kind!=='monster')throw Error('fixture')
 expect(visit.outcome.loot).toBeTruthy();const started=startMonsterCombat(fresh,visit.outcome.monsterId,{loot:visit.outcome.loot,lootSource:'chest'})
 const state={...started,combat:{...started.combat!,status:'won' as const,enemyHp:0}},open=vi.fn()
 render(<ScorpionRoom state={state} busy={false} latestLog="승리" speaker="탐험" feedback={null} onAction={()=>{}} onDescend={()=>{}} onReturnToMain={()=>{}} onLootReady={open}/>);
 await act(async()=>{await vi.advanceTimersByTimeAsync(combatTime(2800)+1)});expect(open).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole('button',{name:'상자 열기'}));expect(open).toHaveBeenCalledWith(visit.outcome.loot)
})
it('removes the bronze ward and keeps the general ailment guide free of fixed example numbers',()=>{
 expect(plannedSpells.some(s=>s.id==='bronze-ward')).toBe(false)
 render(<AilmentGuide/>);fireEvent.click(screen.getByRole('button',{name:'상태이상 안내'}));expect(screen.getByRole('dialog').textContent).not.toMatch(/턴당 피해 2|치유량 40%|표시 예시/)
})
it('uses a single 1.2x timeline for attacks and counterattacks',()=>{
 expect(combatTimings.done).toBe(5167);expect(combatTimings.player).toBe(917);expect(combatTimings.reply).toBe(3583)
})
it('gives ultimate spells and weapons a stronger impact seal without changing ordinary attacks',()=>{
 const spell=render(<SpellCastEffect spellId="judgment-of-ra"/>);expect(spell.container.querySelector('.spell-grand-ring')).toBeTruthy();expect(spell.container.querySelectorAll('.spell-impact>i')).toHaveLength(16);spell.unmount()
 const ordinary=render(<SpellCastEffect spellId="ember"/>);expect(ordinary.container.querySelector('.spell-grand-ring')).toBeNull();ordinary.unmount()
 const weapon=render(<WeaponAttackEffect weaponId="anubis-crimson-judgment" phase="player"/>);expect(weapon.container.querySelector('.weapon-grand-seal')).toBeTruthy()
})
