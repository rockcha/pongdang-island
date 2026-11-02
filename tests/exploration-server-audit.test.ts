// @vitest-environment node
import {it,expect} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {basePolicy,baselinePolicies} from '../scripts/exploration/blind-audit'
import {runServerAudit} from '../scripts/exploration/server-audit'
import {wilsonInterval} from '../scripts/exploration/simulation'
import {createHash} from 'node:crypto'
import {readFileSync,readdirSync} from 'node:fs'
it('simulates blind decisions through authoritative server actions, including required rooms and loot',()=>{
 const auditing=process.env.EXPLORATION_SERVER_AUDIT==='1',n=auditing?Number(process.env.SERVER_AUDIT_RUNS??3000):8,rows=[]
 const variants=process.env.SERVER_AUDIT_VARIANTS==='1'
 const policies=variants?[
  {...basePolicy,id:'stocked',label:'장비 우선·체력 8개 비축',healthTarget:8,manaTarget:2,shopPriority:'gear' as const,frugalMagic:true},
  {...basePolicy,id:'stockedRetreat',label:'비축·장비 우선·위급 시 도망',healthTarget:8,manaTarget:2,shopPriority:'gear' as const,frugalMagic:true,combat:'tactical' as const,emergencyFlee:true},
  {...basePolicy,id:'earlyHeal',label:'체력 60%부터 회복·5개 비축',healThreshold:.6,healthTarget:5,shopPriority:'gear' as const,frugalMagic:true},
  {...basePolicy,id:'noForbidden',label:'체력 소모 마법 거래 거절',denyContract:'forbidden-trade' as const},
  {...basePolicy,id:'perfectQuiz',label:'스핑크스 정답률 100%',quizAccuracy:1},
 ]:baselinePolicies
 for(const policy of policies){
  const runs=Array.from({length:n},(_,i)=>runServerAudit(202611020+i,policy)),clears=runs.filter(r=>r.clear),arrivals=runs.filter(r=>r.reached===50),deaths:Record<string,number>={}
  for(const r of runs){expect(r.reached).toBeLessThanOrEqual(50);expect(r.hp).toBeGreaterThanOrEqual(0);if(r.clear)expect(r.boss).toBeTruthy();if(r.deathMonster)deaths[r.deathMonster]=(deaths[r.deathMonster]??0)+1}
  const mean=(fn:(r:typeof runs[number])=>number,items=runs)=>items.reduce((s,r)=>s+fn(r),0)/(items.length||1)
  rows.push({policy:policy.id,label:policy.label,n,clearRate:clears.length/n,ci95:wilsonInterval(clears.length,n),reach:Object.fromEntries([5,10,20,30,40,50].map(f=>[f,runs.filter(r=>r.reached>=f).length/n])),bossWinRate:clears.length/(arrivals.length||1),meanTurns:mean(r=>r.turns),clearTurns:mean(r=>r.turns,clears),clearGold:mean(r=>r.gold,clears),meanSpent:mean(r=>r.spent),deaths,checkpoints:Object.fromEntries([10,20,30,40,50].map(f=>{const visits=runs.filter(r=>r.checkpoints[f]);return [f,{n:visits.length,hp:mean(r=>r.checkpoints[f].hp,visits),gold:mean(r=>r.checkpoints[f].gold,visits)}]}))})
  if(auditing){
   const sources=[...readdirSync('src/features/exploration').filter(x=>x.endsWith('.ts')).map(x=>'src/features/exploration/'+x),'scripts/exploration/server-audit.ts','scripts/exploration/blind-audit.ts','scripts/exploration/simulation.ts', 'tests/exploration-server-audit.test.ts']
   const sourceHash=createHash('sha256').update(sources.map(p=>p+'\n'+readFileSync(p,'utf8')).join('\n')).digest('hex')
   mkdirSync('artifacts/exploration-current',{recursive:true});writeFileSync(`artifacts/exploration-current/server-${variants?'variants':'campaigns'}.json`,JSON.stringify({generatedAt:new Date().toISOString(),seedStart:202611020,n,engine:'applyExplorationAction',doorInformation:'none',sources,sourceHash,rows},null,2));console.log(policy.id,rows.at(-1)!.clearRate)
  }
 }
 expect(runServerAudit(12345,basePolicy)).toEqual(runServerAudit(12345,basePolicy))
},600000)
