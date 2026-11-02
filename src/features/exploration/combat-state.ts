import {shieldDamage} from './shield-damage'
import {hasTimedSpell} from './timed-spells'
import {campaignFinalFloor,campaignFinalBoss} from './campaign-profile'
import {drawRoomLoot,type RoomLoot} from './room-loot'
import {plannedSpells} from './spell-catalog'
import {spellMechanics} from './spell-mechanics'
import {cleanseSpellState,playerManaMax,equippedGearBonus,spellManaCost,playerMaxHp,playerAttackStats,usePotion,merchantPotions,incomingDamage,basicAttackEvasion,type PracticeState} from './practice-state'
import {applyEnemyAilment,healingAfterReduction} from './status-effects'
import {ailmentDescription} from './ailment-rules'
import {getFloorMonster,sandScorpion,type MonsterId} from './monster-catalog'
import {rollBasicAttack,monsterAttackVariance} from './attack-roll'
import {getCombatMonster} from './monster-patterns'
import {canAppeaseNameGuardian} from './name-story'
import {planDeepCounter} from './deep-monster-patterns'
import {stolenPotionLabel} from './potion-theft'
export {sandScorpion} from './monster-catalog'

export function monsterDefeatText(name:string){
 const last=name.charCodeAt(name.length-1),particle=last>=0xac00&&last<=0xd7a3&&(last-0xac00)%28!==0?'을':'를'
 return `${name}${particle} 처치했습니다.`
}

export const combatMagic={ember:'불꽃 피해 20',tide:'다음 반격 2회 동안 받는 피해 8 감소',light:'내 체력 18 회복',sand:'피해 12 · 이번 반격 봉쇄',...Object.fromEntries(plannedSpells.map(spell=>[spell.id,spell.description]))} as const
export type CombatAction={type:'attack'}|{type:'flee'}|{type:'magic';id:string}|{type:'potion';kind:import('./practice-state').PotionKind}
export type CombatEvent={phase?:'player'|'reply';kind:'player'|'monster'|'defense'|'reward'|'system'|'status';text:string;damage?:number;rawDamage?:number;defenseBlocked?:number;critical?:boolean;healing?:number;manaRestored?:number;manaLost?:number;gold?:number;spellId?:string;weaponId?:string;weaponProc?:import('./ailments').AilmentKind;source?:string;target?:'player'|'monster';moveId?:string;attackType?:'physical'|'magic';effect?:'burn'|'evade'|'block'|'stun'|'freeze'|'miss'|'lifesteal'|'cleanse'|'blind'|'mana-drain'|'enemy-heal'|'magic-break'|'weaken'|'bleed'|'shield'|'potion'}
export type CombatResult={state:PracticeState;playerState:PracticeState;actionState?:PracticeState;lines:string[];events:CombatEvent[]}
export type TurnFeedback={id:number;phase:'prepare'|'player'|'bleed'|'counter'|'reply';events:CombatEvent[];action:CombatAction['type']}
export function escapeChance(state:PracticeState){
 const weapon=state.weapons.find(item=>item.id===state.weaponId),armor=state.armor.find(item=>item.id===state.armorId)
 return Math.max(0,Math.min(100,35+(weapon?.escapeBonus??0)+(armor?.escapeBonus??0)+state.escapeBoost))
}
export function startScorpionCombat(state:PracticeState):PracticeState{
 return startMonsterCombat(state,sandScorpion.id)
}
export function startMonsterCombat(state:PracticeState,monsterId:MonsterId,options:{ambush?:boolean;random?:()=>number;loot?:RoomLoot;lootSource?:'chest';stolenPotions?:import('./potion-theft').StolenPotions}={}):PracticeState{
 if(state.hp<=0||state.combat?.status==='active')return state
 if(monsterId==='nameless-royal-warden'&&(canAppeaseNameGuardian(state)||state.nameStory?.gateOpened||state.nameStory?.rewardClaimed))return state
 const monster=getFloorMonster(monsterId,state.market.floor,state.mode==='practice')
 const storyWarden=monsterId==='nameless-royal-warden'
 return {...state,...(storyWarden?{nameStory:{...state.nameStory,met:true}}:{}),combat:{...(options.stolenPotions?{stolenPotions:{...options.stolenPotions}}:{}),...(monster.pattern?{pattern:{}}:{}),...(equippedGearBonus(state,'openingShield')?{shield:{remaining:equippedGearBonus(state,'openingShield')}}:{}),monsterId,enemyHp:monster.maxHp,turn:0,status:'active',...(options.ambush?{ambush:true}:{}),...(options.loot||monster.tier==='boss'||(monster.id==='ancient-giant'||monster.id==='treasure-scarab')?{loot:options.loot??drawRoomLoot(state,storyWarden?'advanced':monster.id===campaignFinalBoss(state)||state.mode==='practice'&&monster.tier==='boss'&&state.market.floor>=30?'ultimate':'advanced',options.random??Math.random),lootClaimed:false,...(options.lootSource?{lootSource:options.lootSource}:{})}:{})}}
}
export function resolveCombatTurn(state:PracticeState,action:CombatAction,random=Math.random):CombatResult{
 const unchanged={state,playerState:state,lines:[],events:[]}
 if(!state.combat||state.combat.status!=='active'||state.hp<=0)return unchanged
 const monster=getCombatMonster(state)
 const weapon=state.weapons.find(item=>item.id===state.weaponId)
 if(action.type==='flee'&&monster.tier==='boss')return unchanged
 let next={...state,playerEffects:state.playerEffects?.map(effect=>({...effect})),combat:{...state.combat,pattern:{...state.combat.pattern},effects:state.combat.effects?.map(effect=>({...effect}))??[],turn:state.combat.turn+1}},guard=0,stunned=!!state.combat.ambush
 delete next.combat.ambush
 const lines:string[]=[]
 const events:CombatEvent[]=[]
 let phase:'player'|'reply'='player',revivedOnBleed=false,revivedOnCounter=false
 let actionState:PracticeState|undefined
 const record=(event:CombatEvent)=>{events.push({...event,phase});lines.push(event.text)}
 const directDamage=(damage:number)=>hasTimedSpell(next,'solar-brand')?Math.floor(damage*1.2):damage
 let enemyDefenseBlocked=0
 const absorbEnemyShield=(raw:number,reduction:number)=>{
  const p=next.combat.pattern!,hit=shieldDamage(directDamage(raw),p.shieldHp??0,overflow=>Math.max(1,overflow-reduction))
  if(hit.absorbed){p.shieldHp=(p.shieldHp??0)-hit.absorbed;record({kind:'status',source:monster.name,target:'monster',effect:'shield',text:`보호막이 피해 ${hit.absorbed} 흡수 · 남은 양 ${p.shieldHp}.`})}
  enemyDefenseBlocked=hit.defenseBlocked
  return hit.damage
 }
 const clearBleed=()=>{next.playerEffects=next.playerEffects?.filter(effect=>effect.kind!=='bleed')}
 const victory=()=>{
  next.combat.status='won';delete next.combat.shield;clearBleed()
  const manaRestored=Math.min(playerManaMax(next)-next.mp,equippedGearBonus(next,'victoryManaRestore'))
  if(manaRestored>0){next.mp+=manaRestored;record({kind:'status',source:'잔향',manaRestored,text:`잔향의 사제복 · 승리로 마나 ${manaRestored} 회복!`})}
  if(next.mode==='practice'&&next.market.floor===campaignFinalFloor(next)&&monster.id===campaignFinalBoss(next))next.finalBossDefeated=true
  if(monster.id==='nameless-royal-warden')next.nameStory={...next.nameStory,met:true,guardianDefeated:true,gateOpened:true}
  if(monster.tier==='boss'&&monster.id!==campaignFinalBoss(next)&&(next.mode!=='practice'||next.hp<playerMaxHp(next)||next.mp<playerManaMax(next)))next.bossRestPending=true
  const gold=monster.gold+(next.combat.pattern?.bonusGold??0)
  next.gold+=gold;record({kind:'reward',gold,text:monsterDefeatText(monster.name)+(gold>0?` 골드 +${gold}.`: '')})
  if(next.combat.stolenPotions){
   const stolen=next.combat.stolenPotions
   next.potions={health:next.potions.health+stolen.health,mana:next.potions.mana+stolen.mana}
   record({kind:'reward',text:`도둑에게서 ${stolenPotionLabel(stolen)}를 되찾았습니다.`})
  }
 }
 const playerFrozen=!!state.playerEffects?.some(effect=>effect.kind==='freeze'&&effect.turns>0)
 if(playerFrozen){record({kind:'status',target:'player',effect:'freeze',text:'빙결로 몸이 굳어 이번 행동을 하지 못했습니다.'})}
 else if(action.type==='flee'){
  const chance=escapeChance(state);next.escapeBoost=0
  if(random()*100<chance){clearBleed();const playerState={...next,combat:{...next.combat}};next.combat.status='escaped';delete next.combat.shield;record({kind:'system',text:'도망 성공! 보상 없이 아래층으로 향합니다.'});return {state:next,playerState,actionState,lines,events}}
  record({kind:'system',text:`도망 실패! (${chance}%) ${monster.name}의 추격이 이어집니다.`})
 }else if(action.type==='potion'){
  const restored=usePotion(state,action.kind,true)
  if(restored===state)return unchanged
  next.hp=restored.hp;next.mp=restored.mp;next.potions=restored.potions
  const potion=merchantPotions.find(item=>item.kind===action.kind)!,amount=action.kind==='health'?next.hp-state.hp:next.mp-state.mp
  record({kind:'player',effect:'potion',healing:action.kind==='health'?amount:undefined,manaRestored:action.kind==='mana'?amount:undefined,text:`${potion.name}을 마셨다. ${action.kind==='health'?'체력':'마나'} ${amount} 회복!`})
 }else if(action.type==='attack'){
  const attackStats=playerAttackStats(state)
  const missed=!!next.combat.playerBlind&&random()*100<next.combat.playerBlind
  delete next.combat.playerBlind
  if(!missed&&weapon?.shieldBreak&&next.combat.pattern?.shieldHp){next.combat.pattern.shieldHp=0;delete next.combat.pattern.shieldTurns;record({kind:'status',weaponId:weapon.id,target:'monster',effect:'shield',text:`${weapon.name}! 적 보호막을 전부 파괴했습니다.`})}
  const critical=!missed&&(!!state.combat.ambush||random()*100<attackStats.critical),rawDamage=missed?0:rollBasicAttack(attackStats.attack,random,attackStats.variance)*(critical?2:1),damage=missed?0:absorbEnemyShield(rawDamage,monster.defense)
  delete next.combat.playerWeaken
  const actualDamage=Math.min(next.combat.enemyHp,damage)
  next.combat.enemyHp=Math.max(0,next.combat.enemyHp-damage)
  record({kind:'player',weaponId:weapon?.id??'dull-dagger',damage,rawDamage,defenseBlocked:enemyDefenseBlocked,critical,effect:missed?'miss':undefined,text:missed?'실명! 모래바람에 가려 공격이 빗나갔습니다.':`${critical?'치명타! ':''}${weapon?.name??'공격'}으로 ${damage} 피해를 입혔습니다.`})
  if(weapon?.lifesteal){
   const healing=Math.min(playerMaxHp(next)-next.hp,healingAfterReduction(actualDamage*weapon.lifesteal/100,next.playerEffects??[]))
   if(healing>0){next.hp+=healing;record({kind:'status',effect:'lifesteal',healing,text:`피흡으로 체력 ${healing} 회복!`})}
  }
  if(!missed&&weapon?.cleanseChance&&(next.playerEffects?.length||next.combat.magicResistanceDown)&&random()*100<weapon.cleanseChance){
   const removed=next.playerEffects?.[0]
   if(removed)next.playerEffects=next.playerEffects!.slice(1)
   else delete next.combat.magicResistanceDown
   record({kind:'status',effect:'cleanse',text:`정화! ${removed?ailmentDescription(removed).split(' · ')[0]:'마법 저항력 감소'} 상태이상을 해제했습니다.`})
  }
  if(!missed&&actualDamage>0&&monster.pattern==='shell'){const p=next.combat.pattern!;p.shellHits=Math.min(2,(p.shellHits??0)+1);record({kind:'status',source:monster.name,text:`껍질에 금이 갑니다. 방어력 ${Math.max(0,6-3*p.shellHits)}.`})}
  if(!missed&&actualDamage>0&&monster.pattern==='gilded-armor'){const p=next.combat.pattern!;p.shellHits=Math.min(3,(p.shellHits??0)+1);record({kind:'status',source:monster.name,text:`황금 갑주가 벗겨집니다. 균열 ${p.shellHits}/3 · 방어력 ${Math.max(2,8-2*p.shellHits)}.`})}
  if(!missed&&actualDamage>0&&monster.pattern==='mirror')next.combat.pattern!.mirrorGuard='physical'
  const proc=weapon?.proc
  if(!missed&&next.combat.enemyHp>0&&proc&&!(proc.kind==='freeze'&&state.combat.freezeGuard)&&random()*100<proc.chance){
   const effect={kind:proc.kind,amount:proc.amount,turns:proc.turns}
   const applied=applyEnemyAilment(next.combat.effects,effect)
   if(applied!==next.combat.effects)record({kind:'status',target:'monster',weaponProc:proc.kind,text:`${monster.name}에게 ${ailmentDescription(effect)}.`})
   next.combat.effects=applied
  }
 }else{
  const spell=state.spells.find(spell=>spell.id===action.id)
  if(!spell||!state.equippedSpells.includes(action.id)||state.mp<spellManaCost(state,spell)||!(action.id in combatMagic))return unchanged
  const power=spellMechanics[action.id]
  if(!power)return unchanged
  const manaCost=spellManaCost(state,spell);next.mp-=manaCost
  if(power.breakShield&&next.combat.pattern?.shieldHp){next.combat.pattern.shieldHp=0;next.combat.pattern.shieldTurns=0;record({kind:'status',target:'monster',effect:'shield',text:'적의 보호막을 전부 파괴했습니다.'})}
  const spellDamage=power.damage?absorbEnemyShield(power.damage,monster.magicResistance):0
  if(power.timed)next.combat.spellEffects=[...(next.combat.spellEffects??[]).filter(effect=>effect.id!==power.timed!.id),{...power.timed}]
  if(spellDamage){next.combat.enemyHp=Math.max(0,next.combat.enemyHp-spellDamage);if(monster.pattern==='mirror')next.combat.pattern!.mirrorGuard='magic'}
  if(power.guard){next.combat.ward={amount:power.guard,turns:power.guardTurns??1};next.combat.wardSpellId=spell.id};stunned=stunned||power.stun===true
  if(power.cleanse||power.cleanseCount){const cleaned=cleanseSpellState(next,power.cleanse?undefined:power.cleanseCount);next.playerEffects=cleaned.playerEffects;next.combat=cleaned.combat}
  const spellHealing=power.healing?Math.min(playerMaxHp(next)-next.hp,healingAfterReduction(power.healing,next.playerEffects??[])):0
  next.hp+=spellHealing
  if(power.shield){next.combat.shield={remaining:Math.max(next.combat.shield?.remaining??0,power.shield.remaining)};next.combat.shieldSpellId=spell.id}
  if(power.attackBuff){next.combat.attackBuff={...power.attackBuff};next.combat.attackBuffName=spell.name;next.combat.attackBuffSpellId=spell.id}
  const description=[spellDamage?`피해 ${spellDamage}${stunned?' · 이번 반격 봉쇄':''}`:null,power.healing?`체력 ${spellHealing} 회복`:null,power.shield?`보호막 ${power.shield.remaining}`:null,power.cleanse?'상태이상 전부 정화':power.cleanseCount?`상태이상 ${power.cleanseCount}개 정화`:null].filter(Boolean).join(' · ')||combatMagic[action.id as keyof typeof combatMagic]
  record({kind:'player',spellId:spell.id,damage:spellDamage||undefined,rawDamage:power.damage||undefined,defenseBlocked:power.damage?enemyDefenseBlocked:undefined,healing:power.healing?spellHealing:undefined,text:`${spell.name} 시전! ${description} · 마나 ${manaCost} 소모.`})
  const effect=power.ailment
  if(next.combat.enemyHp>0&&effect&&!(effect.kind==='freeze'&&state.combat.freezeGuard)&&(effect.chance>=100||random()*100<effect.chance)){
   const ailment={kind:effect.kind,amount:effect.amount,turns:effect.turns}
   next.combat.effects=applyEnemyAilment(next.combat.effects,ailment)
   record({kind:'status',text:`${monster.name}에게 ${ailmentDescription(ailment)}.`})
  }
 }
 function revive(){
  if(next.hp>0)return false
  if(hasTimedSpell(next,'soul-knot')){next.hp=1;next.combat.spellEffects=next.combat.spellEffects?.filter(effect=>effect.id!=='soul-knot');record({kind:'system',spellId:'soul-knot',healing:1,text:'영혼의 매듭이 풀리며 체력 1로 살아남았습니다.'});return true}
  if(next.soulLantern!=='ready')return false
  next.hp=Math.min(20,playerMaxHp(next));next.soulLantern='spent';next.playerEffects=[]
  delete next.combat.playerBlind;delete next.combat.playerWeaken;delete next.combat.magicResistanceDown
  record({kind:'system',healing:next.hp,text:'영혼의 등불이 꺼지며 체력 20으로 부활했습니다.'})
  return true
 }
 // Player bleeding ticks after a completed action, never immediately on application.
 // A finishing blow ends the encounter before another bleeding tick.
 const playerBleed=next.playerEffects?.find(effect=>effect.kind==='bleed')
 if(next.combat.enemyHp>0&&playerBleed){
  // Presentation can show the completed action before its end-of-action bleed.
  // Keep the pre-tick snapshot independent of death, revival and later counters.
  actionState={...next,playerEffects:next.playerEffects?.map(effect=>({...effect})),combat:{...next.combat,pattern:{...next.combat.pattern},effects:next.combat.effects.map(effect=>({...effect}))}}
  const damage=Math.min(next.hp,playerBleed.amount)
  next.hp-=damage
  next.playerEffects=next.playerEffects!.flatMap(effect=>effect.kind!=='bleed'?[effect]:effect.turns>1?[{...effect,turns:effect.turns-1}]:[])
  record({kind:'status',effect:'bleed',target:'player',source:'출혈',damage,text:`출혈로 체력 ${damage} 감소.`})
  if(next.hp===0){revivedOnBleed=revive();if(!revivedOnBleed){next.combat.status='lost';clearBleed();record({kind:'system',text:'사망하였습니다.'});const playerState={...next,combat:{...next.combat,pattern:{...next.combat.pattern},effects:next.combat.effects.map(effect=>({...effect}))}};return {state:next,playerState,actionState,lines,events}}}
 }
 if(next.combat.attackBuff&&!(action.type==='magic'&&spellMechanics[action.id]?.attackBuff)){const buff=next.combat.attackBuff;next.combat.attackBuff=buff.turns>1?{...buff,turns:buff.turns-1}:undefined}
 if(!next.combat.attackBuff)delete next.combat.attackBuffName
 next.playerEffects=next.playerEffects?.flatMap(effect=>effect.kind==='bleed'?[effect]:effect.turns>1?[{...effect,turns:effect.turns-1}]:[])
 const playerState={...next,combat:{...next.combat,pattern:{...next.combat.pattern},effects:next.combat.effects.map(effect=>({...effect}))}}
 const magicResistanceDown=next.combat.magicResistanceDown??0
 delete next.combat.magicResistanceDown
 if(next.combat.enemyHp===0){victory();playerState.playerEffects=next.playerEffects;playerState.mp=next.mp;playerState.combat.shield=undefined;return {state:next,playerState,actionState,lines,events}}
 if(revivedOnBleed)return {state:next,playerState,actionState,lines,events}
 phase='reply'
 guard=next.combat.ward?.amount??0
 const frozen=next.combat.effects.some(effect=>effect.kind==='freeze')
 const blind=next.combat.effects.find(effect=>effect.kind==='blind')
 next.combat.freezeGuard=frozen
 if(frozen)record({kind:'defense',effect:'freeze',text:`빙결! ${monster.name}의 행동이 멈췄습니다.`})
 else if(stunned)record({kind:'defense',effect:'stun',text:state.combat.ambush?`기습! ${monster.name}이 잠에서 깨기 전에 반격을 봉쇄했습니다.`:`모래가 시야를 가려 ${monster.name}의 반격을 봉쇄했습니다.`})
 else{
  const moveRoll=monster.magic.length?random():0
  let magic=monster.skillChance!==undefined?(moveRoll<monster.skillChance?monster.magic[0]:undefined):monster.pattern==='hourglass'?(moveRoll<.35?monster.magic[0]:undefined):(monster.pattern==='golden-scales'||monster.pattern==='sand-devourer')?(moveRoll<.25?monster.magic[0]:moveRoll<.5?monster.magic[1]:undefined):monster.magic.length?monster.magic[Math.floor(moveRoll*(monster.magic.length+1))]:undefined
  const p=next.combat.pattern!
  if((monster.pattern==='golden-scales'||monster.pattern==='sand-devourer')){
   if(magic?.id===p.lastMove)magic=undefined
  }
  let handled=false
  const sealed=hasTimedSpell(next,'silent-seal')
  // Preserve non-skill escape behavior; bypass charge/cycle planning while sealed.
  const deepPlan=sealed?null:planDeepCounter(next,monster,Math.max(0,state.combat.enemyHp-next.combat.enemyHp),record)
  if(deepPlan){handled=deepPlan.handled;magic=deepPlan.magic}
  else if(monster.pattern==='coward'&&p.fleeReady){next.combat.status='escaped';next.combat.enemyFled=true;delete next.combat.shield;clearBleed();handled=true;record({kind:'system',source:monster.name,text:monster.name+'가 달아났습니다. 보상 없이 아래층으로 향합니다.'})}
  else if(monster.pattern==='coward')magic=undefined
  if(magic?.enemyShield&&p.shieldHp)magic=undefined
  if(sealed){magic=undefined;record({kind:'status',spellId:'silent-seal',target:'monster',text:'고요한 봉인으로 스킬이 봉쇄되었습니다.'})}
  if(monster.pattern==='golden-scales'||monster.pattern==='sand-devourer')p.lastMove=(magic??monster.basic).id
  if(!handled){
  const skill=magic??monster.basic,attackType=skill.attackType??(magic?'magic' as const:'physical' as const)
  const metadata={source:monster.name,moveId:skill.id,attackType}
  if(skill.enemyShield&&!p.shieldHp){p.shieldHp=skill.enemyShield.amount;delete p.shieldTurns;record({...metadata,kind:'status',target:'monster',effect:'shield',text:`${skill.name}! 보호막 ${p.shieldHp}.`})}
  if(!magic&&attackType==='physical'&&blind&&random()*100<blind.amount)record({...metadata,kind:'defense',effect:'miss',text:`실명! ${skill.name} 공격이 빗나갔습니다.`})
  else if(!magic&&attackType==='physical'&&random()*100<basicAttackEvasion(next,'physical'))record({...metadata,kind:'defense',effect:'evade',text:`${skill.name} 공격을 회피했습니다!`})
  else{
  const critical=!magic&&random()*100<monster.critical
  const weakness=next.combat.effects.find(effect=>effect.kind==='weaken')?.amount??0
  if(!magic&&playerFrozen&&skill.frozenBonus)record({...metadata,kind:'status',target:'player',effect:'freeze',text:`빙결된 대상에게 ${skill.name}의 기본 피해 +${skill.frozenBonus}.`})
  const rawDamage=Math.max(0,(magic?magic.damage:rollBasicAttack(monster.attack,random,monsterAttackVariance)+(playerFrozen?(skill.frozenBonus??0):0))-weakness)*(critical?2:1)
  const hit=shieldDamage(rawDamage,next.combat.shield?.remaining??0,overflow=>incomingDamage(next,overflow,attackType,guard,magicResistanceDown)),defenseBlocked=hit.defenseBlocked
  let damage=hit.damage
  if(next.combat.shield){next.combat.shield={remaining:next.combat.shield.remaining-hit.absorbed};if(hit.absorbed)record({...metadata,source:'보호막',kind:'status',effect:'shield',text:`보호막이 피해 ${hit.absorbed} 흡수 · 남은 양 ${next.combat.shield.remaining}.`})}
  const actualDamage=Math.min(next.hp,damage)
  next.hp=Math.max(0,next.hp-damage);record({...metadata,kind:damage>0?'monster':'defense',effect:damage===0?'block':undefined,critical,damage,rawDamage,defenseBlocked,text:`${skill.name}! ${critical?'치명타! ':''}${damage} 피해를 받았습니다.`})
  if(next.hp>0&&damage>0&&skill.bleed&&(skill.bleed.chance>=100||random()*100<skill.bleed.chance)){
   const effect={kind:'bleed' as const,amount:skill.bleed.amount,turns:skill.bleed.turns}
   const current=next.playerEffects??[]
   next.playerEffects=applyEnemyAilment(current,effect)
   if(next.playerEffects!==current)record({kind:'status',source:monster.name,target:'player',effect:'bleed',text:`출혈! 행동 종료마다 피해 ${effect.amount} · ${effect.turns}턴.`})
  }
  if(skill.lifesteal||magic?.effect==='lifesteal'){
   const healing=Math.min(monster.maxHp-next.combat.enemyHp,healingAfterReduction(actualDamage*(skill.lifesteal??50)/100,next.combat.effects))
   if(healing>0){next.combat.enemyHp+=healing;record({...metadata,kind:'status',effect:'enemy-heal',healing,text:`${skill.name} · 피흡! 체력 ${healing} 회복.`})}
  }
  if(next.hp>0&&damage>0&&skill.playerAilment&&!(skill.playerAilment.kind==='freeze'&&playerFrozen)){
   const effect=skill.playerAilment
   next.playerEffects=applyEnemyAilment(next.playerEffects??[],effect)
   record({...metadata,kind:'status',target:'player',effect:effect.kind,text:`${skill.name}! ${effect.kind==='freeze'?ailmentDescription(effect):effect.kind==='weaken'?`공격력 ${effect.amount} 감소`:`받는 회복량 ${effect.amount}% 감소`} · ${effect.turns}턴.`})
  }
  if(next.hp>0&&magic?.effect==='weaken'){next.combat.playerWeaken=2;record({kind:'status',source:monster.name,effect:'weaken',text:magic.name+'! 다음 기본 공격력 2 감소 · 1회.'})}
  if(next.hp>0&&magic?.effect==='blind'){next.combat.playerBlind=magic.blindAmount??30;record({kind:'status',source:monster.name,effect:'blind',text:`실명! 다음 기본 공격 1회의 명중률이 ${magic.blindAmount??30}% 감소합니다.`})}
  if(next.hp>0&&magic?.effect==='magic-break'){next.combat.magicResistanceDown=10;record({kind:'status',source:monster.name,effect:'magic-break',text:skill.name+'! 마법 저항력 10 감소 · 1턴.'})}
  if(magic?.effect==='mana-drain'){const manaLost=Math.min(4,next.mp);next.mp-=manaLost;record({kind:'status',source:monster.name,effect:'mana-drain',manaLost,text:`왕릉의 봉인! 마나 ${manaLost} 감소.`})}
  if(next.hp===0){revivedOnCounter=revive();if(!revivedOnCounter){next.combat.status='lost';clearBleed();record({kind:'system',text:'사망하였습니다.'})}}
  }
 }
 }
 // The rat attempts its basic attack before telegraphing an escape, even below half HP.
 if(monster.pattern==='coward'&&!frozen&&!stunned&&next.combat.status==='active'&&next.combat.enemyHp<=monster.maxHp/2){
  next.combat.pattern!.fleeReady=true
  record({kind:'status',source:monster.name,moveId:'rat-scurry',text:'줄행랑! 도굴쥐가 출구로 몸을 돌립니다. 다음 행동에 달아납니다.'})
 }
 if(next.hp>0&&!revivedOnCounter&&next.combat.status==='active'){
  const bleeding=next.combat.effects.find(effect=>effect.kind==='bleed')
  if(bleeding){const damage=Math.min(bleeding.amount,next.combat.enemyHp);next.combat.enemyHp-=damage;record({kind:'status',damage,text:`출혈로 ${monster.name}에게 ${damage} 피해를 입혔습니다.`})}
  if(next.combat.enemyHp===0)victory()
 }
 if(next.combat.status==='escaped')return {state:next,playerState,actionState,lines,events}
 if(next.combat.ward&&!frozen&&!stunned){const ward=next.combat.ward;next.combat.ward=ward.turns>1?{...ward,turns:ward.turns-1}:undefined}
 if(next.combat.shield&&next.combat.shield.remaining<=0)delete next.combat.shield
 next.combat.spellEffects=next.combat.spellEffects?.flatMap(effect=>effect.id==='solar-brand'&&action.type==='magic'&&action.id===effect.id?[effect]:effect.turns>1?[{...effect,turns:effect.turns-1}]:[])
 next.combat.effects=next.combat.effects.map(effect=>({...effect,turns:effect.turns-1})).filter(effect=>effect.turns>0)
 if(next.combat.pattern)delete next.combat.pattern.shieldTurns
 return {state:next,playerState,actionState,lines,events}
}
