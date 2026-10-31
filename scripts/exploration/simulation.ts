import {beginForcedMerchant} from '../../src/features/exploration/shop-state'
import {finishForcedMerchant} from '../../src/features/exploration/merchant-pity'
﻿import {advanceExploration,needsFinalBoss,enterBossOasis} from '../../src/features/exploration/run-state'
import {newPractice,playerMaxHp,equipGear,usePotion,buyMerchantItem,floorMerchantGoods,type PracticeState,type Gear} from '../../src/features/exploration/practice-state'
import {createRoomVisit,enterRoomVisit,restFully,sphinxPenalty,getAdventureRoom} from '../../src/features/exploration/adventure-rooms'
import {receiveRoomLoot,refreshRoomLoot,sellRoomGear,type RoomLoot} from '../../src/features/exploration/room-loot'
import {getShopkeeper,shopkeeperForRoom} from '../../src/features/exploration/shopkeepers'
import {enterShopkeeper} from '../../src/features/exploration/shop-state'
import {shamanSpells,learnShamanSpell} from '../../src/features/exploration/shaman-stock'
import {resolveCombatTurn,startMonsterCombat,type CombatAction} from '../../src/features/exploration/combat-state'
import {getFloorMonster,type MonsterId} from '../../src/features/exploration/monster-catalog'
import {spellMechanics} from '../../src/features/exploration/spell-mechanics'
import {drawFloorMonster,practiceFinalFloor,practiceFinalBossId,practiceFinalBossRoom} from '../../src/features/exploration/campaign'
import type {RoomTypeId} from '../../src/features/exploration/room-preview'

export const strategies=['random','fighter','explorer','survivor','boss'] as const
export type Strategy=typeof strategies[number]
export const strategyLabels:Record<Strategy,string>={random:'무작위 문 선택',fighter:'일반 전투·기본 공격 우선',explorer:'탐색·성장 우선',survivor:'위험 회피 우선',boss:'탐색 후 보스 도전'}
export function seededRandom(seed:number){let value=seed|0;return()=>{value+=0x6d2b79f5;let t=value;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
export type RunResult={strategy:Strategy;seed:number;completed:boolean;reached:number;completedFloors:number;hp:number;gold:number;battles:number;wins:number;escapes:number;bossAttempts:number;bossWins:number;finalBossWin:boolean;deathMonster?:string;rooms:Record<string,number>;trace?:string[];finalBossProbe?:{won:boolean;startingHp:number;weaponId:string;armorId:string;spells:string[];healthPotions:number;manaPotions:number;turns:number}}
export function weaponValue(item:Gear){return (item.attack??0)*(1+(item.critical??0)/100)+(item.proc?2:0)+(item.lifesteal??0)*.06}
export function armorValue(item:Gear){return (item.reduction??0)*2+(item.magicReduction??0)*2+(item.maxHpBonus??0)*.12+(item.evasion??0)*.2}
function optimize(state:PracticeState){
 const weapon=[...state.weapons].sort((a,b)=>weaponValue(b)-weaponValue(a))[0],armor=[...state.armor].sort((a,b)=>armorValue(b)-armorValue(a))[0]
 let next=equipGear(equipGear(state,'weapon',weapon.id),'armor',armor.id)
 const score=(id:string)=>{const power=spellMechanics[id];return (power?.damage??0)+(power?.healing??0)*.8+(power?.stun?15:0)}
 const ordered=next.spells.map(item=>item.id).sort((a,b)=>score(b)-score(a)),heal=ordered.find(id=>spellMechanics[id]?.healing),attack=ordered.find(id=>spellMechanics[id]?.damage)
 next={...next,equippedSpells:heal&&attack?[attack,heal]:ordered.slice(0,2)}
 return next
}
function claim(state:PracticeState,planned:RoomLoot,random:()=>number){
 const loot=refreshRoomLoot(state,planned,random)
 const inventory=loot.kind==='weapon'?state.weapons:state.armor
 const score=loot.kind==='weapon'?weaponValue:armorValue
 const replace=loot.kind!=='potion'&&inventory.length>=3?[...inventory].sort((a,b)=>score(a)-score(b))[0].id:undefined
 const next=receiveRoomLoot(state,loot,replace)
 if(next===state)throw Error('Simulation could not claim loot')
 return optimize(next.combat?.loot?{...next,combat:{...next.combat,lootClaimed:true}}:next)
}
function shop(state:PracticeState,type:RoomTypeId,random:()=>number){
 const profile=shopkeeperForRoom(type)!
 let next=enterShopkeeper(state,profile,random)
 if(profile.kind==='equipment'){
  const candidates=floorMerchantGoods(next).filter(item=>item.kind==='weapon'||item.kind==='armor').sort((a,b)=>{
   const value=(item:typeof a)=>item.kind==='weapon'?weaponValue(item.gear!)-weaponValue(next.weapons.find(w=>w.id===next.weaponId)!):armorValue(item.gear!)-armorValue(next.armor.find(w=>w.id===next.armorId)!)
   return value(b)/(b.price||1)-value(a)/(a.price||1)
  })
  for(const item of candidates){
   const key=item.kind==='weapon'?'weapons':'armor',score=item.kind==='weapon'?weaponValue:armorValue
   const reserve=next.hp<playerMaxHp(next)*.45&&!next.potions.health?100:0
   if(score(item.gear!)<=Math.max(...next[key].map(score))||next.gold<item.price+reserve)continue
   if(next[key].length>=3)continue
   next=optimize(buyMerchantItem(next,item.id))
  }
  for(const kind of ['health','mana'] as const){const target=kind==='health'?2:next.spells.length?1:0;while(next.gold>=100&&next.potions[kind]<target)next=buyMerchantItem(next,kind==='health'?'health-potion':'mana-potion')}
 }else{
  for(const id of [...next.shamanStock!.spellIds].sort((a,b)=>{const power=(id:string)=>(spellMechanics[id]?.damage??0)+(spellMechanics[id]?.healing??0)+(spellMechanics[id]?.stun?10:0);return power(b)-power(a)})){
   const spell=shamanSpells.find(item=>item.id===id)!
   if(next.gold>=spell.learnPrice!&&(spellMechanics[id]?.damage||spellMechanics[id]?.healing||spellMechanics[id]?.stun))next=optimize(learnShamanSpell(next,id))
  }
 }
 return next
}
function roomScore(state:PracticeState,type:RoomTypeId,strategy:Strategy){
 const injured=state.hp/playerMaxHp(state)<.65,merchant=!!shopkeeperForRoom(type),rest=type.startsWith('rest-'),investigate=type.startsWith('investigate-')
 if(strategy==='survivor')return rest?100:merchant?90:type==='warning-wall'||type==='scales'?85:type==='sleeping-giant'?80:investigate||type==='chest'?75:type==='sphinx'?70:type==='thief'?65:type==='curse'?60:type==='monster'?20:10
 if(strategy==='boss'&&type.startsWith('boss-'))return 200
 if(strategy!=='survivor'&&type==='scales'&&state.weapons.length+state.armor.length>=4)return 105
 if(strategy==='fighter')return rest&&injured?110:merchant&&state.gold>=250?100:type==='monster'?90:investigate?70:type==='chest'?60:rest?50:type==='warning-wall'?40:0
 return rest&&injured?120:merchant&&(state.gold>=220||injured&&state.gold>=100)?110:investigate?95:type==='chest'?80:rest?75:type==='monster'?65:type==='sphinx'?(injured?40:70):type==='warning-wall'?50:type==='sleeping-giant'?40:type==='thief'?30:type==='guardian'?20:type==='curse'?10:0
}
function chooseAction(state:PracticeState,strategy:Strategy):CombatAction{
 const combat=state.combat!,monster=getFloorMonster(combat.monsterId,state.market.floor,true),weapon=state.weapons.find(item=>item.id===state.weaponId)!
 const basic=Math.max(1,(weapon.attack??1)-monster.defense),lethal=basic>=combat.enemyHp
 if(lethal)return {type:'attack'}
 const spells=state.spells.filter(item=>state.equippedSpells.includes(item.id)&&state.mp>=item.mana)
 const lethalSpell=spells.find(item=>(spellMechanics[item.id]?.damage??0)-monster.magicResistance>=combat.enemyHp)
 if(lethalSpell&&strategy!=='fighter')return {type:'magic',id:lethalSpell.id}
 if(state.hp<playerMaxHp(state)*.4&&state.potions.health)return {type:'potion',kind:'health'}
 if(strategy==='survivor'&&monster.tier!=='boss')return {type:'flee'}
 if(strategy!=='fighter'){
  const heal=spells.find(item=>spellMechanics[item.id]?.healing&&state.hp<playerMaxHp(state)*.55)
  if(heal)return {type:'magic',id:heal.id}
  const damage=spells.filter(item=>spellMechanics[item.id]?.damage).sort((a,b)=>(spellMechanics[b.id].damage??0)-(spellMechanics[a.id].damage??0))[0]
  if(damage&&(spellMechanics[damage.id].damage??0)-monster.magicResistance>basic*1.3)return {type:'magic',id:damage.id}
  if(state.potions.mana&&state.mp<4&&state.equippedSpells.some(id=>spellMechanics[id]?.damage))return {type:'potion',kind:'mana'}
 }
 return {type:'attack'}
}

const worldSeed=(seed:number,floor:number)=>seededRandom(seed+floor*193939)
function playCombat(initial:PracticeState,id:MonsterId,strategy:Strategy,random:()=>number,lootRandom:()=>number,loot?:RoomLoot,ambush=false){
 let state=startMonsterCombat(initial,id,{random:lootRandom,loot,ambush}),turns=0
 while(state.combat?.status==='active'&&turns++<300){
  const next=resolveCombatTurn(state,chooseAction(state,strategy),random).state
  if(next===state)throw Error('Simulation selected an invalid combat action')
  state=next
 }
 if(state.combat?.status==='active')throw Error('Simulation stalled in combat')
 return {state,turns}
}
export function simulateCampaign(seed:number,strategy:Strategy,quizAccuracy=.8,trace=false,checkFinalBoss=false):RunResult{
 let state=newPractice(seededRandom(seed),'practice')
 const decisions=seededRandom(seed^0x345612),combatRandom=seededRandom(seed^0x738124)
 const result:RunResult={strategy,seed,completed:false,reached:1,completedFloors:0,hp:state.hp,gold:0,battles:0,wins:0,escapes:0,bossAttempts:0,bossWins:0,finalBossWin:false,rooms:{},...(trace?{trace:[]}: {})}
 const fight=(id:MonsterId,random:()=>number,loot?:RoomLoot,ambush=false)=>{
  const boss=getFloorMonster(id,state.market.floor,true).tier==='boss';result.battles++;if(boss)result.bossAttempts++
  const played=playCombat(state,id,strategy,combatRandom,random,loot,ambush)
  state=played.state;const turns=played.turns
  const status=state.combat!.status
  if(status==='won'){result.wins++;if(boss){result.bossWins++;if(state.market.floor===practiceFinalFloor&&id===practiceFinalBossId)result.finalBossWin=true}if(state.combat?.loot)state=claim(state,state.combat.loot,random)}
  if(status==='escaped')result.escapes++
  if(status==='lost')result.deathMonster=getFloorMonster(id,state.market.floor,true).name
  result.trace?.push('전투 '+id+' '+status+' HP '+state.hp+' · '+turns+'턴 · 무기 '+state.weaponId+' · 보호구 '+state.armorId+' · 마법 '+state.equippedSpells.join(','))
 }
 for(let floor=1;floor<=practiceFinalFloor;floor++){
  result.reached=floor
  if(state.forcedMerchant){const profile=getShopkeeper(state.forcedMerchant.id);state=beginForcedMerchant(state,worldSeed(seed,floor));state=shop(state,profile.roomId,worldSeed(seed,floor));state=finishForcedMerchant(state)}
  state=optimize(state)
  while(state.hp/playerMaxHp(state)<.6&&state.potions.health)state=usePotion(state,'health')
  if(floor===practiceFinalFloor&&checkFinalBoss){
   const probe=playCombat(state,practiceFinalBossId,strategy,seededRandom(seed^0x413872),worldSeed(seed,floor))
   result.finalBossProbe={won:probe.state.combat?.status==='won',startingHp:state.hp,weaponId:state.weaponId,armorId:state.armorId,spells:[...state.equippedSpells],healthPotions:state.potions.health,manaPotions:state.potions.mana,turns:probe.turns}
  }
  const index=strategy==='random'?Math.floor(decisions()*3):state.market.doors.map((type,index)=>({index,score:roomScore(state,type,strategy)+decisions()*.01})).sort((a,b)=>b.score-a.score)[0].index
  const type=state.market.doors[index],world=seededRandom(seed+floor*193939+index*7919)
  result.rooms[type]=(result.rooms[type]??0)+1;result.trace?.push(floor+'층 '+type+' · HP '+state.hp+' · 골드 '+state.gold)
  if(shopkeeperForRoom(type))state=shop(state,type,world)
  else if(type==='monster'||type==='guardian'){
   const planned=state.market.monsterIds?.[index]
   fight(planned&&planned!=='random'?planned:drawFloorMonster(floor,world,type==='guardian'),world)
  }else if(type==='boss-anubis'||type===practiceFinalBossRoom)fight(type===practiceFinalBossRoom?practiceFinalBossId:'obsidian-anubis',world)
  else{
   const room=getAdventureRoom(type)!,visit=createRoomVisit(room.id,state,String(floor),world)
   state=enterRoomVisit(state,visit)
   if(room.kind==='rest')state=restFully(state)
   else if(room.kind==='scales'){for(const kind of ['weapon','armor'] as const){for(const item of kind==='weapon'?[...state.weapons]:[...state.armor])if(item.id!==state.weaponId&&item.id!==state.armorId)state=sellRoomGear(state,kind,item.id)}}
   else if(room.kind==='sphinx'){if(decisions()>=quizAccuracy)state=sphinxPenalty(state)}
   else if(room.kind==='giant'&&(strategy==='boss'||strategy==='explorer')&&weaponValue(state.weapons.find(item=>item.id===state.weaponId)!)>=22&&state.hp>playerMaxHp(state)*.7)fight(room.monsterId??'ancient-giant',world,undefined,true)
   else if((room.kind==='investigate'||room.kind==='chest')&&strategy!=='survivor'){
    if(visit.outcome.kind==='monster')fight(visit.outcome.monsterId,world,visit.outcome.loot)
    else if(visit.outcome.kind==='loot')state=claim(state,visit.outcome.loot,world)
    else if(visit.outcome.kind==='gold')state={...state,gold:state.gold+visit.outcome.gold}
   }
  }
  if(state.hp<=0)break
  if(needsFinalBoss(state)){
   state=optimize(state);while(state.hp/playerMaxHp(state)<.6&&state.potions.health)state=usePotion(state,'health')
   fight(practiceFinalBossId,world)
   if(state.hp<=0)break
  }
  result.completedFloors=floor
  const oasis=enterBossOasis(state);if(oasis!==state)state=restFully(oasis)
  const next=advanceExploration(state,seededRandom(seed+(floor+1)*104729))
  if(next===state)throw Error('Simulation failed to resolve a room before descent')
  state=next
  if(state.completed){result.completed=true;break}
 }
 result.hp=state.hp;result.gold=state.gold
 return result
}
export function wilsonInterval(wins:number,total:number){
 if(!total)return [0,1]
 const p=wins/total,z=1.96,den=1+z*z/total,center=(p+z*z/(2*total))/den,margin=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/den
 return [Math.max(0,center-margin),Math.min(1,center+margin)]
}
export function summarizeRuns(runs:RunResult[]){
 const n=runs.length,completed=runs.filter(item=>item.completed).length,p=completed/n,z=1.96,den=1+z*z/n,center=(p+z*z/(2*n))/den,margin=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
 const mean=(read:(item:RunResult)=>number)=>runs.reduce((sum,item)=>sum+read(item),0)/n
 const reached=(floor:number)=>runs.filter(item=>item.reached>=floor).length/n
 const deathMonsters:Record<string,number>={};for(const run of runs)if(run.deathMonster)deathMonsters[run.deathMonster]=(deathMonsters[run.deathMonster]??0)+1
 const probes=runs.filter(run=>run.finalBossProbe),probeWins=probes.filter(run=>run.finalBossProbe?.won).length,arrivals=runs.filter(run=>run.reached>=practiceFinalFloor).length
 return {arrivalsFinal:arrivals,reachFinalCI95:wilsonInterval(arrivals,n),clearGivenArrival:arrivals?completed/arrivals:0,clearGivenArrivalCI95:wilsonInterval(completed,arrivals),finalBossProbe:{attempts:probes.length,wins:probeWins,ci95GivenArrival:wilsonInterval(probeWins,probes.length),winRateOfStarts:probeWins/n,winRateOfArrivals:probes.length?probeWins/probes.length:0},strategy:runs[0].strategy,label:strategyLabels[runs[0].strategy],runs:n,completed,completionRate:p,ci95:[Math.max(0,center-margin),Math.min(1,center+margin)],reach10:reached(10),reach20:reached(20),reach30:reached(30),reach40:reached(40),reach50:reached(50),reachFinal:reached(practiceFinalFloor),meanCompletedFloors:mean(item=>item.completedFloors),meanBattles:mean(item=>item.battles),meanGold:mean(item=>item.gold),bossAttempts:runs.reduce((sum,item)=>sum+item.bossAttempts,0),bossWins:runs.reduce((sum,item)=>sum+item.bossWins,0),finalBossWinRate:mean(item=>Number(item.finalBossWin)),deathMonsters}
}
