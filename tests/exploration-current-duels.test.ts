// @vitest-environment node
import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {newExplorationModel,applyExplorationAction} from '@/features/exploration/server-engine'
import {startMonsterCombat} from '@/features/exploration/combat-state'
import {deepMonsters} from '@/features/exploration/deep-monsters'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {explorationArmor} from '@/features/exploration/armor-catalog'
import {practiceSpells,playerMaxHp} from '@/features/exploration/practice-state'
import {auditAction,basePolicy} from '../scripts/exploration/blind-audit'
import {seededRandom,wilsonInterval} from '../scripts/exploration/simulation'

it('measures the selected late-game encounters through authoritative actions with explicit real loadouts',()=>{
 const auditing=process.env.EXPLORATION_CURRENT_DUELS==='1',n=auditing?Number(process.env.CURRENT_DUEL_RUNS??1000):5,rows=[]
 const kits=[['advanced','desert-steel-longsword','tomb-guardian-armor'],['ultimate','blackmoon-rapier','golden-scales-aegis'],['freeze','eternal-winter-kingspear','golden-scales-aegis']]
 for(const [kit,weaponId,armorId]of kits)for(const healthStock of [0,2,5])for(const monster of deepMonsters){
  const weapon=explorationWeapons.find(item=>item.id===weaponId)!,armor=explorationArmor.find(item=>item.id===armorId)!
  expect(weapon).toBeTruthy();expect(armor).toBeTruthy()
  let wins=0,turns=0,healthUsed=0,manaUsed=0,winHp=0
  for(let sample=0;sample<n;sample++){
   const random=seededRandom(202611020+sample),model=newExplorationModel(random)
   let state={...model.state,market:{...model.state.market,floor:monster.id==='black-sun-aker'?80:monster.id==='golden-scales-maaken'?65:60},weapons:[weapon],weaponId,armor:[armor],armorId,spells:practiceSpells,equippedSpells:['light','tide'],potions:{health:healthStock,mana:healthStock?1:0}}
   state={...state,hp:playerMaxHp(state)}
   let current={...model,view:'combat' as const,state:startMonsterCombat(state,monster.id,{random})},count=0
   while(current.state.combat?.status==='active'&&count++<100){
    const action=auditAction(current.state,basePolicy)
    current=applyExplorationAction(current,{type:'combat',action},0,random) as typeof current
    if(action.type==='potion'){if(action.kind==='health')healthUsed++;else manaUsed++}
   }
   expect(count).toBeLessThan(100);expect(current.state.hp).toBeGreaterThanOrEqual(0)
   turns+=count;if(current.state.combat?.status==='won'){wins++;winHp+=current.state.hp}
  }
  rows.push({kit,weaponId,weapon:weapon.name,armorId,armor:armor.name,startingHp:100+armor.maxHpBonus,healthStock,manaStock:healthStock?1:0,spells:['light','tide'],monsterId:monster.id,monster:monster.name,n,wins,winRate:wins/n,ci95:wilsonInterval(wins,n),meanTurns:turns/n,healthUsed:healthUsed/n,manaUsed:manaUsed/n,meanWinHp:wins?winHp/wins:0})
 }
 if(auditing){
  const sources=[...readdirSync('src/features/exploration').filter(file=>file.endsWith('.ts')).map(file=>'src/features/exploration/'+file),'scripts/exploration/blind-audit.ts','scripts/exploration/simulation.ts','tests/exploration-current-duels.test.ts']
  const sourceHash=createHash('sha256').update(sources.map(path=>path+'\n'+readFileSync(path,'utf8')).join('\n')).digest('hex')
  mkdirSync('artifacts/exploration-current',{recursive:true})
  writeFileSync('artifacts/exploration-current/late-game-duels.json',JSON.stringify({generatedAt:new Date().toISOString(),engine:'applyExplorationAction',scope:'isolated encounters, full starting health; not an 80-floor campaign',n,seedStart:202611020,sources,sourceHash,rows},null,2))
 }
},600000)
