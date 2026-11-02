import {it,expect} from 'vitest'
import {newPractice,practiceSpells} from '../src/features/exploration/practice-state'
import {startMonsterCombat,resolveCombatTurn} from '../src/features/exploration/combat-state'
import {explorationWeapons,hasWeaponEffect,weaponEffectText} from '../src/features/exploration/weapon-catalog'
import {explorationMonsters,getMonster} from '../src/features/exploration/monster-catalog'
import {floorMonsterPool} from '../src/features/exploration/campaign'
import {bossPreludeLines} from '../src/features/exploration/boss-prelude'

it('offers the shield guard only on floors 16 through 30 and casts a non-attacking 30 shield',()=>{
 for(const floor of [15,31])expect(floorMonsterPool(floor).some(x=>x.value==='sandstone-shield-guard')).toBe(false)
 for(const floor of [16,30])expect(floorMonsterPool(floor).some(x=>x.value==='sandstone-shield-guard')).toBe(true)
 const state=startMonsterCombat({...newPractice(),mp:0,potions:{health:0,mana:2}},'sandstone-shield-guard')
 const result=resolveCombatTurn(state,{type:'potion',kind:'mana'},()=>.2)
 expect(result.state.combat?.pattern?.shieldHp).toBe(30)
 expect(result.state.hp).toBe(state.hp)
 expect(result.events.some(event=>event.moveId==='sandstone-guard-wall')).toBe(true)
})
it.each(explorationMonsters.filter(m=>m.magic.some(skill=>skill.enemyShield)))('$name never recasts a shield while any capacity remains',monster=>{
 const base=startMonsterCombat({...newPractice(),mp:0,potions:{health:0,mana:2}},monster.id)
 base.combat!.pattern={shieldHp:100,cycle:4}
 const result=resolveCombatTurn(base,{type:'potion',kind:'mana'},()=>0)
 expect(result.state.combat?.pattern?.shieldHp).toBe(100)
 const shieldIds=monster.magic.filter(skill=>skill.enemyShield).map(skill=>skill.id)
 expect(result.events.some(event=>shieldIds.includes(event.moveId??''))).toBe(false)
})
it.each(['cracked-wall-hammer','lapis-shield-breaker'])('%s shatters before damage and does not shatter on a miss',id=>{
 const weapon=explorationWeapons.find(weapon=>weapon.id===id)!
 expect(hasWeaponEffect(weapon)).toBe(true);expect(weaponEffectText(weapon)).toContain('보호막')
 const state=startMonsterCombat({...newPractice(),weapons:[weapon],weaponId:id,spells:practiceSpells},'sandstone-shield-guard')
 state.combat!.pattern={shieldHp:100}
 const result=resolveCombatTurn(state,{type:'attack'},()=>.99)
 expect(result.state.combat?.pattern?.shieldHp).toBe(0)
 expect(result.events.find(event=>event.kind==='player')?.damage).toBe(weapon.attack-2)
 expect(state.combat!.pattern.shieldHp).toBe(100)
 const missed=resolveCombatTurn({...state,combat:{...state.combat!,playerBlind:100}},{type:'attack'},()=>.99)
 expect(missed.state.combat?.pattern?.shieldHp).toBe(100)
})
it('provides dedicated threatening Pongi preludes for all bosses and keeps ordinary encounters generic',()=>{
 for(const monster of explorationMonsters.filter(monster=>monster.tier==='boss'))expect(bossPreludeLines(monster)!.length).toBeGreaterThanOrEqual(3)
 expect(bossPreludeLines(getMonster('sandstone-shield-guard'))).toBeUndefined()
 expect(bossPreludeLines(getMonster('golden-scales-maaken'))!.some(line=>line.includes('집행자'))).toBe(true)
 expect(bossPreludeLines(getMonster('black-sun-aker'))!.some(line=>line.includes('마지막'))).toBe(true)
})
