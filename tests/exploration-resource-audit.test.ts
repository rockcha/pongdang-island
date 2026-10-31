// @vitest-environment node
import {it,expect} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {explorationArmor} from '@/features/exploration/armor-catalog'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {newPractice,starterArmor,starterWeapon} from '@/features/exploration/practice-state'
import {explorationMonsters,getFloorMonster} from '@/features/exploration/monster-catalog'
import {startMonsterCombat,resolveCombatTurn,type CombatAction} from '@/features/exploration/combat-state'
import {shamanSpells} from '@/features/exploration/shaman-stock'
import {duelAudit} from '../scripts/exploration/blind-audit'
import {seededRandom} from '../scripts/exploration/simulation'
const enabled=process.env.EXPLORATION_DEEP_AUDIT==='1',folder='artifacts/exploration-deep-audit'
it.skipIf(!enabled)('compares armor roles with a fixed weapon and identical encounter seeds',()=>{
 const rows=[],trials=2000
 for(const armor of explorationArmor){
  const tier=armor.tier,weapon=explorationWeapons.find(w=>w.id===(tier==='starter'?'tomb-bronze-sword':tier==='advanced'?'obsidian-longblade':'royal-noon-greatsword'))??explorationWeapons.filter(w=>w.tier===tier)[0]
  const cases=tier==='starter'?[[10,'bandage-mummy'],[10,'lapis-cobra'],[10,'jar-wisp']]:tier==='advanced'?[[25,'sand-wraith'],[30,'obsidian-anubis'],[25,'tomb-hook-guard']]:[[45,'sand-wraith'],[40,'obsidian-anubis'],[50,'golden-pharaoh']]
  for(const [floor,id]of cases){const row=duelAudit(weapon,armor,id as Parameters<typeof duelAudit>[2],floor as number,trials,true);rows.push({...row,armorName:armor.name,armorTier:tier,armorRole:armor.role})}
 }
 mkdirSync(folder,{recursive:true});writeFileSync(folder+'/armor.json',JSON.stringify(rows,null,2));expect(rows).toHaveLength(explorationArmor.length*3)
},600000)
it.skipIf(!enabled)('measures the immediate net health from potion turns and healing spells',()=>{
 const rows=[],trials=5000,spell=shamanSpells.find(s=>s.id==='oasis-breath')!
 for(const floor of [1,11,21,31,41,50]){
  const tier=floor<=11?'starter':floor<=31?'advanced':'ultimate',armor=floor===1?starterArmor:explorationArmor.find(a=>a.tier===tier&&a.role==='균형형')??explorationArmor.find(a=>a.tier===tier)!,weapon=floor===1?starterWeapon:explorationWeapons.find(w=>w.tier===tier)!,id=floor===50?'golden-pharaoh':floor===1?'sand-scorpion':'sand-wraith'
  for(const action of [{type:'attack'},{type:'potion',kind:'health'},{type:'potion',kind:'mana'},{type:'magic',id:'oasis-breath'}] as CombatAction[]){
   let healed=0,netHp=0,deaths=0,blocked=0
   for(let i=0;i<trials;i++){
    let state=newPractice(()=>0,'practice');state={...state,market:{...state.market,floor},weapons:[weapon],weaponId:weapon.id,armor:[armor],armorId:armor.id,spells:[{...spell,message:spell.description}],equippedSpells:[spell.id],hp:Math.round((100+(armor.maxHpBonus??0))*.3),mp:20,potions:{health:1,mana:1}}
    state=startMonsterCombat(state,id);const result=resolveCombatTurn(state,action,seededRandom(50991+i))
    netHp+=result.state.hp-state.hp;healed+=result.events.filter(e=>e.kind==='player').reduce((s,e)=>s+(e.healing??0),0);if(result.state.hp===0)deaths++;blocked+=result.events.reduce((s,e)=>s+(e.defenseBlocked??0),0)
   }
   rows.push({floor,monster:id,armor:armor.id,weapon:weapon.id,startingHp:Math.round((100+(armor.maxHpBonus??0))*.3),maxHp:100+(armor.maxHpBonus??0),action:action.type==='potion'?action.kind+'-potion':action.type,trials,meanHealing:healed/trials,meanNetHp:netHp/trials,deathRate:deaths/trials,meanBlocked:blocked/trials})
  }
 }
 writeFileSync(folder+'/potion-turns.json',JSON.stringify(rows,null,2));expect(rows).toHaveLength(24)
},600000)
it.skipIf(!enabled)('exports the exact catalog used by controlled experiments',()=>{
 const data={weapons:[starterWeapon,...explorationWeapons],armor:[starterArmor,...explorationArmor],spells:shamanSpells,monsters:[1,11,21,31,41,50].flatMap(floor=>explorationMonsters.map(m=>({floor,...getFloorMonster(m.id,floor,true)})))}
 writeFileSync(folder+'/catalog.json',JSON.stringify(data,null,2));expect(data.weapons.length).toBeGreaterThan(30)
})
