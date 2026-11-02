// @vitest-environment node
import {it,expect} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {runServerAudit} from '../scripts/exploration/server-audit'
import {basePolicy} from '../scripts/exploration/blind-audit'
import {statEnemyGrowth} from '../src/features/exploration/campaign-balance'
import type {GrowthStat} from '../src/features/exploration/growth'

it.skipIf(process.env.LOCAL_GROWTH_AUDIT!=='1')('compares legacy and growth campaigns through the actual 80-floor action engine',()=>{
 const trials=Number(process.env.LOCAL_GROWTH_RUNS??300),seedStart=process.env.LOCAL_GROWTH_VALIDATE==='1'?202612030:202611030,original={...statEnemyGrowth}
 const policies=[{...basePolicy,id:'prepared',healthTarget:8,manaTarget:2,healThreshold:.6,shopPriority:'gear' as const,frugalMagic:true,combat:'tactical' as const,emergencyFlee:true}]
 const configs=process.env.LOCAL_GROWTH_VALIDATE==='1'?[original]:[
  {hpPerPoint:0,attackPerPoint:0,bossHpPerPoint:0,bossAttackPerPoint:0},
  {hpPerPoint:.005,attackPerPoint:0,bossHpPerPoint:.005,bossAttackPerPoint:0},
  {hpPerPoint:.01,attackPerPoint:0,bossHpPerPoint:.01,bossAttackPerPoint:0},
  {hpPerPoint:.01,attackPerPoint:.125,bossHpPerPoint:.01,bossAttackPerPoint:.125},
  {hpPerPoint:.02,attackPerPoint:0,bossHpPerPoint:.02,bossAttackPerPoint:0},
  {hpPerPoint:.02,attackPerPoint:.125,bossHpPerPoint:.02,bossAttackPerPoint:.125},
  {hpPerPoint:.03,attackPerPoint:0,bossHpPerPoint:.03,bossAttackPerPoint:0},
 ]
 const builds:Array<GrowthStat|'balanced'>=['health','mana','attack','magic','evasion','balanced']
 const rows=[]
 try{for(const policy of policies){
  const legacy=Array.from({length:trials},(_,i)=>runServerAudit(seedStart+i,policy))
  const summarize=(runs:typeof legacy)=>({clearRate:runs.filter(run=>run.clear).length/trials,reach50:runs.filter(run=>run.reached>=50).length/trials,reach80:runs.filter(run=>run.reached>=80).length/trials,meanFloor:runs.reduce((sum,run)=>sum+run.reached,0)/trials})
  const baseline=summarize(legacy)
  for(const config of configs){
   Object.assign(statEnemyGrowth,config)
   const results=builds.map(build=>{
    const runs=Array.from({length:trials},(_,i)=>runServerAudit(seedStart+i,policy,build))
    const diffs=runs.map((run,i)=>Number(run.clear)-Number(legacy[i].clear)),delta=diffs.reduce((sum,n)=>sum+n,0)/trials,se=Math.sqrt(diffs.reduce((sum,n)=>sum+(n-delta)**2,0)/(trials-1)/trials)
    return {build,...summarize(runs),delta,deltaCI95:[delta-1.96*se,delta+1.96*se]}
   })
   const row={policy:policy.id,config,baseline,results,meanClear:results.reduce((sum,r)=>sum+r.clearRate,0)/results.length,meanReach80:results.reduce((sum,r)=>sum+r.reach80,0)/results.length};rows.push(row)
   console.log(JSON.stringify(row))
  }
 }}finally{Object.assign(statEnemyGrowth,original)}
 mkdirSync('artifacts',{recursive:true})
 writeFileSync(process.env.LOCAL_GROWTH_VALIDATE==='1'?'artifacts/exploration-local-growth-validation.json':'artifacts/exploration-local-growth-calibration.json',JSON.stringify({generatedAt:new Date().toISOString(),seedStart,trials,engine:'applyExplorationAction',assumptions:['Scripted prepared policy, not human win rates.','Same starting seeds; later randomness may diverge.','Includes mana bolt at start, seven allocation milestones, normal shops/loot and all bosses.','Five pure builds plus balanced; Pre-growth baseline starts have no growth profile.'],rows},null,2)+'\n')
 expect(rows.length).toBeGreaterThan(0)
},600000)
