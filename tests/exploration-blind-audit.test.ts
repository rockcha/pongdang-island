// @vitest-environment node
import {expect,it} from 'vitest'
import {blindDoorIndex,basePolicy,baselinePolicies,makeTotals,runBlindAudit,summarizeAudit} from '../scripts/exploration/blind-audit'
it('selects doors using only seed and floor, with no room-type input',()=>{
 const counts=[0,0,0]
 for(let seed=1;seed<=6000;seed++)counts[blindDoorIndex(seed,22)]++
 expect(counts.every(n=>n>1800&&n<2200)).toBe(true)
 expect(blindDoorIndex(77,22)).toBe(blindDoorIndex(77,22))
})
it('runs blind policies against the live campaign and reports reproducible valid outcomes',()=>{
 for(const policy of baselinePolicies){
  const totals=makeTotals(),runs=Array.from({length:8},(_,i)=>runBlindAudit(20261031+i,policy,totals))
  for(const run of runs){expect(run.reached).toBeLessThanOrEqual(50);expect(run.hp).toBeGreaterThanOrEqual(0);if(run.clear)expect(run.bossEntry?.win).toBe(true)}
  expect(summarizeAudit(runs,totals,policy).n).toBe(8)
 }
 expect(runBlindAudit(111,basePolicy)).toEqual(runBlindAudit(111,basePolicy))
})
it('requires the simulated story-ignoring policy to fight every encountered royal warden',()=>{
 const totals=makeTotals(),policy={...basePolicy,story:false}
 for(let index=0;index<256;index++)runBlindAudit(202610310+index,policy,totals)
 const encounters=totals.rooms['nameless-guardian']??0
 expect(encounters).toBeGreaterThan(0)
 expect(totals.monsters['31:nameless-royal-warden']?.n).toBe(encounters)
})
