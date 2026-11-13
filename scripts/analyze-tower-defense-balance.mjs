import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import * as engine from '../src/features/arcade/tower-defense-engine.ts'
import {campaignStrategy} from './tower-defense-mixed-strategy.ts'
const output=process.argv[2]??'artifacts/tower-defense/balance.json'
const campaign=process.argv.includes('--campaign')
const sources=['src/features/arcade/tower-defense-engine.ts','src/features/arcade/tower-defense-towers.ts','src/features/arcade/tower-defense-flight.ts','src/features/arcade/tower-defense-waves.ts','scripts/tower-defense-mixed-strategy.ts'].map(file=>({file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}))
const {BUILDINGS,TOWER_KINDS,createDefense,beginDefense,build,upgrade,specialize,startWave,spawnEnemy,stepDefense,cellAt,SITES,damageOf,intervalOf}=engine
const scenarios={groundSingle:['armored'],groundPack:Array(5).fill('armored'),airSingle:['flyingFish'],airPack:Array(4).fill('flyingFish'),mixedPack:['armored','flyingFish','armored','flyingFish']}
function measure(kind,level,specialization,types){
 const s=createDefense(42);beginDefense(s);s.gold=100000
 const cell=cellAt(6,8);if(!build(s,cell,kind))throw Error('Build failed')
 for(let i=0;i<level;i++)if(!upgrade(s,cell))throw Error('Upgrade failed')
 s.wave=30
 if(specialization&&!specialize(s,cell,specialization))throw Error('Specialization failed '+kind+' '+specialization)
 const b=s.buildings[0],spent=b.spent
 startWave(s);s.spawned=s.plan.length
 types.forEach((type,index)=>{
  spawnEnemy(s,type,cellAt(6,7));const e=s.enemies.at(-1)
  Object.assign(e,{x:SITES[cell].x,y:SITES[cell].y-24-index*2,px:SITES[cell].x,py:SITES[cell].y-24-index*2,speed:0,hp:10000000,maxHp:10000000,shield:0,shieldMax:0,reward:0})
 })
 for(let tick=0;tick<400;tick++)stepDefense(s,.05)
 const before=s.enemies.reduce((a,e)=>a+e.hp,0)
 for(let tick=0;tick<2400;tick++)stepDefense(s,.05)
 const dps=(before-s.enemies.reduce((a,e)=>a+e.hp,0))/120
 return {spent,dps:Number(dps.toFixed(3)),dpsPer100Gold:Number((dps/spent*100).toFixed(3)),damage:damageOf(b),interval:intervalOf(b),range:BUILDINGS[kind].range[level],slow:b.specialization==='power'&&kind==='frost'?.6:1-BUILDINGS[kind].slow[level]}
}
const rows=[]
for(const kind of TOWER_KINDS){
 const choices=engine.specializationOptions?.(kind)??['power','rapid']
 const variants=[...[0,1,2,3].map(level=>({level,specialization:null})),...choices.map(specialization=>({level:3,specialization}))]
 for(const variant of variants){
  const results={}
  for(const [name,types]of Object.entries(scenarios))results[name]=measure(kind,variant.level,variant.specialization,types)
  rows.push({kind,name:BUILDINGS[kind].name,...variant,nativeLayer:BUILDINGS[kind].targetLayer,attack:BUILDINGS[kind].attack,results})
 }
}
const records=campaign?[{expanded:false,hybridMix:false},{expanded:true,hybridMix:false},{expanded:false,hybridMix:true}].flatMap(({expanded,hybridMix})=>[1,7,42,91,731,2026].map(seed=>{
 const {state:s,checkpoints}=campaignStrategy(seed,51,expanded,hybridMix)
 return {seed,expanded,hybridMix,phase:s.phase,wave:s.wave,hp:s.lives,gold:s.gold,score:s.score,kills:s.kills,finalDefeated:s.finalDefeated,checkpoints}
})):[]
const report={generatedAt:new Date().toISOString(),scope:'Local fixed-step engine. Stationary aligned targets, 20s warmup then 120s measured damage; no target armor or movement. Campaign uses one deterministic paid build per mode, not optimal play or a player win rate.',sources,rows,campaign:records}
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({output,variants:rows.length,maxLevel:rows.filter(r=>r.level===3&&!r.specialization).map(r=>({name:r.name,cost:r.results.groundSingle.spent,single:r.nativeLayer==='air'?r.results.airSingle.dps:r.results.groundSingle.dps,pack:r.nativeLayer==='air'?r.results.airPack.dps:r.results.groundPack.dps})),campaign:records.map(({seed,expanded,hybridMix,phase,wave,hp})=>({seed,expanded,hybridMix,phase,wave,hp}))}))
