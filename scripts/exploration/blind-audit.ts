import {beginForcedMerchant} from '../../src/features/exploration/shop-state'
import {finishForcedMerchant} from '../../src/features/exploration/merchant-pity'
import {newPractice,playerMaxHp,playerManaMax,playerAttackStats,equipGear,discardGear,usePotion,buyMerchantItem,floorMerchantGoods,type PracticeState,type Gear} from '../../src/features/exploration/practice-state'
import {resolveCombatTurn,startMonsterCombat,type CombatAction} from '../../src/features/exploration/combat-state'
import {getFloorMonster,type MonsterId} from '../../src/features/exploration/monster-catalog'
import {explorationWeapons} from '../../src/features/exploration/weapon-catalog'
import {explorationArmor} from '../../src/features/exploration/armor-catalog'
import {drawPracticeFloor,practiceFinalFloor,practiceFinalBossId} from '../../src/features/exploration/campaign'
import {advanceExploration,needsFinalBoss,enterBossOasis,needsNameGuardian,meetNameGuardian,finishNameGuardian} from '../../src/features/exploration/run-state'
import {createRoomVisit,enterRoomVisit,getAdventureRoom,restFully,sphinxPenalty} from '../../src/features/exploration/adventure-rooms'
import {drawRoomLoot,receiveRoomLoot,refreshRoomLoot,sellRoomGear,type RoomLoot} from '../../src/features/exploration/room-loot'
import {getShopkeeper,shopkeeperForRoom} from '../../src/features/exploration/shopkeepers'
import {enterShopkeeper} from '../../src/features/exploration/shop-state'
import {shamanSpells,learnShamanSpell} from '../../src/features/exploration/shaman-stock'
import {spellMechanics} from '../../src/features/exploration/spell-mechanics'
import {acceptChoiceRoom,choiceRoomBlock,type ChoiceRoomId} from '../../src/features/exploration/choice-room-state'
import {canAppeaseNameGuardian,progressNameStory} from '../../src/features/exploration/name-story'
import {seededRandom,weaponValue,armorValue,wilsonInterval} from './simulation'

// Room selection deliberately accepts no room types or inventory. All policies use it.
export function blindDoorIndex(seed:number,floor:number){return Math.floor(seededRandom(seed^Math.imul(floor,797003))()*3)}
const rng=(seed:number,floor:number,salt:number)=>seededRandom(seed^Math.imul(floor,104729)^salt)
const inc=(map:Record<string,number>,key:string,n=1)=>{map[key]=(map[key]??0)+n}
const tier=(id:string)=>explorationWeapons.find(item=>item.id===id)?.tier??explorationArmor.find(item=>item.id===id)?.tier??'starter'
export type AuditPolicy={id:string;label:string;combat:'basic'|'balanced'|'tactical'|'flee';risk:'skip'|'prudent'|'all';healthTarget:number;manaTarget:number;healThreshold:number;quizAccuracy:number;contracts:boolean;shops:boolean;spells:boolean;story:boolean;teleport:boolean;emergencyFlee?:boolean;shopPriority?:'potions'|'gear';frugalMagic?:boolean;denyContract?:ChoiceRoomId;forceContract?:ChoiceRoomId}
export const basePolicy:AuditPolicy={id:'balanced',label:'균형형',combat:'balanced',risk:'prudent',healthTarget:2,manaTarget:1,healThreshold:.4,quizAccuracy:.8,contracts:true,shops:true,spells:true,story:true,teleport:false}
export const baselinePolicies:AuditPolicy[]=[
 {...basePolicy,id:'basic',label:'기본 공격 중심',combat:'basic',spells:false},
 basePolicy,
 {...basePolicy,id:'tactical',label:'전술형 · 자유 마법 교체',combat:'tactical'},
 {...basePolicy,id:'cautious',label:'위험 회피형',combat:'flee',risk:'skip'},
 {...basePolicy,id:'risk',label:'선택 전투·거래 적극형',risk:'all'},
 {...basePolicy,id:'gearFirst',label:'장비 우선·마법 절약형',shopPriority:'gear',frugalMagic:true},
 {...basePolicy,id:'gearTactical',label:'장비 우선·전술형',shopPriority:'gear',frugalMagic:true,combat:'tactical'},
]
export type Counts=Record<string,number>
export type BattleStats={n:number;wins:number;deaths:number;escapes:number;turns:number;loss:number;raw:number;blocked:number;criticalHits:number;hits:number}
export type FloorStats={n:number;hp:number;gold:number;hpPots:number;mpPots:number;deaths:number;tiers:Counts}
export type AuditRun={seed:number;clear:boolean;reached:number;visited:number;deathFloor?:number;deathMonster?:string;gold:number;hp:number;metrics:Counts;bossEntry?:{hp:number;gold:number;weapon:string;armor:string;health:number;mana:number;win:boolean;turns:number;spells:string[]};trace?:string[]}
export type AuditTotals={rooms:Counts;offered:Counts;decisions:Counts;actions:Counts;purchases:Counts;spells:Counts;monsters:Record<string,BattleStats>;floors:Record<number,FloorStats>;finalWeapons:Record<string,{n:number;wins:number}>}
export function makeTotals():AuditTotals{return {rooms:{},offered:{},decisions:{},actions:{},purchases:{},spells:{},monsters:{},floors:{},finalWeapons:{}}}
export function prepareLoadout(state:PracticeState){
 const weapon=[...state.weapons].sort((a,b)=>weaponValue(b)-weaponValue(a))[0],armor=[...state.armor].sort((a,b)=>armorValue(b)-armorValue(a))[0]
 let next=equipGear(equipGear(state,'weapon',weapon.id),'armor',armor.id)
 const score=(id:string)=>(spellMechanics[id]?.damage??0)+(spellMechanics[id]?.healing??0)*.8+(spellMechanics[id]?.stun?15:0)
 const ids=next.spells.map(item=>item.id).sort((a,b)=>score(b)-score(a)),heal=ids.find(id=>spellMechanics[id]?.healing),damage=ids.find(id=>spellMechanics[id]?.damage)
 next={...next,equippedSpells:heal&&damage?[damage,heal]:ids.slice(0,2)}
 return next
}
export function auditAction(state:PracticeState,policy:AuditPolicy):CombatAction{
 const combat=state.combat!,monster=getFloorMonster(combat.monsterId,state.market.floor,true),stats=playerAttackStats(state)
 const basic=Math.max(1,stats.attack-monster.defense),criticalExpected=basic*(1+stats.critical/100)
 const affordable=policy.spells?state.spells.filter(spell=>(policy.combat==='tactical'||state.equippedSpells.includes(spell.id))&&state.mp>=spell.mana):[]
 if(basic>=combat.enemyHp)return {type:'attack'}
 const lethal=affordable.find(spell=>Math.max(0,(spellMechanics[spell.id]?.damage??0)-monster.magicResistance)>=combat.enemyHp)
 if(lethal&&policy.combat!=='basic')return {type:'magic',id:lethal.id}
 const heal=affordable.find(spell=>spellMechanics[spell.id]?.healing&&playerMaxHp(state)-state.hp>=Math.min(18,spellMechanics[spell.id].healing!))
 if(state.hp<playerMaxHp(state)*policy.healThreshold){
  if(state.potions.health)return {type:'potion',kind:'health'}
  if(heal)return {type:'magic',id:heal.id}
 }
 if(policy.combat==='flee'&&monster.tier!=='boss')return {type:'flee'}
 if(policy.emergencyFlee&&monster.tier!=='boss'&&state.hp<playerMaxHp(state)*.3&&combat.enemyHp>basic*2&&!heal)return {type:'flee'}
 if(policy.combat!=='basic'&&policy.spells){
  if(heal&&state.hp<playerMaxHp(state)*.55)return {type:'magic',id:heal.id}
  if(policy.combat==='tactical'){
   const utility=affordable.find(spell=>{
    const p=spellMechanics[spell.id]
    if(!p)return false
    if(p.cleanse)return !!(state.playerEffects?.length||combat.playerBlind||combat.magicResistanceDown)
    if(p.attackBuff)return !combat.attackBuff&&combat.enemyHp>criticalExpected*3
    if(p.shield)return !combat.shield&&combat.enemyHp>criticalExpected*3
    if(p.ailment&&!p.damage)return !combat.effects?.some(effect=>effect.kind===p.ailment!.kind)&&combat.enemyHp>criticalExpected*3
    return false
   })
   if(utility)return {type:'magic',id:utility.id}
  }
  const damage=affordable.filter(spell=>spellMechanics[spell.id]?.damage).sort((a,b)=>{
   const score=(spell:typeof a)=>{const p=spellMechanics[spell.id];return Math.max(1,(p.damage??0)-monster.magicResistance)+(p.stun?12:0)+(p.ailment?3:0)}
   return score(b)-score(a)
  })[0]
  if(damage&&(spellMechanics[damage.id].damage??0)-monster.magicResistance>criticalExpected*1.3)return {type:'magic',id:damage.id}
  if(state.potions.mana&&state.mp<4&&state.spells.some(spell=>spellMechanics[spell.id]?.damage))return {type:'potion',kind:'mana'}
 }
 return {type:'attack'}
}
export function runBlindAudit(seed:number,policy:AuditPolicy,totals=makeTotals(),tracing=false):AuditRun{
 let state=newPractice(rng(seed,1,1),'practice');state={...state,market:drawPracticeFloor(1,rng(seed,1,31))}
 const out:AuditRun={seed,clear:false,reached:1,visited:0,gold:0,hp:100,metrics:{},...(tracing?{trace:[]}: {})}
 const m=out.metrics,log=(text:string)=>out.trace?.push(text)
 const countDelta=(before:PracticeState,after:PracticeState,source:string)=>{
  for(const kind of ['health','mana'] as const){const delta=after.potions[kind]-before.potions[kind];if(delta>0)inc(m,kind+'Gained:'+source,delta);if(delta<0)inc(m,kind+'Lost:'+source,-delta)}
 }
 const claim=(planned:RoomLoot,random:()=>number)=>{
  const before=state,loot=refreshRoomLoot(state,planned,random),bag=loot.kind==='weapon'?state.weapons:state.armor,score=loot.kind==='weapon'?weaponValue:armorValue
  const replace=loot.kind!=='potion'&&bag.length>=3?[...bag].sort((a,b)=>score(a)-score(b))[0].id:undefined
  state=receiveRoomLoot(state,loot,replace)
  if(state===before)throw Error('Loot could not be claimed')
  if(state.combat?.loot){if(state.combat.monsterId==='nameless-royal-warden'&&state.combat.status==='won'){state=progressNameStory(state,'claim');inc(m,'storyRewards')}state={...state,combat:{...state.combat!,lootClaimed:true}}}
  countDelta(before,state,'loot');inc(m,'loot:'+loot.kind);if(loot.kind!=='potion')inc(m,'lootTier:'+tier(loot.id))
  state=prepareLoadout(state)
 }
 const recover=()=>{
  state=prepareLoadout(state)
  while(state.hp/playerMaxHp(state)<.65&&state.potions.health){const before=state;state=usePotion(state,'health');if(state===before)throw Error('Invalid recovery');inc(m,'healthUsedOutside');inc(m,'healthRestoredOutside',state.hp-before.hp)}
 }
 const fight=(id:MonsterId,random:()=>number,loot?:RoomLoot,ambush=false)=>{
  state=startMonsterCombat(state,id,{random,loot,ambush})
  const monster=getFloorMonster(id,state.market.floor,true),key=`${Math.floor((state.market.floor-1)/10)*10+1}:${id}`
  const b=totals.monsters[key]??= {n:0,wins:0,deaths:0,escapes:0,turns:0,loss:0,raw:0,blocked:0,criticalHits:0,hits:0};b.n++
  inc(m,'battles');const startHp=state.hp,combatRng=rng(seed,state.market.floor,87171+id.length*13+(m.battles??0))
  const isFinal=id===practiceFinalBossId
  if(isFinal)out.bossEntry={hp:state.hp,gold:state.gold,weapon:state.weaponId,armor:state.armorId,health:state.potions.health,mana:state.potions.mana,win:false,turns:0,spells:[...state.equippedSpells]}
  let turns=0
  while(state.combat?.status==='active'&&turns<300){
   const action=auditAction(state,policy)
   if(action.type==='magic'&&policy.combat==='tactical'&&!state.equippedSpells.includes(action.id))state={...state,equippedSpells:[action.id,...state.equippedSpells.filter(id=>id!==action.id)].slice(0,2)}
   const before=state,result=resolveCombatTurn(state,action,combatRng)
   if(result.state===state)throw Error('Invalid action '+JSON.stringify(action))
   state=result.state;turns++;inc(totals.actions,action.type)
   if(action.type==='magic')inc(totals.spells,action.id)
   if(action.type==='potion')inc(m,action.kind+'UsedCombat')
   for(const event of result.events){
    if(event.kind==='player'&&event.effect==='potion'){inc(m,action.type==='potion'&&action.kind==='mana'?'manaRestored':'healthRestoredCombat',event.healing??event.manaRestored??0)}
    if(event.healing&&event.effect==='lifesteal')inc(m,'lifestealHealing',event.healing)
    if(event.kind==='system'&&event.healing)inc(m,'revivals')
    if(event.kind==='player'&&event.healing&&event.effect!=='potion')inc(m,'spellHealing',event.healing)
    if(event.kind==='monster'){b.hits++;b.raw+=event.rawDamage??event.damage??0;b.blocked+=event.defenseBlocked??0;if(event.critical)b.criticalHits++}
    if(event.target==='player'||event.kind==='monster')inc(m,'incomingDamage',event.damage??0)
   }
   if(action.type==='potion')inc(m,action.kind+'PotionNetHp',state.hp-before.hp)
  }
  if(turns>=300&&state.combat?.status==='active')throw Error('Combat stalled')
  b.turns+=turns;b.loss+=startHp-state.hp;inc(m,'combatTurns',turns)
  const status=state.combat!.status
  if(status==='won'){b.wins++;inc(m,'wins');inc(m,'goldEarned:combat',monster.gold);if(state.combat?.loot)claim(state.combat.loot,random)}
  else if(status==='escaped'){b.escapes++;inc(m,'escapes')}
  else if(status==='lost'){b.deaths++;out.deathMonster=monster.name;out.deathFloor=state.market.floor}
  if(out.bossEntry&&isFinal){out.bossEntry.win=status==='won';out.bossEntry.turns=turns;const row=totals.finalWeapons[out.bossEntry.weapon]??={n:0,wins:0};row.n++;if(status==='won')row.wins++}
  log(`전투 ${id} ${status} ${turns}턴 HP ${startHp}→${state.hp}`)
 }
 const visitShop=(type:Parameters<typeof shopkeeperForRoom>[0],random:()=>number)=>{
  inc(m,'shopsVisited');const profile=shopkeeperForRoom(type)!;state=enterShopkeeper(state,profile,random)
  if(!policy.shops)return
  const buyPotions=()=>{
   for(const kind of ['health','mana'] as const){const target=kind==='health'?policy.healthTarget:policy.spells&&state.spells.length?policy.manaTarget:0
    while(state.gold>=100&&state.potions[kind]<target){const before=state;state=buyMerchantItem(state,kind==='health'?'health-potion':'mana-potion');if(state===before)throw Error('Invalid potion purchase');inc(m,'spent:'+kind,100);inc(m,kind+'Gained:shop');inc(totals.purchases,kind+'-potion')}
   }
  }
  if(profile.kind==='equipment'){
   // Reserve a modest recovery supply first, then compare upgrades by value per gold.
   if(policy.shopPriority!=='gear')buyPotions()
   const offers=floorMerchantGoods(state).filter(item=>item.kind==='weapon'||item.kind==='armor')
   offers.sort((a,b)=>{const val=(item:typeof a)=>{const key=item.kind==='weapon'?'weapons':'armor',score=item.kind==='weapon'?weaponValue:armorValue;return (score(item.gear!)-Math.max(...state[key].map(score)))/item.price};return val(b)-val(a)})
   for(const item of offers){
    const key=item.kind==='weapon'?'weapons':'armor',score=item.kind==='weapon'?weaponValue:armorValue
    if(state.gold<item.price||score(item.gear!)<=Math.max(...state[key].map(score)))continue
    if(state[key].length>=3){const worst=[...state[key]].filter(gear=>gear.id!==(key==='weapons'?state.weaponId:state.armorId)).sort((a,b)=>score(a)-score(b))[0];if(worst)state=discardGear(state,key==='weapons'?'weapon':'armor',worst.id)}
    const before=state;state=buyMerchantItem(state,item.id)
    if(state!==before){inc(m,'spent:'+item.kind,item.price);inc(totals.purchases,item.id);if(!m.firstUpgradeFloor)m.firstUpgradeFloor=state.market.floor;state=prepareLoadout(state)}
   }
   buyPotions()
  }else if(policy.spells){
   const offers=[...state.shamanStock!.spellIds].map(id=>shamanSpells.find(spell=>spell.id===id)!).sort((a,b)=>{const score=(id:string)=>{const p=spellMechanics[id];return ((p?.damage??0)+(p?.healing??0)+(p?.stun?15:0)+(policy.combat==='tactical'&&p?.attackBuff?70:0))};return score(b.id)-score(a.id)})
   for(const spell of offers){
    const p=spellMechanics[spell.id];if(!p||!(p.damage||p.healing||p.stun||policy.combat==='tactical'))continue
    if(policy.frugalMagic){
     const power=(id:string)=>{const item=spellMechanics[id];return (item?.damage??0)+(item?.healing??0)+(item?.stun?12:0)+(item?.attackBuff?55:0)}
     const sameRole=state.spells.filter(item=>!!spellMechanics[item.id]?.healing===!!p.healing)
     if(sameRole.some(item=>power(item.id)>=power(spell.id)))continue
    }
    const before=state;state=learnShamanSpell(state,spell.id)
    if(state!==before){inc(m,'spent:magic',spell.learnPrice??0);inc(totals.purchases,spell.id);state=prepareLoadout(state)}
   }
  }
 }
 for(let step=0;step<55&&!state.completed;step++){
  const floor=state.market.floor;out.reached=floor;out.visited++
  if(state.forcedMerchant){const profile=getShopkeeper(state.forcedMerchant.id);state=beginForcedMerchant(state,rng(seed,floor,51881));inc(m,'forcedMerchants');visitShop(profile.roomId,rng(seed,floor,51881));state=finishForcedMerchant(state)}
  recover()
  const f=totals.floors[floor]??={n:0,hp:0,gold:0,hpPots:0,mpPots:0,deaths:0,tiers:{}}
  f.n++;f.hp+=state.hp/playerMaxHp(state);f.gold+=state.gold;f.hpPots+=state.potions.health;f.mpPots+=state.potions.mana;inc(f.tiers,tier(state.weaponId))
  if(needsNameGuardian(state)){state=meetNameGuardian(state);const random=rng(seed,floor,34000);inc(totals.rooms,'nameless-guardian');if(canAppeaseNameGuardian(state)){state=progressNameStory(state,'open-gate');state=progressNameStory(state,'claim');claim(drawRoomLoot(state,'advanced',random),random)}else fight('nameless-royal-warden',random);if(state.hp<=0){f.deaths++;break};const oasis=enterBossOasis(state);if(oasis!==state)state=restFully(oasis);state=finishNameGuardian(state)}
  const index=blindDoorIndex(seed,floor),type=state.market.doors[index],random=rng(seed,floor,index*7919+9947)
  if(state.market.doors.length!==3)throw Error('Invalid doors')
  for(const room of state.market.doors)inc(totals.offered,room)
  inc(totals.rooms,type);log(`${floor}층 ${index+1}번 ${type} HP ${state.hp} 골드 ${state.gold} 무기 ${state.weaponId}`)
  if(shopkeeperForRoom(type))visitShop(type,random)
  else if(type==='monster'||type==='guardian'){const planned=state.market.monsterIds?.[index];fight(planned&&planned!=='random'?planned: type==='guardian'?'sand-wraith':'sand-scorpion',random)}
  else if(type==='boss-anubis'||type==='boss-pharaoh')fight(type==='boss-pharaoh'?practiceFinalBossId:'obsidian-anubis',random)
  else{
   const room=getAdventureRoom(type)!;if(!room)throw Error('Unknown room '+type)
   const visit=createRoomVisit(room.id,state,`${floor}:${type}`,random),before=state;state=enterRoomVisit(state,visit);countDelta(before,state,'theft')
   if(room.kind==='rest'){const before=state;state=restFully(state);inc(m,'restHealing',state.hp-before.hp);inc(m,'restMana',state.mp-before.mp);inc(m,'rests')}
   else if(room.kind==='scales'){for(const kind of ['weapon','armor'] as const)for(const item of [...(kind==='weapon'?state.weapons:state.armor)]){const before=state;state=sellRoomGear(state,kind,item.id);inc(m,'goldEarned:sales',state.gold-before.gold)}}
   else if(room.kind==='sphinx'){inc(m,'quizzes');if(rng(seed,floor,444)()>=policy.quizAccuracy){state=sphinxPenalty(state);inc(m,'quizFailures')}}
   else if(room.kind==='giant'){
    const accept=policy.risk==='all'||policy.risk==='prudent'&&weaponValue(state.weapons.find(item=>item.id===state.weaponId)!)>=22&&state.hp>playerMaxHp(state)*.7
    inc(totals.decisions,type+':'+(accept?'accept':'skip'));if(accept)fight(room.monsterId??'ancient-giant',random,undefined,true)
   }else if(room.kind==='investigate'||room.kind==='chest'){
    const accept=policy.risk!=='skip';inc(totals.decisions,type+':'+(accept?'search':'skip'))
    if(accept){if(visit.outcome.kind==='monster')fight(visit.outcome.monsterId,random,visit.outcome.loot);else if(visit.outcome.kind==='loot')claim(visit.outcome.loot,random);else if(visit.outcome.kind==='gold'){state={...state,gold:state.gold+visit.outcome.gold};inc(m,'goldEarned:chest',visit.outcome.gold)}}
   }else if(room.kind==='choice'){
    const id=room.id as ChoiceRoomId
    let accept=policy.contracts&&!choiceRoomBlock(state,id)
    if(id===policy.denyContract)accept=false
    if(accept&&id!==policy.forceContract){
     if(id==='deep-well')accept=state.hp<playerMaxHp(state)*.65
     if(id==='forbidden-trade')accept=policy.spells&&(policy.risk==='all'||state.hp>=85&&state.spells.length<3)
     if(id==='cursed-gem-eye')accept=policy.risk==='all'||state.hp>playerMaxHp(state)*.8&&weaponValue(state.weapons.find(item=>item.id===state.weaponId)!)>=20
     if(id==='broken-teleport')accept=policy.teleport&&state.hp<playerMaxHp(state)*.65
    }
    inc(totals.decisions,id+':'+(accept?'accept':'skip'))
    if(accept){const before=state;state=acceptChoiceRoom(state,id,random);if(state!==before){inc(m,'contract:'+id);if(id==='cursed-gem-eye'){inc(m,'goldEarned:gem',state.gold-before.gold);inc(m,'gemManaLost',before.mp-state.mp)}if(id==='broken-teleport')inc(m,'spent:teleport',200);if(id==='forbidden-trade')inc(m,'tradeHp',50);if(id==='deep-well')inc(m,'wellHealing',state.hp-before.hp)}}
   }else if(room.kind==='story'){
    if(room.id==='erased-name'&&policy.story)state=progressNameStory(state,'restore')
    else if(room.id==='erased-name-record'&&policy.story)state=progressNameStory(state,'read-record')
    else if(room.id==='nameless-guardian'){
     if(canAppeaseNameGuardian(state)){state=progressNameStory(state,'open-gate');if(!state.nameStory?.rewardClaimed){state=progressNameStory(state,'claim');claim(drawRoomLoot(state,'advanced',random),random);inc(m,'storyRewards')}}
     else fight('nameless-royal-warden',random)
    }
   }
  }
  if(state.hp<=0){f.deaths++;break}
  if(needsFinalBoss(state)){recover();fight(practiceFinalBossId,random);if(state.hp<=0){f.deaths++;break}}
  const oasis=enterBossOasis(state);if(oasis!==state)state=restFully(oasis)
  const next=advanceExploration(state,rng(seed,state.market.floor+(state.pendingFloorAdvance??1),31))
  if(next===state)throw Error('Unresolved room '+type)
  state=next
 }
 out.clear=!!state.completed;out.hp=state.hp;out.gold=state.gold
 if(!out.clear&&state.hp>0)throw Error('Audit did not finish')
 return out
}
const average=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0
const quantile=(values:number[],p:number)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted.length?sorted[Math.floor((sorted.length-1)*p)]:0}
export function summarizeAudit(runs:AuditRun[],totals:AuditTotals,policy:AuditPolicy){
 const n=runs.length,clear=runs.filter(r=>r.clear),arrivals=runs.filter(r=>r.reached===50),boss=runs.filter(r=>r.bossEntry),metrics:Counts={}
 for(const r of runs)for(const [key,value]of Object.entries(r.metrics))inc(metrics,key,value)
 const deaths:Counts={};for(const r of runs)if(r.deathMonster)inc(deaths,r.deathMonster)
 return {policy,n,clears:clear.length,clearRate:clear.length/n,clearCI95:wilsonInterval(clear.length,n),arrivals:arrivals.length,arrivalRate:arrivals.length/n,arrivalCI95:wilsonInterval(arrivals.length,n),bossAttempts:boss.length,bossWinRate:boss.length?clear.length/boss.length:0,bossWinCI95:wilsonInterval(clear.length,boss.length),meanReached:average(runs.map(r=>r.reached)),medianReached:quantile(runs.map(r=>r.reached),.5),reach:Object.fromEntries([5,10,20,30,40,50].map(f=>[f,runs.filter(r=>r.reached>=f).length/n])),meanGold:average(runs.map(r=>r.gold)),goldMedian:quantile(runs.map(r=>r.gold),.5),clearGold:average(clear.map(r=>r.gold)),meanBattles:metrics.battles/n,meanTurns:metrics.combatTurns/n,bossEntry:{hp:average(boss.map(r=>r.bossEntry!.hp)),health:average(boss.map(r=>r.bossEntry!.health)),mana:average(boss.map(r=>r.bossEntry!.mana)),turns:average(boss.map(r=>r.bossEntry!.turns))},deaths,metrics,totals,examples:{clear:clear[0]?.seed,death:runs.find(r=>!r.clear)?.seed}}
}

export function duelAudit(weapon:Gear,armor:Gear,id:MonsterId,floor:number,trials:number,kit=false){
 let wins=0,turns=0,hp=0,heal=0,damage=0,casts=0
 const policy={...basePolicy,spells:false,combat:'basic' as const}
 for(let trial=0;trial<trials;trial++){
  let state=newPractice(()=>.5,'practice');state={...state,weapons:[weapon],weaponId:weapon.id,armor:[armor],armorId:armor.id,hp:100+(armor.maxHpBonus??0),market:{...state.market,floor},potions:{health:kit?2:0,mana:0}}
  state=startMonsterCombat(state,id,{random:()=>.5});const random=seededRandom(20261101+trial*7919)
  for(let turn=0;turn<200&&state.combat?.status==='active';turn++){
   const action=auditAction(state,policy),result=resolveCombatTurn(state,action,random);state=result.state
   damage+=result.events.filter(e=>e.kind==='player').reduce((sum,e)=>sum+(e.damage??0),0)
   heal+=result.events.filter(e=>e.effect==='lifesteal').reduce((sum,e)=>sum+(e.healing??0),0)
   if(action.type==='potion')casts++
  }
  if(state.combat?.status==='won')wins++;turns+=state.combat?.turn??0;hp+=state.hp
 }
 return {weapon:weapon.id,name:weapon.name,tier:tier(weapon.id),armor:armor.id,monster:id,floor,trials,kit,wins,winRate:wins/trials,ci95:wilsonInterval(wins,trials),meanTurns:turns/trials,meanHp:hp/trials,meanDirectDamage:damage/trials,meanLifesteal:heal/trials,meanPotions:casts/trials}
}
