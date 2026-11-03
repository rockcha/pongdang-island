import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {newPractice} from '@/features/exploration/practice-state'
import {acceptChoiceRoom} from '@/features/exploration/choice-room-state'
import {startMonsterCombat,resolveCombatTurn,type CombatEvent} from '@/features/exploration/combat-state'
import {combatPhaseEvents,combatPresentation,finalCombatPhase,isRevivalEvent} from '@/features/exploration/combat-presentation'
import {ScorpionRoom} from '@/features/exploration/scorpion-room'

afterEach(cleanup)
function fight(bleed=false){
 const state=startMonsterCombat({...acceptChoiceRoom(newPractice(),'soul-lantern'),hp:1,mp:0,potions:{health:0,mana:2},...(bleed?{playerEffects:[{kind:'bleed' as const,amount:3,turns:2}]}:{})},'ancient-giant')
 state.combat!.turn=1
 return resolveCombatTurn(state,{type:'potion',kind:'mana'},()=>.99)
}
it.each([false,true])('shows lantern revival instead of only incoming damage (bleed=%s)',bleed=>{
 const result=fight(bleed),phase=bleed?'bleed':'reply'
 expect(result.state.hp).toBe(20);expect(result.state.soulLantern).toBe('spent')
 expect(result.state.combat?.status).toBe('active')
 const presentation=combatPresentation(result,phase,'potion')
 expect(isRevivalEvent(presentation.event!)).toBe(true)
 expect(presentation.text).toContain('영혼의 등불')
 render(<ScorpionRoom state={result.state} busy feedback={{id:1,phase,action:'potion',events:combatPhaseEvents(result,phase)}} latestLog={presentation.text} logEvent={presentation.event} speaker="탐험" onAction={()=>{}} onDescend={()=>{}} onReturnToMain={()=>{}}/>)
 expect(screen.getByText('영혼의 등불 발동 · 체력 20')).toBeTruthy()
 const visible=screen.getByRole('status',{name:'탐험 로그'}).querySelector('p')!
 expect(visible.textContent).toContain('영혼의 등불이 발동해 체력 20 상태로 부활했습니다.')
 expect(screen.queryByText('사망하였습니다.')).toBeNull()
})
it('keeps the bleed revival message through skipped counter phases and after animation finishes',()=>{
 const result=fight(true)
 expect(finalCombatPhase(result)).toBe('bleed')
 for(const phase of ['bleed','counter','reply',finalCombatPhase(result)] as const){
  expect(combatPresentation(result,phase,'potion').event).toMatchObject({kind:'system',healing:20})
 }
 expect(result.events.some(event=>event.kind==='monster')).toBe(false)
})
it('does not label normal healing or soul-knot survival as a lantern activation',()=>{
 const heal:CombatEvent={kind:'player',healing:20,text:'체력 20 회복'}
 expect(isRevivalEvent(heal)).toBe(false)
 const state=startMonsterCombat({...newPractice(),hp:1,soulLantern:'ready'},'ancient-giant')
 state.combat!.spellEffects=[{id:'soul-knot',turns:4}]
 const result=resolveCombatTurn(state,{type:'attack'},()=>.99)
 expect(result.state.hp).toBe(1);expect(result.state.soulLantern).toBe('ready')
 expect(combatPresentation(result,'reply').event?.spellId).toBe('soul-knot')
})
