// @vitest-environment node
import {it,expect} from 'vitest'
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {basePolicy,makeTotals,runBlindAudit,summarizeAudit,duelAudit,type AuditPolicy} from '../scripts/exploration/blind-audit'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {explorationArmor} from '@/features/exploration/armor-catalog'
const enabled=process.env.EXPLORATION_REBALANCE_AUDIT==='1'
it.skipIf(!enabled)('rechecks blind progression and gear transitions against the revised live rules',()=>{
 const n=Number(process.env.REBALANCE_RUNS??20000),folder='artifacts/exploration-rebalance',rows=[]
 const policies:AuditPolicy[]=[basePolicy,{...basePolicy,id:'gearFirst',label:'장비 우선·마법 절약',shopPriority:'gear',frugalMagic:true},{...basePolicy,id:'sustainRetreat',label:'비축·장비 우선·위급 시 도망',healthTarget:8,shopPriority:'gear',frugalMagic:true,combat:'tactical',emergencyFlee:true},{...basePolicy,id:'cautious',label:'위험 회피형',combat:'flee',risk:'skip'}]
 mkdirSync(folder,{recursive:true})
 for(const policy of policies){const totals=makeTotals(),runs=Array.from({length:n},(_,i)=>runBlindAudit(202610310+i,policy,totals));rows.push(summarizeAudit(runs,totals,policy));writeFileSync(folder+'/campaigns.json',JSON.stringify(rows,null,2));console.log(policy.id,rows.at(-1)!.arrivalRate,rows.at(-1)!.clearRate)}
 const weapon=explorationWeapons.find(w=>w.id==='ruin-hunter-crossbow')!,armor=explorationArmor.find(a=>a.id==='sandstone-plate-armor')!,duels=[]
 for(const id of ['sand-scorpion','bandage-mummy','lapis-cobra','sand-wraith','tomb-lantern-jellyfish','ancient-giant','treasure-scarab'] as const)duels.push(duelAudit(weapon,armor,id,21,2000,false))
 for(const id of ['royal-noon-greatsword','golden-scales-longsword','set-hidden-fang','osiris-lifereaper'])for(const kit of [false,true])duels.push(duelAudit(explorationWeapons.find(w=>w.id===id)!,explorationArmor.find(a=>a.id==='golden-scales-aegis')!,'golden-pharaoh',50,2000,kit))
 writeFileSync(folder+'/duels.json',JSON.stringify(duels,null,2))
 const files=['campaign-balance.ts','weapon-catalog.ts','armor-catalog.ts','monster-catalog.ts','merchant-pity.ts','shop-state.ts','run-state.ts'].map(name=>'src/features/exploration/'+name)
 writeFileSync(folder+'/metadata.json',JSON.stringify({generatedAt:new Date().toISOString(),n,doorInformation:'none',files,hash:createHash('sha256').update(files.map(p=>readFileSync(p,'utf8')).join('\n')).digest('hex')},null,2))
 expect(rows).toHaveLength(policies.length)
},600000)
