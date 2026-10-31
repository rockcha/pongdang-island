import {practiceFinalFloor} from '@/features/exploration/campaign'
﻿import {it,expect} from 'vitest'
import {newPractice} from '@/features/exploration/practice-state'
import {startMonsterCombat,resolveCombatTurn} from '@/features/exploration/combat-state'
import {advanceExploration} from '@/features/exploration/run-state'
import {simulateCampaign} from '../scripts/exploration/simulation'
it('awards final victory only for defeating Raseph on practice floor fifty',()=>{
 for(const [floor,id,expected] of [[30,'obsidian-anubis',false],[49,'golden-pharaoh',false],[50,'sand-scorpion',false],[50,'golden-pharaoh',true]] as const){
  const fresh=newPractice(()=>0,'practice'),state={...fresh,weapons:fresh.weapons.map(item=>({...item,attack:500})),market:{...fresh.market,floor}}
  const fight=startMonsterCombat(state,id,{random:()=>0}),won=resolveCombatTurn(fight,{type:'attack'},()=>.5).state
  expect(won.combat?.status).toBe('won');expect(!!won.finalBossDefeated).toBe(expected)
  if(expected){expect(advanceExploration(won)).toBe(won);expect(advanceExploration({...won,combat:{...won.combat!,lootClaimed:true}}).completed).toBe(true)}
 }
})
it('tests final-boss ability without changing route decisions, inventory, or campaign outcomes',()=>{
 for(const strategy of ['explorer','survivor'] as const)for(const seed of [20261031,20261032,20311031]){
  const route=simulateCampaign(seed,strategy,.8,true),{finalBossProbe,...checked}=simulateCampaign(seed,strategy,.8,true,true)
  expect(checked).toEqual(route)
  expect(!!finalBossProbe).toBe(route.reached===practiceFinalFloor)
 }
})

it('records final victory on bleeding kills and does not mistake mid-boss bleeding kills for completion',()=>{
 for(const [id,floor,expected] of [['golden-pharaoh',50,true],['obsidian-anubis',30,false]] as const){
  const fresh=newPractice(()=>.5,'practice'),state={...fresh,weapons:fresh.weapons.map(item=>({...item,attack:1})),market:{...fresh.market,floor}}
  const fight=startMonsterCombat(state,id,{random:()=>.5})
  fight.combat!.enemyHp=5;fight.combat!.effects=[{kind:'bleed',amount:5,turns:2}]
  const won=resolveCombatTurn(fight,{type:'attack'},()=>.99).state
  expect(won.combat?.status).toBe('won');expect(!!won.finalBossDefeated).toBe(expected)
 }
})
