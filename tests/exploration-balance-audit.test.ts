import {expect,it} from 'vitest'
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
import {explorationWeapons,hasWeaponEffect} from '@/features/exploration/weapon-catalog'
import {newPractice} from '@/features/exploration/practice-state'
import {sandScorpion,resolveCombatTurn,startScorpionCombat} from '@/features/exploration/combat-state'

function randomFor(seed:number){let value=seed;return()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return (value>>>0)/4294967296}}
it('audits every ultimate weapon with the real combat engine across short and sustained fights',()=>{
 const weapons=explorationWeapons.filter(weapon=>weapon.tier==='ultimate')
 const original={...sandScorpion}
 const scenarios=[{hp:48,attack:8,playerHp:100},{hp:240,attack:16,playerHp:100},{hp:600,attack:24,playerHp:100},{hp:240,attack:16,playerHp:60}]
 const rows=[]
 try{
  for(const scenario of scenarios){
   Object.assign(sandScorpion,{maxHp:scenario.hp,attack:scenario.attack})
   for(const weapon of weapons){
    let wins=0,totalTurns=0,health=0,healing=0
    const trials=1000
    for(let run=0;run<trials;run++){
     const random=randomFor(1234567+run*7919)
     let state=startScorpionCombat({...newPractice(),hp:scenario.playerHp,weapons:[weapon],weaponId:weapon.id})
     for(let turn=0;turn<100&&state.combat?.status==='active';turn++){
      const result=resolveCombatTurn(state,{type:'attack'},random);state=result.state
      healing+=result.events.reduce((sum,event)=>sum+(event.healing??0),0)
     }
     if(state.combat?.status==='won')wins++
     totalTurns+=state.combat?.turn??0;health+=state.hp
    }
    rows.push({scenario,weapon:weapon.id,name:weapon.name,directMean:weapon.attack*(1+weapon.critical/100),winRate:wins/trials,turns:totalTurns/trials,hp:health/trials,healing:healing/trials})
   }
  }
 }finally{Object.assign(sandScorpion,original)}
 expect(rows).toHaveLength(36)
 for(const row of rows){expect(row.turns).toBeGreaterThan(0);expect(row.winRate).toBeGreaterThanOrEqual(0);expect(row.hp).toBeLessThanOrEqual(100)}
 if(process.env.WEAPON_BALANCE_AUDIT){
  mkdirSync('artifacts',{recursive:true})
  const file='artifacts/ultimate-balance-audit.json'
  const audit=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{}
  audit[process.env.WEAPON_BALANCE_AUDIT]=rows
  writeFileSync(file,JSON.stringify(audit,null,2)+'\n')
 }
 // Keep the source of truth unchanged by scenario fixtures.
 expect(sandScorpion.maxHp).toBe(original.maxHp)
 expect(weapons.filter(weapon=>!hasWeaponEffect(weapon))).toHaveLength(3)
})
