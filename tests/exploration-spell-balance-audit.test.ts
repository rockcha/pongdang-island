// @vitest-environment node
import {it,expect} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {plannedSpells} from '@/features/exploration/spell-catalog'
import {newPractice,practiceSpells,starterWeapon,starterArmor} from '@/features/exploration/practice-state'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {explorationArmor} from '@/features/exploration/armor-catalog'
import {startMonsterCombat,resolveCombatTurn} from '@/features/exploration/combat-state'
import {seededRandom} from '../scripts/exploration/simulation'
it.skipIf(process.env.SPELL_BALANCE_AUDIT!=='1')('compares new and existing offensive spells with equal tier equipment and starting mana',()=>{
 const rows=[]
 for(const ids of [['ember','compressed-water-bolt','sandstone-bolt','ember-brand'],['solar-lance','frost-wave','crimson-shards','binding-chain'],['judgment-of-ra','black-sandstorm','glacial-crown']]){
  for(const id of ids){
   const spell=[...practiceSpells,...plannedSpells].find(s=>s.id===id)!,tier='tier' in spell?spell.tier:'starter',floor=tier==='starter'?10:tier==='advanced'?30:50,monster=tier==='starter'?'bandage-mummy':tier==='advanced'?'obsidian-anubis':'golden-pharaoh'
   const weapon=tier==='starter'?starterWeapon:explorationWeapons.find(w=>w.id===(tier==='advanced'?'red-fang-sword':'royal-noon-greatsword'))!,armor=tier==='starter'?starterArmor:explorationArmor.find(a=>a.id===(tier==='advanced'?'tomb-guardian-armor':'golden-scales-aegis'))!
   let wins=0,turns=0,hp=0,mana=0,casts=0
   const trials=5000
   for(let i=0;i<trials;i++){
    const fresh=newPractice(()=>0,'practice');let state=startMonsterCombat({...fresh,market:{...fresh.market,floor},weapons:[weapon],weaponId:weapon.id,armor:[armor],armorId:armor.id,hp:100+(armor.maxHpBonus??0),spells:[{...spell,message:''}],equippedSpells:[id]},monster)
    const random=seededRandom(20261105+i)
    for(let t=0;t<100&&state.combat?.status==='active';t++){
     const magic=state.mp>=spell.mana
     state=resolveCombatTurn(state,magic?{type:'magic',id}:{type:'attack'},random).state
     if(magic)casts++
    }
    if(state.combat?.status==='won')wins++;turns+=state.combat?.turn??0;hp+=state.hp;mana+=40-state.mp
   }
   rows.push({id,name:spell.name,tier,floor,monster,weapon:weapon.id,armor:armor.id,trials,winRate:wins/trials,meanTurns:turns/trials,meanHp:hp/trials,meanManaSpent:mana/trials,meanCasts:casts/trials})
  }
 }
 mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/exploration-new-spell-balance.json',JSON.stringify({method:'Controlled spell-first fights; full HP/40 MP, one known spell, no potions. Compare only within a tier; not an optimal or full-campaign policy.',rows},null,2));expect(rows).toHaveLength(11)
},120000)
