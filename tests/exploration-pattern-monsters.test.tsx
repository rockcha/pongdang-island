import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {newPractice,practiceSpells} from '@/features/exploration/practice-state'
import {resolveCombatTurn,startMonsterCombat} from '@/features/exploration/combat-state'
import {getCombatMonster,monsterPatternNotice} from '@/features/exploration/monster-patterns'
import {getMonster,type MonsterId} from '@/features/exploration/monster-catalog'
import {floorMonsterPool,drawFloorMonster,drawInvestigationMonster} from '@/features/exploration/campaign'
import {ScorpionRoom} from '@/features/exploration/scorpion-room'
import {seededRandom} from '../scripts/exploration/simulation'
import {existsSync} from 'node:fs'

afterEach(()=>{cleanup();vi.useRealTimers()})
function fight(id:MonsterId){return startMonsterCombat({...newPractice(()=>0),spells:practiceSpells,equippedSpells:['ember','sand'],potions:{health:9,mana:9}},id)}
const hit=(state:ReturnType<typeof fight>,roll=.99)=>resolveCombatTurn(state,{type:'attack'},()=>roll)
it('uses two healing charges instead of attacking, applies burn, and falls back after exhaustion',()=>{
 const base=fight('dewdrop-snail'),first=hit(base,.1),second=hit(first.state,.1),third=hit(second.state,.1)
 expect(first.state.combat?.enemyHp).toBe(38);expect(first.state.hp).toBe(100);expect(first.state.combat?.pattern?.healsUsed).toBe(1)
 expect(first.playerState.combat?.pattern?.healsUsed).toBeUndefined();expect(base.combat?.pattern?.healsUsed).toBeUndefined()
 expect(second.state.combat?.pattern?.healsUsed).toBe(2);expect(third.state.hp).toBeLessThan(100)
 const burned=hit({...base,combat:{...base.combat!,effects:[{kind:'burn',amount:40,turns:3}]}},.1)
 expect(burned.events.find(x=>x.effect==='enemy-heal')?.healing).toBe(3)
})
it('breaks shield armor on landed basics after calculating that hit and never breaks it with magic',()=>{
 const base=fight('cracked-shield-scarab'),first=hit(base),second=hit(first.state)
 expect(first.events[0].damage).toBe(4);expect(getCombatMonster(first.state).defense).toBe(3)
 expect(second.events[0].damage).toBe(7);expect(getCombatMonster(second.state).defense).toBe(0)
 expect(base.combat?.pattern?.shellHits).toBeUndefined()
 const spell=resolveCombatTurn(base,{type:'magic',id:'ember'},()=>.99)
 expect(spell.events[0].damage).toBe(20);expect(getCombatMonster(spell.state).defense).toBe(6)
 const missed=hit({...base,combat:{...base.combat!,playerBlind:100}})
 expect(missed.events[0].effect).toBe('miss');expect(getCombatMonster(missed.state).defense).toBe(6)
})
it('telegraphs rat escape for a full action, gives no reward and can be stopped by a finishing spell',()=>{
 const base=fight('cowardly-tomb-rat'),first=hit(base),prepared=hit(first.state)
 expect(prepared.state.combat?.pattern?.fleeReady).toBe(true);expect(prepared.playerState.combat?.pattern?.fleeReady).toBeFalsy()
 expect(prepared.state.hp).toBe(first.state.hp)
 const escaped=hit(prepared.state)
 expect(escaped.state.combat).toMatchObject({status:'escaped',enemyFled:true});expect(escaped.state.gold).toBe(base.gold)
 expect(escaped.events.some(x=>x.kind==='reward')).toBe(false)
 const won=resolveCombatTurn(prepared.state,{type:'magic',id:'ember'},()=>.99)
 expect(won.state.combat?.status).toBe('won');expect(won.state.gold).toBe(base.gold+150)
})
it('delays prepared flight while frozen without cancelling it',()=>{
 const base=fight('cowardly-tomb-rat'),prepared={...base,hp:50,combat:{...base.combat!,enemyHp:10,pattern:{fleeReady:true},effects:[{kind:'freeze' as const,amount:1,turns:1}]}}
 const frozen=resolveCombatTurn(prepared,{type:'potion',kind:'health'},()=>.99).state
 expect(frozen.combat?.status).toBe('active');expect(frozen.combat?.pattern?.fleeReady).toBe(true)
 expect(resolveCombatTurn(frozen,{type:'potion',kind:'mana'},()=>.99).state).toBe(frozen)
 const fled=resolveCombatTurn({...frozen,mp:0},{type:'potion',kind:'mana'},()=>.99).state
 expect(fled.combat?.enemyFled).toBe(true)
})
it('charges without damage, retains the warning through a stun and fires on the next available action',()=>{
 const base=fight('hourglass-sentinel'),charged=hit(base,.1)
 expect(charged.state.hp).toBe(100);expect(charged.state.combat?.pattern?.charging).toBe(true)
 expect(charged.playerState.combat?.pattern?.charging).toBeFalsy();expect(monsterPatternNotice(charged.state)).toContain('충전 완료')
 const stunned=resolveCombatTurn(charged.state,{type:'magic',id:'sand'},()=>.99).state
 expect(stunned.hp).toBe(100);expect(stunned.combat?.pattern?.charging).toBe(true)
 const burst=hit(stunned)
 expect(burst.state.hp).toBe(72);expect(burst.state.combat?.pattern?.charging).toBe(false)
 expect(burst.events.find(x=>x.kind==='monster')?.moveId).toBe('hourglass-burst')
})
it('adapts mirror resistance after each successful direct hit and switches rather than stacking',()=>{
 const base=fight('mirror-mask-mage'),physical=hit(base),magic=resolveCombatTurn(physical.state,{type:'magic',id:'ember'},()=>.99)
 expect(physical.events[0].damage).toBe(8);expect(getCombatMonster(physical.state)).toMatchObject({defense:8,magicResistance:2})
 expect(magic.events[0].damage).toBe(18);expect(getCombatMonster(magic.state)).toMatchObject({defense:2,magicResistance:8})
 const repeated=resolveCombatTurn(magic.state,{type:'magic',id:'ember'},()=>.99)
 expect(repeated.events[0].damage).toBe(12)
 expect(getCombatMonster(hit(magic.state).state)).toMatchObject({defense:8,magicResistance:2})
})
it('steals only existing gold twice, refunds the exact amount on victory and never refunds a retreat',()=>{
 const base={...fight('gold-pouch-toad'),gold:50},first=hit(base,.1),second=hit(first.state,.1),third=hit(second.state,.1)
 expect(first.state.gold).toBe(20);expect(second.state.gold).toBe(0);expect(second.state.combat?.pattern).toMatchObject({stealsUsed:2,stolenGold:50})
 expect(second.playerState.combat?.pattern?.stolenGold).toBe(30);expect(third.state.hp).toBeLessThan(base.hp)
 const won=hit({...second.state,combat:{...second.state.combat!,enemyHp:1}}).state
 expect(won.gold).toBe(290);expect(hit(won).state).toBe(won)
 expect(resolveCombatTurn(first.state,{type:'flee'},()=>0).state.gold).toBe(20)
 const empty=hit({...base,gold:0},.1);expect(empty.state.hp).toBeLessThan(base.hp);expect(empty.state.gold).toBe(0)
})
it.each([['dewdrop-snail',4],['cracked-shield-scarab',7],['cowardly-tomb-rat',9],['hourglass-sentinel',16],['mirror-mask-mage',21],['gold-pouch-toad',26]] as const)('gates %s until floor %s and ships all artwork', (id,start)=>{
 const monster=getMonster(id),intermediate=monster.tier==='intermediate'
 expect(floorMonsterPool(start-1,intermediate).some(x=>x.value===id)).toBe(false)
 expect(floorMonsterPool(start,intermediate).some(x=>x.value===id)).toBe(true)
 expect(existsSync('public'+monster.image)).toBe(true)
 for(const move of [monster.basic,...monster.magic])expect(existsSync('public'+move.image)).toBe(true)
})
it('normalizes all ordinary and intermediate pools to 100 and samples the configured rates',()=>{
 for(let floor=1;floor<=50;floor++)for(const intermediate of [false,true]){
  const pool=floorMonsterPool(floor,intermediate);expect(pool.reduce((sum,x)=>sum+x.weight,0)).toBe(100)
  expect(new Set(pool.map(x=>x.value)).size).toBe(pool.length)
 }
 for(const [floor,intermediate] of [[4,false],[9,false],[21,false],[16,true],[26,true]] as const){
  const counts=new Map<string,number>(),random=seededRandom(12345+floor)
  for(let i=0;i<20000;i++){const id=drawFloorMonster(floor,random,intermediate);counts.set(id,(counts.get(id)??0)+1)}
  for(const item of floorMonsterPool(floor,intermediate))expect(Math.abs((counts.get(item.value)??0)/20000-item.weight/100)).toBeLessThan(.015)
 }
 const random=seededRandom(934),counts={middle:0}
 for(let i=0;i<20000;i++)if(getMonster(drawInvestigationMonster(26,random)).tier==='intermediate')counts.middle++
 expect(counts.middle/20000).toBeGreaterThan(.33);expect(counts.middle/20000).toBeLessThan(.37)
})
it('shows live shell status and a distinct enemy-flight message without a player victory',()=>{
 const base=fight('cracked-shield-scarab');render(<ScorpionRoom state={base} latestLog="" speaker="탐험" busy={false} feedback={null} onAction={()=>{}} onDescend={()=>{}} onReturnToMain={()=>{}}/>)
 expect(screen.getByRole('status',{name:'몬스터 패턴'}).textContent).toContain('0/2');cleanup()
 const rat=fight('cowardly-tomb-rat');render(<ScorpionRoom state={{...rat,combat:{...rat.combat!,status:'escaped',enemyFled:true}}} latestLog="" speaker="탐험" busy={false} feedback={null} onAction={()=>{}} onDescend={()=>{}} onReturnToMain={()=>{}}/>)
 expect(screen.getByText(/달아났습니다/)).toBeTruthy();expect(screen.queryByText('도망 성공')).toBeNull();expect(screen.queryByRole('button',{name:'공격'})).toBeNull()
})
