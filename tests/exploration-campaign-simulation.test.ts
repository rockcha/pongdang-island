import {playerMaxMp} from '@/features/exploration/practice-state'
import {practiceFinalFloor,practiceFinalBossId} from '@/features/exploration/campaign'
// @vitest-environment node
import {createHash} from 'node:crypto'
import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {strategies,simulateCampaign,summarizeRuns} from '../scripts/exploration/simulation'
it('measures the real fifty-floor rules with reproducible routes, battles and purchases',()=>{
 const audit=process.env.EXPLORATION_BALANCE_AUDIT==='1',trials=audit?Number(process.env.EXPLORATION_BALANCE_RUNS??10000):20
 const seedStart=Number(process.env.EXPLORATION_BALANCE_SEED??20311031)
 const rows=[],examples=[]
 for(const strategy of strategies){
  const runs=Array.from({length:trials},(_,index)=>simulateCampaign(seedStart+index,strategy,.8,false,true))
  for(const run of runs){expect(run.reached).toBeLessThanOrEqual(practiceFinalFloor);expect(run.completedFloors).toBeLessThanOrEqual(practiceFinalFloor);expect(run.hp).toBeGreaterThanOrEqual(0);if(run.completed){expect(run.completedFloors).toBe(practiceFinalFloor);expect(run.finalBossWin).toBe(true)}}
  rows.push(summarizeRuns(runs))
  if(audit)for(const example of [runs.find(run=>run.completed),runs.find(run=>!run.completed)])if(example)examples.push(simulateCampaign(example.seed,strategy,.8,true,true))
 }
 expect(simulateCampaign(303,'explorer',.8,true)).toEqual(simulateCampaign(303,'explorer',.8,true))
 if(audit){
  mkdirSync('artifacts',{recursive:true})
  const sensitivity=[.5,1].map(accuracy=>({accuracy,...summarizeRuns(Array.from({length:trials},(_,index)=>simulateCampaign(seedStart+index,'explorer',accuracy)))}))
  const sourceFiles=['src/features/exploration/campaign.ts','src/features/exploration/campaign-balance.ts','src/features/exploration/run-state.ts','src/features/exploration/combat-state.ts','src/features/exploration/practice-state.ts','src/features/exploration/adventure-rooms.ts','src/features/exploration/room-loot.ts','src/features/exploration/monster-catalog.ts','src/features/exploration/shop-state.ts','src/features/exploration/shaman-stock.ts','src/features/exploration/weapon-catalog.ts','src/features/exploration/armor-catalog.ts','src/features/exploration/spell-catalog.ts','src/features/exploration/spell-mechanics.ts','src/features/exploration/attack-roll.ts','src/features/exploration/status-effects.ts','src/features/exploration/acquisition-history.ts','src/features/exploration/merchant-stock.ts','src/features/exploration/shopkeepers.ts','scripts/exploration/simulation.ts']
  const rulesHash=createHash('sha256').update(sourceFiles.map(path=>path+'\n'+readFileSync(path,'utf8')).join('\n')).digest('hex')
  const report={rulesHash,sourceFiles,command:'npm run exploration:balance',generatedAt:new Date().toISOString(),rules:'shared live campaign/combat/loot/shop functions',initial:{gold:0,hp:100,mp:playerMaxMp,healthPotions:0,manaPotions:0},finalFloor:practiceFinalFloor,finalBoss:practiceFinalBossId,quizAccuracy:.8,seedStart,calibrationSeedRange:[20261031,20264030],target:{strategy:'explorer',metric:'reachFinal',range:[.35,.4]},finalBossRequired:true,trialsPerStrategy:trials,assumptions:['All policies use scripted equipment, shop and potion decisions; these are automated players, not human playtest results.','The fighter policy favors basic attacks; explorer, random and boss policies can use equipped damage and healing spells.','Door policies use only visible room clues; they cannot inspect hidden battle rolls, shop inventory or chest outcomes.','Quiz accuracy is an input probability, not a measured human success rate.','Every strategy that reaches the final floor is also tested against the final boss using its own arrival loadout; this probe does not grant items or change the route outcome.','Floor maps use a shared per-floor seed across strategies; decisions and combat use separate seeded streams.'],rows,sensitivity,examples}
  const reference=rows.find(row=>row.strategy==='explorer')!
  if(trials>=5000){expect(reference.reachFinal).toBeGreaterThanOrEqual(.35);expect(reference.reachFinal).toBeLessThanOrEqual(.4)}
  for(const row of rows)expect(row.finalBossProbe.attempts).toBe(row.arrivalsFinal)
  writeFileSync('artifacts/exploration-campaign-balance.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({rows,sensitivity},null,2))
 }
},120000)
