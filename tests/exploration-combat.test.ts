import {expect,it} from 'vitest'
import {escapeChance,resolveCombatTurn,startScorpionCombat} from '@/features/exploration/combat-state'
import {equipGear,grantPracticeSupplies,newPractice,toggleSpell} from '@/features/exploration/practice-state'

it('applies starter damage, armor reduction and critical strikes',()=>{
 const initial=startScorpionCombat(newPractice())
 const hit=resolveCombatTurn(initial,{type:'attack'},()=>.9)
 expect(hit.state.combat?.enemyHp).toBe(36);expect(hit.state.hp).toBe(93)
 expect(hit.playerState.hp).toBe(100)
 expect(hit.playerState.combat?.enemyHp).toBe(36)
 expect(initial.combat?.enemyHp).toBe(48)
 expect(hit.events.map(event=>event.kind)).toEqual(['player','monster'])
 expect(hit.events[1].damage).toBe(7)
 const critical=resolveCombatTurn(initial,{type:'attack'},()=>0)
 expect(critical.state.combat?.enemyHp).toBe(24);expect(critical.state.hp).toBe(100)
 expect(critical.lines.join(' ')).toContain('치명타')
})
it('awards gold once, never counters after death and freezes terminal combat',()=>{
 let state=startScorpionCombat(newPractice())
 for(let i=0;i<4;i++)state=resolveCombatTurn(state,{type:'attack'},()=>.9).state
 expect(state.combat?.status).toBe('won');expect(state.gold).toBe(1120);expect(state.hp).toBe(79)
 expect(resolveCombatTurn(state,{type:'attack'}).state).toBe(state)
})
it('uses only equipped gear escape bonuses and consumes the next-attempt boost',()=>{
 let state=grantPracticeSupplies(newPractice())
 expect(escapeChance(state)).toBe(35)
 state=equipGear(equipGear(state,'weapon','sand-staff'),'armor','linen-wrap')
 expect(escapeChance(state)).toBe(50)
 state=startScorpionCombat({...state,escapeBoost:50})
 expect(escapeChance(state)).toBe(100)
 const success=resolveCombatTurn(state,{type:'flee'},()=>.99).state
 expect(success.combat?.status).toBe('escaped');expect(success.gold).toBe(1000);expect(success.escapeBoost).toBe(0)
 const failed=resolveCombatTurn(startScorpionCombat({...newPractice(),escapeBoost:50}),{type:'flee'},()=>.9).state
 expect(failed.hp).toBe(93);expect(failed.escapeBoost).toBe(0);expect(failed.combat?.status).toBe('active')
})
it('rejects unowned, unequipped and unaffordable magic without spending a turn',()=>{
 const state=startScorpionCombat(grantPracticeSupplies(newPractice()))
 expect(resolveCombatTurn(state,{type:'magic',id:'ember'}).state).toBe(state)
 const equipped=toggleSpell(state,'ember'),empty={...equipped,mp:0}
 expect(resolveCombatTurn(empty,{type:'magic',id:'ember'}).state).toBe(empty)
 expect(resolveCombatTurn(equipped,{type:'magic',id:'unknown'}).state).toBe(equipped)
})
it('resolves attack, protection, healing and stun magic with mana costs',()=>{
 const base=startScorpionCombat(grantPracticeSupplies({...newPractice(),hp:80}))
 const cast=(id:string)=>resolveCombatTurn(toggleSpell(base,id),{type:'magic',id},()=>.9).state
 expect(cast('ember')).toMatchObject({mp:24,hp:73,combat:{enemyHp:28,turn:1}})
 expect(cast('tide')).toMatchObject({mp:22,hp:80,combat:{enemyHp:48}})
 expect(cast('light')).toMatchObject({mp:25,hp:91})
 expect(cast('sand')).toMatchObject({mp:23,hp:80,combat:{enemyHp:36}})
})
it('clamps health at zero on defeat and disallows further actions',()=>{
 const result=resolveCombatTurn(startScorpionCombat({...newPractice(),hp:1}),{type:'attack'},()=>.9).state
 expect(result.hp).toBe(0);expect(result.combat?.status).toBe('lost')
 expect(resolveCombatTurn(result,{type:'flee'}).state).toBe(result)
 expect(startScorpionCombat(result)).toBe(result)
})
