import {expect,it,vi} from 'vitest'
vi.mock('@/features/exploration/attack-roll',async importOriginal=>({...await importOriginal<typeof import('@/features/exploration/attack-roll')>(),rollBasicAttack:(attack:number)=>Math.max(1,attack)}))
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'
import {newPractice,practiceSpells,type PracticeState} from '@/features/exploration/practice-state'
const rolls=(...values:number[])=>()=>values.shift()??.99
const crab=()=>startMonsterCombat(newPractice(()=>0),'saw-claw-crab')
const applyCrabBleed=()=>resolveCombatTurn(crab(),{type:'flee'},rolls(.99,.99,.99,0)).state
const stun=(state:PracticeState)=>resolveCombatTurn({...state,spells:practiceSpells,equippedSpells:['sand']},{type:'magic',id:'sand'},()=>.99)

it('applies crab bleeding on exactly 25% of landed basic attacks, not evaded or fully blocked hits',()=>{
 const initial=crab()
 const result=resolveCombatTurn(initial,{type:'flee'},rolls(.99,.99,.99,.249999))
 expect(result.state.hp).toBe(94)
 expect(result.playerState.hp).toBe(100)
 expect(result.playerState.playerEffects).toBeUndefined()
 expect(result.state.playerEffects).toEqual([{kind:'bleed',amount:2,turns:2}])
 expect(resolveCombatTurn(initial,{type:'flee'},rolls(.99,.99,.99,.25)).state.playerEffects).toBeUndefined()
 expect(resolveCombatTurn(initial,{type:'flee'},rolls(.99,0)).state.playerEffects).toBeUndefined()
 const guarded={...initial,spells:practiceSpells,equippedSpells:['tide']}
 const blocked=resolveCombatTurn(guarded,{type:'magic',id:'tide'},rolls(.99,.99,0))
 expect(blocked.state.hp).toBe(100);expect(blocked.state.playerEffects).toBeUndefined()
 expect(initial.playerEffects).toBeUndefined()
})
it('ticks two damage on two later player actions and preserves each player-phase snapshot',()=>{
 const initial=applyCrabBleed()
 const first=stun(initial)
 expect(first.playerState.hp).toBe(92);expect(first.state.hp).toBe(92)
 expect(first.playerState.playerEffects).toEqual([{kind:'bleed',amount:2,turns:1}])
 expect(first.events.find(event=>event.effect==='bleed')).toMatchObject({damage:2,target:'player'})
 const second=stun(first.state)
 expect(second.state.hp).toBe(90);expect(second.state.playerEffects).toEqual([])
 expect(stun(second.state).state.hp).toBe(90)
 expect(initial.hp).toBe(94);expect(initial.playerEffects?.[0].turns).toBe(2)
})
it('uses hook guard magic for three damage over three turns, without reducing it by armor',()=>{
 const guard=startMonsterCombat(newPractice(()=>0),'tomb-hook-guard')
 let state=resolveCombatTurn(guard,{type:'flee'},rolls(.99,0)).state
 expect(state.hp).toBe(86);expect(state.playerEffects).toEqual([{kind:'bleed',amount:3,turns:3}])
 state={...state,armor:[{id:'plate',name:'갑옷',description:'',reduction:100,magicReduction:100}],armorId:'plate'}
 for(const hp of [83,80,77]){state=stun(state).state;expect(state.hp).toBe(hp)}
 expect(state.playerEffects).toEqual([])
})
it('refreshes equal bleeding, does not stack it and never overwrites a stronger wound',()=>{
 const weak=applyCrabBleed()
 const refreshed=resolveCombatTurn(weak,{type:'flee'},rolls(.99,.99,.99,0)).state
 expect(refreshed.hp).toBe(86)
 expect(refreshed.playerEffects).toEqual([{kind:'bleed',amount:2,turns:2}])
 const strong={...crab(),playerEffects:[{kind:'bleed' as const,amount:3,turns:3}]}
 const ignored=resolveCombatTurn(strong,{type:'flee'},rolls(.99,.99,.99,0)).state
 expect(ignored.playerEffects).toEqual([{kind:'bleed',amount:3,turns:2}])
})
it('cleanses bleeding before its tick and never ticks on invalid actions or successful escape',()=>{
 const initial=applyCrabBleed()
 const equipped={...initial,weapons:[{id:'cleanse',name:'정화',description:'',attack:1,cleanseChance:100}],weaponId:'cleanse'}
 const result=resolveCombatTurn(equipped,{type:'attack'},rolls(.99,0,0))
 expect(result.playerState.hp).toBe(94);expect(result.state.playerEffects).toEqual([])
 expect(result.events.some(event=>event.effect==='bleed')).toBe(false)
 expect(resolveCombatTurn(initial,{type:'magic',id:'unknown'}).state).toBe(initial)
 const escaped=resolveCombatTurn(initial,{type:'flee'},()=>0).state
 expect(escaped.hp).toBe(94);expect(escaped.combat?.status).toBe('escaped');expect(escaped.gold).toBe(100000)
})
it('ends the run on a lethal bleeding tick with no enemy reply, but a finishing blow ends bleeding first',()=>{
 const initial={...crab(),hp:1,playerEffects:[{kind:'bleed' as const,amount:2,turns:1}]}
 const death=resolveCombatTurn(initial,{type:'attack'},()=>.99)
 expect(death.state.hp).toBe(0);expect(death.playerState.combat?.status).toBe('lost')
 expect(death.events.some(event=>event.moveId)).toBe(false)
 expect(death.state.gold).toBe(100000);expect(death.lines.at(-1)).toBe('사망하였습니다.')
 const dying={...initial,combat:{...initial.combat!,enemyHp:1}}
 const won=resolveCombatTurn(dying,{type:'attack'},()=>.99)
 expect(won.state.hp).toBe(1);expect(won.state.combat?.status).toBe('won');expect(won.state.gold).toBe(100130)
})
