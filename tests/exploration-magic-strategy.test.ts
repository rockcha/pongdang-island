// @vitest-environment node
import {it,expect} from 'vitest'
import {writeFileSync,mkdirSync,readFileSync,readdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {magicPlan,magicPurchaseValue,type MagicStrategy} from '../scripts/exploration/magic-audit'
import {runServerAudit} from '../scripts/exploration/server-audit'
import {basePolicy,type AuditPolicy} from '../scripts/exploration/blind-audit'
import {seededRandom,wilsonInterval} from '../scripts/exploration/simulation'
import {newExplorationModel,applyExplorationAction,type ExplorationModel} from '../src/features/exploration/server-engine'
import {newPractice,playerMaxHp,playerManaMax,type PracticeState} from '../src/features/exploration/practice-state'
import {startMonsterCombat} from '../src/features/exploration/combat-state'
import {shamanSpells} from '../src/features/exploration/shaman-stock'
import {explorationWeapons} from '../src/features/exploration/weapon-catalog'
import {explorationArmor} from '../src/features/exploration/armor-catalog'
import {getMonster,type MonsterId} from '../src/features/exploration/monster-catalog'

const spells=(ids:string[])=>ids.map(id=>{const s=shamanSpells.find(s=>s.id===id)!;if(!s)throw Error('Unknown spell '+id);return {...s,message:s.description}})
function fixture(ids:string[]):PracticeState{return startMonsterCombat({...newPractice(),spells:spells(ids),equippedSpells:ids.slice(0,2)},'black-sun-aker')}
it('values new utility spell roles and plans from visible state without consuming random numbers',()=>{
 for(const id of ['solar-brand','soul-knot','silent-seal','lapis-veil','sandstone-skin','crystal-petals','sun-kings-majesty'])expect(magicPurchaseValue(id,'adaptive').value).toBeGreaterThan(0)
 const s=fixture(['sun-kings-majesty','phoenix-breath']),before=JSON.stringify(s)
 const first=magicPlan(s),second=magicPlan(s)
 expect(first).toEqual(second);expect(JSON.stringify(s)).toBe(before)
})
it('uses recovery when wounded, preserves resources while frozen, and exploits a shield breaker only when useful',()=>{
 let s=fixture(['phoenix-breath']);s.hp=20
 expect(magicPlan(s).action).toEqual({type:'magic',id:'phoenix-breath'})
 s.playerEffects=[{kind:'freeze',amount:1,turns:1}]
 expect(magicPlan(s).action).toEqual({type:'attack'})
 s=fixture([]);s.weapons=explorationWeapons.filter(w=>['royal-noon-greatsword','cracked-wall-hammer'].includes(w.id));s.weaponId='royal-noon-greatsword';s.combat!.pattern={shieldHp:50}
 expect(magicPlan(s).weaponId).toBe('cracked-wall-hammer')
 s.combat!.pattern={shieldHp:0};expect(magicPlan(s).weaponId).toBe('royal-noon-greatsword')
})

const kits=[
 {id:'starter-control',weapon:'frost-tip-spear',armor:'bronze-scale-armor',spells:['sand','light']},
 {id:'starter-buff',weapon:'serrated-bronze-sword',armor:'desert-traveler-coat',spells:['silver-crescent','sand-swallow-feather']},
 {id:'mid-burst',weapon:'desert-steel-longsword',armor:'tomb-guardian-armor',spells:['solar-brand','solar-lance']},
 {id:'mid-barrier',weapon:'inscription-mage-staff',armor:'starwell-priest-robe',spells:['crystal-petals','oasis-breath']},
 {id:'mid-skin',weapon:'lapis-shield-breaker',armor:'sandstone-plate-armor',spells:['sandstone-skin','light']},
 {id:'mid-veil',weapon:'inscription-mage-staff',armor:'oasis-ritual-robe',spells:['lapis-veil','oasis-breath']},
 {id:'late-buff-heal',weapon:'royal-noon-greatsword',armor:'golden-scales-aegis',spells:['sun-kings-majesty','phoenix-breath']},
 {id:'late-freeze',weapon:'eternal-winter-kingspear',armor:'golden-scales-aegis',spells:['stellar-tomb-seal','glacial-crown']},
 {id:'late-lifesteal',weapon:'osiris-lifereaper',armor:'golden-scales-aegis',spells:['eclipse-serpent','black-sandstorm']},
 {id:'late-crit-burst',weapon:'blackmoon-rapier',armor:'golden-scales-aegis',spells:['judgment-of-ra','solar-brand']},
 {id:'late-seal',weapon:'golden-scales-longsword',armor:'golden-scales-aegis',spells:['silent-seal','phoenix-breath']},
 {id:'late-soul',weapon:'golden-scales-longsword',armor:'golden-scales-aegis',spells:['soul-knot','phoenix-breath']},
 {id:'late-flex',weapon:'royal-noon-greatsword',backups:['eternal-winter-kingspear','osiris-lifereaper','cracked-wall-hammer','blackmoon-rapier'],armor:'golden-scales-aegis',spells:['sun-kings-majesty','phoenix-breath','stellar-tomb-seal','glacial-crown','eclipse-serpent','judgment-of-ra','solar-brand','silent-seal','soul-knot']},
 {id:'late-flex-no-breaker',weapon:'royal-noon-greatsword',backups:['eternal-winter-kingspear','osiris-lifereaper','blackmoon-rapier'],armor:'golden-scales-aegis',spells:['sun-kings-majesty','phoenix-breath','stellar-tomb-seal','glacial-crown','eclipse-serpent','judgment-of-ra','solar-brand','silent-seal','soul-knot']},
 {id:'late-flex-fixed-weapon',weapon:'royal-noon-greatsword',armor:'golden-scales-aegis',spells:['sun-kings-majesty','phoenix-breath','stellar-tomb-seal','glacial-crown','eclipse-serpent','judgment-of-ra','solar-brand','silent-seal','soul-knot']},
]
const targets:[MonsterId,number][]=[['obsidian-anubis',20],['golden-pharaoh',50],['golden-scales-maaken',65],['black-sun-aker',80],['hourglass-sentinel',25],['sandstone-shield-guard',20],['black-sand-devourer',60]]
it('compares diverse fixed loadouts and normal-resource campaigns using authoritative actions',()=>{
 if(process.env.EXPLORATION_MAGIC_AUDIT!=='1')return
 const n=Number(process.env.MAGIC_DUEL_RUNS??60),campaignN=Number(process.env.MAGIC_CAMPAIGN_RUNS??150)
 const rows=[]
 for(const kit of kits)for(const [id,floor] of targets)for(const mode of ['none','adaptive',...(['mid-burst','mid-skin','mid-veil','late-seal','late-soul','late-buff-heal','late-crit-burst'].includes(kit.id)&&floor>=50?['opener']:[])]){
  if(['late-flex-no-breaker','late-flex-fixed-weapon'].includes(kit.id)&&id!=='black-sun-aker')continue
  const magic=mode!=='none'
  const weapon=explorationWeapons.find(w=>w.id===kit.weapon)!,armor=explorationArmor.find(a=>a.id===kit.armor)!
  expect(weapon).toBeTruthy();expect(armor).toBeTruthy()
  let wins=0,turns=0,health=0,mana=0,winHp=0;const used:Record<string,number>={},weaponUsed:Record<string,number>={}
  for(let i=0;i<n;i++){
   const random=seededRandom(202611020+i),initial=newExplorationModel(random)
   const weapons=[weapon,...('backups' in kit?kit.backups??[]:[]).map(id=>explorationWeapons.find(w=>w.id===id)!)]
   let state={...initial.state,weapons,weaponId:weapon.id,armor:[armor],armorId:armor.id,spells:magic?spells(kit.spells):[],equippedSpells:magic?kit.spells.slice(0,2):[],potions:{health:3,mana:2},market:{...initial.state.market,floor}}
   state={...state,hp:playerMaxHp(state),mp:playerManaMax(state)}
   let model:ExplorationModel={...initial,state:startMonsterCombat(state,id,{random}),view:'combat'}
   for(let turn=0;turn<120&&model.state.combat?.status==='active';turn++){
    const plan=magicPlan(model.state,'adaptive')
    if(plan.weaponId!==model.state.weaponId)model=applyExplorationAction(model,{type:'equip',kind:'weapon',id:plan.weaponId},0,random)
    const action=mode==='opener'&&turn===0?{type:'magic' as const,id:kit.id==='late-crit-burst'?'solar-brand':kit.spells[0]}:plan.action
    if(action.type==='magic'&&!model.state.equippedSpells.includes(action.id)){
     if(model.state.equippedSpells.length===2)model=applyExplorationAction(model,{type:'spell',id:model.state.equippedSpells[1]},0,random)
     model=applyExplorationAction(model,{type:'spell',id:action.id},0,random)
    }
    model=applyExplorationAction(model,{type:'combat',action},0,random);turns++
    expect(model.state.equippedSpells.length).toBeLessThanOrEqual(2)
    expect(model.state.mp).toBeGreaterThanOrEqual(0)
    for(const e of model.result?.events??[])if(e.kind==='player'&&e.spellId)used[e.spellId]=(used[e.spellId]??0)+1
    for(const e of model.result?.events??[])if(e.kind==='player'&&e.weaponId)weaponUsed[e.weaponId]=(weaponUsed[e.weaponId]??0)+1
    if(action.type==='potion'){if(action.kind==='health')health++;else mana++}
   }
   expect(model.state.combat?.status).not.toBe('active')
   if(model.state.combat?.status==='won'){wins++;winHp+=model.state.hp}
  }
  rows.push({kit:kit.id,weapon:weapon.id,backups:'backups' in kit?kit.backups:[],armor:armor.id,spells:magic?kit.spells:[],magic,mode,monster:id,floor,n,wins,winRate:wins/n,ci:wilsonInterval(wins,n),turns:turns/n,health:health/n,mana:mana/n,winHp:wins?winHp/wins:0,used,weaponUsed})
 }
 const policies:AuditPolicy[]=[
  {...basePolicy,id:'previous-prepared',healthTarget:8,manaTarget:2,healThreshold:.6,shopPriority:'gear',frugalMagic:true,combat:'tactical',emergencyFlee:true},
  ...(['burst','control','defense','adaptive'] as MagicStrategy[]).map(strategy=>({...basePolicy,id:strategy,magicStrategy:strategy,healthTarget:8,manaTarget:2,healThreshold:.6,shopPriority:'gear' as const,frugalMagic:true,combat:'tactical' as const,emergencyFlee:true})),
 ]
 const campaigns=policies.map(policy=>{
  const runs=Array.from({length:campaignN},(_,i)=>runServerAudit(202611030+i,policy))
  const merge=(key:'spells'|'weapons')=>{const out:Record<string,number>={};for(const run of runs)for(const [id,value]of Object.entries(run.usage[key]))out[id]=(out[id]??0)+value;return out}
  const bosses=[20,30,40,50,65,80].map(floor=>{const entries=runs.flatMap(r=>r.bosses[floor]?[r.bosses[floor]]:[]);return {floor,entries:entries.length,wins:entries.filter(e=>e.won).length}})
  return {policy:policy.id,n:campaignN,clears:runs.filter(r=>r.clear).length,bosses,spells:merge('spells'),weapons:merge('weapons')}
 })
 const sources=[...readdirSync('src/features/exploration').filter(f=>f.endsWith('.ts')).map(f=>'src/features/exploration/'+f),'scripts/exploration/magic-audit.ts','scripts/exploration/server-audit.ts','scripts/exploration/blind-audit.ts','scripts/exploration/simulation.ts','tests/exploration-magic-strategy.test.ts']
 const hash=createHash('sha256').update(sources.map(p=>p+'\n'+readFileSync(p,'utf8')).join('\n')).digest('hex')
 mkdirSync('artifacts/exploration-magic',{recursive:true})
 writeFileSync('artifacts/exploration-magic/review.json',JSON.stringify({generatedAt:new Date().toISOString(),engine:'applyExplorationAction',sourceHash:hash,sources,scope:{duels:'Explicitly granted fixed gear/spell pairs, full HP/MP, HP potions 3 and mana potions 2. Same seeds with and without spells. Not a campaign.',campaigns:'Normal starting resources, bought/found inventory only, blind doors, current free gear/spell changes. All policies target the same eight HP and two mana potions; buying utility spells still competes with equipment and supplies.',limits:'Heuristic decisions, no future RNG/stock/door peeking; this is not an optimal player or observed human clear rate.'},duels:rows,campaigns},null,2))
 console.log(JSON.stringify(campaigns.map(({policy,n,clears,bosses})=>({policy,n,clears,bosses}))))
},600000)
