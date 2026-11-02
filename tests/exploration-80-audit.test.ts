// @vitest-environment node
import {it,expect} from 'vitest'
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {runServerAudit} from '../scripts/exploration/server-audit'
import {basePolicy,type AuditPolicy} from '../scripts/exploration/blind-audit'
import {wilsonInterval} from '../scripts/exploration/simulation'
import {explorationWeapons} from '../src/features/exploration/weapon-catalog'

it('audits the full 80-floor campaign and separates boss arrival, conditional victory and equipment',()=>{
 const enabled=process.env.EXPLORATION_80_AUDIT==='1',n=enabled?Number(process.env.EXPLORATION_80_RUNS??10000):5
 const policies:AuditPolicy[]=[basePolicy,{...basePolicy,id:'gear',shopPriority:'gear',frugalMagic:true},{...basePolicy,id:'prepared',healthTarget:8,manaTarget:2,healThreshold:.6,shopPriority:'gear',frugalMagic:true,combat:'tactical',emergencyFlee:true}]
 const rows=[]
 for(const policy of policies){
  const runs=Array.from({length:n},(_,i)=>runServerAudit(202611030+i,policy))
  expect(runs.every(run=>run.reached<=80)).toBe(true)
  const count=(items:string[])=>Object.fromEntries([...new Set(items)].map(id=>[id,items.filter(value=>value===id).length]))
  const bosses=[20,30,40,50,65,80].map(floor=>{
   const entries=runs.flatMap(run=>run.bosses[floor]?[run.bosses[floor]]:[]),wins=entries.filter(entry=>entry.won)
   const mean=(key:'hpRatio'|'health'|'mana'|'turns')=>entries.reduce((sum,item)=>sum+item[key],0)/(entries.length||1)
   return {floor,entries:entries.length,wins:wins.length,reachRate:entries.length/n,winRate:entries.length?wins.length/entries.length:null,totalPassRate:wins.length/n,winCI:entries.length?wilsonInterval(wins.length,entries.length):null,meanHpRatio:mean('hpRatio'),meanHealthPotions:mean('health'),meanManaPotions:mean('mana'),meanTurns:mean('turns'),weapons:count(entries.map(entry=>entry.weapon)),tiers:count(entries.map(entry=>explorationWeapons.find(item=>item.id===entry.weapon)?.tier??'starter')),armor:count(entries.map(entry=>entry.armor))}
  })
  const clears=runs.filter(run=>run.clear).length
  rows.push({policy:policy.id,n,clears,clearRate:clears/n,clearCI:wilsonInterval(clears,n),bosses,deaths:count(runs.flatMap(run=>run.deathMonster?[run.deathMonster]:[]))})
  if(enabled)console.log(JSON.stringify({policy:policy.id,n,clears,bosses:bosses.map(({floor,entries,wins,winRate})=>({floor,entries,wins,winRate}))}))
 }
 if(enabled){
  const sources=[...readdirSync('src/features/exploration').filter(file=>file.endsWith('.ts')).map(file=>'src/features/exploration/'+file),'scripts/exploration/server-audit.ts','scripts/exploration/blind-audit.ts','tests/exploration-80-audit.test.ts']
  const sourceHash=createHash('sha256').update(sources.map(path=>path+'\n'+readFileSync(path,'utf8')).join('\n')).digest('hex')
  mkdirSync('artifacts/exploration-80',{recursive:true})
  const label=process.env.EXPLORATION_80_LABEL??'campaigns'
  if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid audit label')
  writeFileSync(`artifacts/exploration-80/${label}.json`,JSON.stringify({generatedAt:new Date().toISOString(),seedStart:202611030,engine:'applyExplorationAction',scope:'full campaign, normal starting resources, blind door selection, simulated policies; not actual players',sourceHash,sources,rows},null,2))
 }
},600000)
