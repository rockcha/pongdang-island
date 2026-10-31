// @vitest-environment node
import {it,expect} from 'vitest'
import {writeFileSync} from 'node:fs'
import {practiceEnemyGrowth} from '@/features/exploration/campaign-balance'
import {campaignEventWeights,practiceFinalFloor} from '@/features/exploration/campaign'
import {simulateCampaign,summarizeRuns} from '../scripts/exploration/simulation'
it.skipIf(process.env.EXPLORATION_TUNING!=='1')('calibrates fifty-floor difficulty without changing policy or combat rules',()=>{
 const originalGrowth={...practiceEnemyGrowth},rows=[]
 const trials=Number(process.env.EXPLORATION_TUNING_RUNS??3000)
 try{
  for(const hp of [.3,.33,.35,.37,.4]){
   Object.assign(practiceEnemyGrowth,{normalHpPerBand:hp,normalAttackPerBand:2,intermediateHpPerBand:hp,intermediateAttackPerBand:2,magicPerBand:1})
   const summary=summarizeRuns(Array.from({length:trials},(_,index)=>simulateCampaign(20261031+index,'explorer',.8,false,true)))
   rows.push({growth:{...practiceEnemyGrowth},...summary})
  }
 }finally{Object.assign(practiceEnemyGrowth,originalGrowth)}
 writeFileSync('artifacts/exploration-difficulty-calibration.json',JSON.stringify({seedStart:20261031,trialsPerCandidate:trials,finalFloor:practiceFinalFloor,weights:campaignEventWeights,policy:'unchanged explorer, quiz accuracy .8, zero initial potions, final boss required',rows},null,2)+'\n')
 expect(rows).toHaveLength(5)
},120000)
