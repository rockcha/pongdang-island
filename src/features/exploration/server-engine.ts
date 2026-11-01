import {newPractice,equipGear,toggleSpell,usePotion,buyMerchantItem,type PracticeState} from './practice-state'
import {drawFloorMonster,refreshPracticeDoors,practiceFinalBossId} from './campaign'
import {advanceExploration,requiredDoorRoom,needsNameGuardian,meetNameGuardian,finishNameGuardian,enterBossOasis} from './run-state'
import {beginForcedMerchant,enterShopkeeper} from './shop-state'
import {finishForcedMerchant} from './merchant-pity'
import {shopkeeperForRoom} from './shopkeepers'
import {recordRoomEntry} from './room-rules'
import {createRoomVisit,enterRoomVisit,getAdventureRoom,restFully,sphinxPenalty,sphinxTimeLimitSeconds,type RoomVisit} from './adventure-rooms'
import {startMonsterCombat,resolveCombatTurn,type CombatAction,type CombatResult} from './combat-state'
import {acceptChoiceRoom,type ChoiceRoomId} from './choice-room-state'
import {receiveRoomLoot,refreshRoomLoot,drawRoomLoot,sellRoomGear,type RoomLoot} from './room-loot'
import {learnShamanSpell} from './shaman-stock'
import {progressNameStory,canAppeaseNameGuardian,type NameStoryAction} from './name-story'

export const EXPLORATION_ENGINE_VERSION=1
export type ExplorationModel={version:number;state:PracticeState;view:'doors'|'room'|'merchant'|'shaman'|'combat';visit:RoomVisit|null;settled:boolean;quizDeadline?:number;pendingLoot:RoomLoot|null;sequence:number;result?:CombatResult}
export type ExplorationAction=
 |{type:'door';index:number}|{type:'descend'}|{type:'combat';action:CombatAction}
 |{type:'equip';kind:'weapon'|'armor';id:string}|{type:'spell';id:string}|{type:'potion';kind:'health'|'mana'}
 |{type:'buy';id:string;quantity:number}|{type:'learn';id:string}|{type:'sell';kind:'weapon'|'armor';id:string}
 |{type:'search'|'rest'|'contract'|'awaken'|'quiz'|'loot'|'read'}|{type:'answer';index:number}
 |{type:'story';action:NameStoryAction}|{type:'guardian-fight'}
export function newExplorationModel(random=Math.random):ExplorationModel{return {version:EXPLORATION_ENGINE_VERSION,state:newPractice(random,'practice'),view:'doors',visit:null,settled:false,pendingLoot:null,sequence:0}}
function requireAction(ok:unknown):asserts ok {if(!ok)throw Error('INVALID_EXPLORATION_ACTION')}
/** Only actions cross the trust boundary. State, encounters, loot and RNG stay on the server. */
export function applyExplorationAction(previous:ExplorationModel,action:ExplorationAction,now=Date.now(),random=Math.random):ExplorationModel{
 requireAction(previous.version===EXPLORATION_ENGINE_VERSION&&action&&typeof action.type==='string')
 const m:ExplorationModel={...previous,result:undefined};let s=m.state
 requireAction(!s.completed&&s.hp>0)
 const room=m.visit?getAdventureRoom(m.visit.id):null
 const offer=()=>requireAction(m.view==='room'&&room&&!m.settled&&!m.pendingLoot)
 const encounter=(id:Parameters<typeof startMonsterCombat>[1],ambush=false,bossRoom?:'boss-anubis'|'boss-pharaoh')=>{
  const loot=m.visit?.outcome.kind==='monster'?m.visit.outcome.loot:undefined
  const lootSource=m.visit?.id==='chest'?'chest' as const:undefined
  s=startMonsterCombat(bossRoom?recordRoomEntry(s,bossRoom):s,id,{ambush,loot,lootSource,random});m.view='combat';m.visit=null;m.settled=false
 }
 const visit=(id:RoomVisit['id'])=>{m.visit=createRoomVisit(id,s,`${s.market.floor}:${++m.sequence}:${id}`,random);s=enterRoomVisit(s,m.visit);m.view='room';m.settled=false;delete m.quizDeadline}
 switch(action.type){
  case 'door':{
   requireAction(m.view==='doors'&&!m.pendingLoot)
   const required=requiredDoorRoom(s),doors=required?[required]:s.market.doors
   requireAction(Number.isInteger(action.index)&&action.index>=0&&action.index<doors.length)
   const id=doors[action.index],profile=shopkeeperForRoom(id)
   s={...s,door:action.index}
   if(profile){s=s.forcedMerchant?.phase==='pending'?beginForcedMerchant(s,random):enterShopkeeper(s,profile,random);m.view=profile.kind==='equipment'?'merchant':'shaman'}
   else if(id==='monster'||id==='guardian'){
    const selected=s.market.monsterIds?.[action.index]
    s=recordRoomEntry(s,id);encounter(selected&&selected!=='random'?selected:drawFloorMonster(s.market.floor,random,id==='guardian'))
   }else{
    if(id==='nameless-guardian'&&needsNameGuardian(s))s=meetNameGuardian(s)
    const definition=getAdventureRoom(id);requireAction(definition)
    if(definition.kind==='boss')encounter(definition.monsterId!,false,definition.id as 'boss-anubis'|'boss-pharaoh')
    else visit(definition.id)
   }
   break
  }
  case 'descend':{
   requireAction(m.view!=='doors'&&!m.pendingLoot)
   requireAction(!m.quizDeadline||m.settled)
   requireAction(room?.kind!=='sphinx'||m.settled)
   if(s.forcedMerchant?.phase==='active'){s={...finishForcedMerchant(s),door:null};m.view='doors';break}
   let next=enterBossOasis(s)
   if(next!==s){s=next;visit('rest-oasis');break}
   next=finishNameGuardian(s)
   if(next!==s){s={...next,door:null};m.view='doors';m.visit=null;break}
   next=advanceExploration(s,random);requireAction(next!==s)
   s=next;m.visit=null;m.view='doors';m.settled=false;delete m.quizDeadline
   break
  }
  case 'combat':{
   requireAction(m.view==='combat'&&s.combat?.status==='active'&&action.action&&['attack','magic','potion','flee'].includes(action.action.type))
   const result=resolveCombatTurn(s,action.action,random);requireAction(result.state!==s)
   s=result.state;m.result=result
   if(s.combat?.status==='won'&&s.combat.loot&&!s.combat.lootClaimed)m.pendingLoot=refreshRoomLoot(s,s.combat.loot,random)
   break
  }
  case 'equip':
   requireAction(['weapon','armor'].includes(action.kind)&&!m.pendingLoot)
   s=equipGear(s,action.kind,action.id,true);break
  case 'spell':requireAction(!m.pendingLoot);s=toggleSpell(s,action.id);break
  case 'potion':requireAction(['health','mana'].includes(action.kind)&&!s.combat&&!m.pendingLoot);s=usePotion(s,action.kind);break
  case 'buy':requireAction(m.view==='merchant'&&Number.isSafeInteger(action.quantity)&&action.quantity>0&&action.quantity<=9999);s=buyMerchantItem(s,action.id,action.quantity);break
  case 'learn':requireAction(m.view==='shaman');s=learnShamanSpell(s,action.id);break
  case 'sell':requireAction(m.view==='room'&&room?.kind==='scales'&&['weapon','armor'].includes(action.kind));s=sellRoomGear(s,action.kind,action.id);break
  case 'search':
   offer();requireAction(room?.kind==='chest'||room?.kind==='investigate');m.settled=true
   if(m.visit!.outcome.kind==='monster')encounter(m.visit!.outcome.monsterId)
   else if(m.visit!.outcome.kind==='gold')s={...s,gold:s.gold+m.visit!.outcome.gold}
   else if(m.visit!.outcome.kind==='loot')m.pendingLoot=refreshRoomLoot(s,m.visit!.outcome.loot,random)
   break
  case 'rest':offer();requireAction(room?.kind==='rest');s=restFully(s);m.settled=true;break
  case 'read':offer();requireAction(room?.kind==='lore');m.settled=true;break
  case 'contract':offer();requireAction(room?.kind==='choice');s=acceptChoiceRoom(s,room.id as ChoiceRoomId,random);requireAction(s!==m.state);m.settled=true;break
  case 'awaken':offer();requireAction(room?.kind==='giant');encounter(room.monsterId!,true);break
  case 'quiz':offer();requireAction(room?.kind==='sphinx'&&!m.quizDeadline);m.quizDeadline=now+sphinxTimeLimitSeconds*1000;break
  case 'answer':
   offer();requireAction(room?.kind==='sphinx'&&Number.isInteger(action.index)&&action.index>=-1&&action.index<=2)
   // -1 is the explicit sacrifice/timeout choice, available before starting the quiz.
   requireAction(action.index===-1||!!m.quizDeadline)
   if(action.index===-1||now>=(m.quizDeadline??0)||action.index!==m.visit!.question.correct)s=sphinxPenalty(s)
   m.settled=true;break
  case 'story':{
   offer();requireAction(room?.kind==='story')
   const allowed=room.id==='erased-name'?['restore','leave-name']:room.id==='erased-name-record'?['read-record']:['open-gate','claim']
   requireAction(allowed.includes(action.action))
   const next=progressNameStory(s,action.action);requireAction(next!==s);s=next
   if(action.action==='claim')m.pendingLoot=drawRoomLoot(s,'advanced',random)
   m.settled=action.action!=='open-gate';break
  }
  case 'guardian-fight':offer();requireAction(room?.id==='nameless-guardian'&&!canAppeaseNameGuardian(s)&&!s.nameStory?.gateOpened);encounter('nameless-royal-warden');break
  case 'loot':{
   requireAction(m.pendingLoot)
   s=receiveRoomLoot(s,m.pendingLoot);m.pendingLoot=null
   if(s.combat?.status==='won'){
    if(s.combat.monsterId==='nameless-royal-warden')s=progressNameStory(s,'claim')
    s={...s,combat:{...s.combat!,lootClaimed:true}}
   }
   break
  }
  default:throw Error('INVALID_EXPLORATION_ACTION')
 }
 if(m.view==='doors'&&!s.completed&&!requiredDoorRoom(s))s=refreshPracticeDoors(s,random)
 // Final completion can only be produced by the ordinary floor/boss rules above.
 if(s.completed)requireAction(s.market.floor===50&&s.finalBossDefeated&&s.combat?.monsterId===practiceFinalBossId&&s.combat.status==='won')
 m.state=s
 return m
}
