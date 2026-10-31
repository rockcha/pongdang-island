// @vitest-environment node
import {it,expect} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {basePolicy,makeTotals,runBlindAudit,summarizeAudit,type AuditPolicy} from '../scripts/exploration/blind-audit'
const enabled=process.env.EXPLORATION_DEEP_AUDIT==='1'
it.skipIf(!enabled)('checks resource-aware purchase and emergency-retreat combinations without door knowledge',()=>{
 const n=50000,rows=[]
 const policies:AuditPolicy[]=[
  {...basePolicy,id:'sustain',label:'장비 우선 + 체력 포션 8 + 마법 절약',healthTarget:8,shopPriority:'gear',frugalMagic:true},
  {...basePolicy,id:'sustainTactical',label:'비축·장비 우선 + 전술형',healthTarget:8,shopPriority:'gear',frugalMagic:true,combat:'tactical'},
  {...basePolicy,id:'retreat',label:'균형형 + 위급 시 도망',emergencyFlee:true},
  {...basePolicy,id:'sustainRetreat',label:'비축·장비 우선 + 위급 시 도망',healthTarget:8,shopPriority:'gear',frugalMagic:true,combat:'tactical',emergencyFlee:true},
 ]
 for(const policy of policies){
  const totals=makeTotals(),runs=Array.from({length:n},(_,i)=>runBlindAudit(202610310+i,policy,totals)),row=summarizeAudit(runs,totals,policy)
  rows.push(row);mkdirSync('artifacts/exploration-deep-audit',{recursive:true});writeFileSync('artifacts/exploration-deep-audit/prudent.json',JSON.stringify(rows,null,2));console.log(policy.id,row.arrivalRate,row.clearRate)
 }
 expect(rows).toHaveLength(4)
},900000)
