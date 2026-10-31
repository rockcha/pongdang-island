// @vitest-environment node
import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs'
import {it,expect} from 'vitest'
import {baselinePolicies,basePolicy,makeTotals,runBlindAudit,summarizeAudit,duelAudit,type AuditPolicy,type AuditRun} from '../scripts/exploration/blind-audit'
import {armorValue} from '../scripts/exploration/simulation'
import {explorationWeapons} from '@/features/exploration/weapon-catalog'
import {explorationArmor} from '@/features/exploration/armor-catalog'
import {starterWeapon,starterArmor} from '@/features/exploration/practice-state'
import {explorationMonsters} from '@/features/exploration/monster-catalog'

const enabled=process.env.EXPLORATION_DEEP_AUDIT==='1',folder='artifacts/exploration-deep-audit',seedStart=202610310
const n=Number(process.env.DEEP_AUDIT_RUNS??12000),small=Number(process.env.DEEP_AUDIT_SENSITIVITY??3000),duels=Number(process.env.DEEP_AUDIT_DUELS??500)
const csv=(runs:AuditRun[],id:string)=>'policy,seed,clear,reached,deathFloor,deathMonster,hp,gold,battles,healthUsed,manaUsed,revivals,bossWeapon,bossArmor,bossHp,bossTurns\n'+runs.map(r=>[id,r.seed,Number(r.clear),r.reached,r.deathFloor??'',r.deathMonster??'',r.hp,r.gold,r.metrics.battles??0,(r.metrics.healthUsedCombat??0)+(r.metrics.healthUsedOutside??0),r.metrics.manaUsedCombat??0,r.metrics.revivals??0,r.bossEntry?.weapon??'',r.bossEntry?.armor??'',r.bossEntry?.hp??'',r.bossEntry?.turns??''].join(',')).join('\n')
const save=(name:string,data:unknown)=>{mkdirSync(folder,{recursive:true});writeFileSync(folder+'/'+name,JSON.stringify(data,null,2)+'\n')}
const medianArmor=(tier:string)=>{const items=explorationArmor.filter(a=>a.tier===tier).sort((a,b)=>armorValue(a)-armorValue(b));return items[Math.floor(items.length/2)]}
it.skipIf(!enabled)('samples many complete blind campaigns and resource statistics',()=>{
 const rows=[]
 for(const policy of baselinePolicies){
  const totals=makeTotals(),runs:AuditRun[]=[]
  for(let i=0;i<n;i++)runs.push(runBlindAudit(seedStart+i,policy,totals))
  const row=summarizeAudit(runs,totals,policy);rows.push(row);save('campaigns.json',rows)
  writeFileSync(folder+'/'+policy.id+'-runs.csv',csv(runs,policy.id))
  save(policy.id+'-examples.json',Object.values(row.examples).filter((s):s is number=>s!==undefined).map(seed=>runBlindAudit(seed,policy,makeTotals(),true)))
  console.log('CAMPAIGN',policy.id,n,JSON.stringify({arrival:row.arrivalRate,clear:row.clearRate,battles:row.meanBattles}))
 }
 expect(rows).toHaveLength(baselinePolicies.length)
},1800000)
it.skipIf(!enabled)('measures paired policy sensitivity without changing game statistics',()=>{
 const variations:Partial<AuditPolicy>[]=[
  {id:'health0',label:'체력 포션 구매 목표 0',healthTarget:0},
  {id:'health5',label:'체력 포션 구매 목표 5',healthTarget:5},
  {id:'health8',label:'체력 포션 구매 목표 8',healthTarget:8},
  {id:'heal25',label:'체력 25% 아래에서 전투 포션',healThreshold:.25},
  {id:'heal60',label:'체력 60% 아래에서 전투 포션',healThreshold:.6},
  {id:'mana3',label:'마나 포션 구매 목표 3',manaTarget:3},
  {id:'quiz50',label:'스핑크스 정답률 50%',quizAccuracy:.5},
  {id:'quiz100',label:'스핑크스 정답률 100%',quizAccuracy:1},
  {id:'noContracts',label:'모든 계약 거절',contracts:false},
  {id:'noSpells',label:'마법 미구매·미사용',spells:false},
  {id:'noShops',label:'상인 구매 없음',shops:false},
  {id:'noStory',label:'이야기 보상 미수령',story:false},
  {id:'noLantern',label:'영혼의 등불 거절',denyContract:'soul-lantern'},
  {id:'noForbidden',label:'금단의 거래 거절',denyContract:'forbidden-trade'},
  {id:'forceForbidden',label:'가능하면 금단의 거래',forceContract:'forbidden-trade'},
  {id:'noGem',label:'보석눈 거절',denyContract:'cursed-gem-eye'},
  {id:'forceGem',label:'가능하면 보석눈 획득',forceContract:'cursed-gem-eye'},
  {id:'teleport',label:'체력 낮을 때 순간이동',teleport:true},
 ]
 const reference=Array.from({length:small},(_,i)=>runBlindAudit(seedStart+i,basePolicy)),rows=[]
 for(const change of variations){
  const policy={...basePolicy,...change},totals=makeTotals(),runs=Array.from({length:small},(_,i)=>runBlindAudit(seedStart+i,policy,totals))
  let improved=0,worsened=0
  for(let i=0;i<small;i++){if(runs[i].clear&&!reference[i].clear)improved++;if(!runs[i].clear&&reference[i].clear)worsened++}
  const delta=(improved-worsened)/small,variance=((improved+worsened)/small-delta*delta)/small
  const row={...summarizeAudit(runs,totals,policy),paired:{referenceClears:reference.filter(r=>r.clear).length,improved,worsened,delta,ci95:[delta-1.96*Math.sqrt(variance),delta+1.96*Math.sqrt(variance)]}}
  rows.push(row);save('sensitivity.json',rows);writeFileSync(folder+'/'+policy.id+'-runs.csv',csv(runs,policy.id))
  console.log('SENSITIVITY',policy.id,JSON.stringify({clear:row.clearRate,delta:row.paired.delta}))
 }
 expect(rows).toHaveLength(variations.length)
},1800000)
it.skipIf(!enabled)('compares every weapon in controlled encounters with and without potion kits',()=>{
 const rows=[]
 for(const weapon of [starterWeapon,...explorationWeapons]){
  const tier='tier' in weapon?weapon.tier:'starter',armor=medianArmor(tier as string)
  const cases=tier==='starter'?[[5,'sand-scorpion'],[9,'lapis-cobra'],[10,'bandage-mummy']]:tier==='advanced'?[[20,'obsidian-anubis'],[25,'tomb-hook-guard'],[30,'obsidian-anubis']]:[[40,'obsidian-anubis'],[45,'ancient-giant'],[50,'golden-pharaoh']]
  for(const [floor,id]of cases)for(const kit of [false,true])rows.push(duelAudit(weapon,armor,id as typeof explorationMonsters[number]['id'],floor as number,duels,kit))
  save('weapons.json',rows)
  console.log('WEAPON',weapon.id)
 }
 expect(rows.length).toBe((explorationWeapons.length+1)*6)
},1800000)
it.skipIf(!enabled)('profiles monster threats at representative depths with a fixed tier loadout',()=>{
 const rows=[]
 for(const floor of [1,11,21,31,41]){
  const tier=floor<=11?'starter':floor<=31?'advanced':'ultimate',pool=explorationWeapons.filter(w=>w.tier===tier).sort((a,b)=>a.attack*(1+a.critical/100)-b.attack*(1+b.critical/100)),weapon=floor===1?starterWeapon:pool[Math.floor(pool.length/2)],armor=floor===1?starterArmor:medianArmor(tier)
  const monsters=explorationMonsters.filter(m=>m.tier!=='boss')
  for(const monster of monsters)rows.push(duelAudit(weapon,armor,monster.id,floor,duels,false))
 }
 for(const floor of [20,30,40,50]){const tier=floor<=30?'advanced':'ultimate',weapon=explorationWeapons.filter(w=>w.tier===tier).sort((a,b)=>a.attack-b.attack)[Math.floor(explorationWeapons.filter(w=>w.tier===tier).length/2)];rows.push(duelAudit(weapon,medianArmor(tier),floor===50?'golden-pharaoh':'obsidian-anubis',floor,duels,true))}
 save('monsters.json',rows)
 const sources=[...readdirSync('src/features/exploration').filter(x=>/\.(tsx?|css)$/.test(x)).map(x=>'src/features/exploration/'+x),'scripts/exploration/blind-audit.ts','tests/exploration-deep-audit.test.ts']
 save('metadata.json',{generatedAt:new Date().toISOString(),seedStart,campaignRunsPerPolicy:n,sensitivityRunsPerPolicy:small,trialsPerDuel:duels,sourceHash:createHash('sha256').update(sources.map(path=>path+'\n'+readFileSync(path,'utf8')).join('\n')).digest('hex'),sources,initial:{gold:0,hp:100,mp:40,healthPotions:0,manaPotions:0},doorInformation:'none; index is a pure function of seed and floor',finalBossRequired:true,assumptions:['Automated policies, not human win-rate estimates.','All campaign policies use the same unseen door index at the same seed and floor.','Quiz success is an assumed 80% except explicit sensitivity variants; real 10-second reaction times are not modeled.','Balanced shopping buys potion reserves before gear; equipment is scored by a documented heuristic.','Tactical policy can swap known magic for free at action selection, matching current UI permission.','Optional rooms are decided only after entering; no future shops, loot or enemy random rolls are inspected.','Story shortcuts and optional guardian fights use shared live rules; late story recovery permits the same reward when earlier rooms were missed.','Weapon/monster duels are controlled artificial loadouts and are not whole-campaign clear rates.','Paired deltas use equal initial seeds; action-dependent random consumption can diverge after a policy change.']})
 expect(rows.length).toBeGreaterThan(40)
},1800000)
