import {applyExplorationAction,newExplorationModel,type ExplorationAction} from '../../src/features/exploration/server-engine'
import {auditAction,blindDoorIndex,prepareLoadout,type AuditPolicy} from './blind-audit'
import {weaponValue,armorValue,seededRandom} from './simulation'
import {floorMerchantGoods,playerMaxHp} from '../../src/features/exploration/practice-state'
import {getAdventureRoom} from '../../src/features/exploration/adventure-rooms'
import {getCombatMonster} from '../../src/features/exploration/monster-patterns'
import {spellMechanics} from '../../src/features/exploration/spell-mechanics'
import {shamanSpells} from '../../src/features/exploration/shaman-stock'
import {canAppeaseNameGuardian} from '../../src/features/exploration/name-story'
import {choiceRoomBlock,type ChoiceRoomId} from '../../src/features/exploration/choice-room-state'
import {gearSaleBlock} from '../../src/features/exploration/room-loot'

/** Every state change uses the actual Edge Function's shared action reducer.
 * The bot never reads an unopened room, future stock, loot outcome or RNG roll.
 */
export function runServerAudit(seed:number,policy:AuditPolicy){
 const random=seededRandom(seed),decisions=seededRandom(seed^0x13579)
 let model=newExplorationModel(random),commands=0,turns=0,battles=0,healthUsed=0,manaUsed=0,spent=0
 const checkpoints:Record<number,{hp:number;gold:number;weapon:string;armor:string}>={}
 let boss:{hp:number;weapon:string;armor:string;health:number;mana:number;turns:number}|undefined
 const send=(action:ExplorationAction)=>{const before=model.state;model=applyExplorationAction(model,action,0,random);commands++;if(action.type==='buy'||action.type==='learn')spent+=before.gold-model.state.gold}
 for(let step=0;step<2500&&!model.state.completed&&model.state.hp>0;step++){
  const s=model.state,floor=s.market.floor
  checkpoints[floor]??={hp:s.hp/playerMaxHp(s),gold:s.gold,weapon:s.weaponId,armor:s.armorId}
  if(model.pendingLoot){send({type:'loot'});continue}
  const desired=prepareLoadout(s)
  if(desired.weaponId!==s.weaponId){send({type:'equip',kind:'weapon',id:desired.weaponId});continue}
  if(desired.armorId!==s.armorId){send({type:'equip',kind:'armor',id:desired.armorId});continue}
  const remove=s.equippedSpells.find(id=>!desired.equippedSpells.includes(id)),add=desired.equippedSpells.find(id=>!s.equippedSpells.includes(id))
  if(remove||add){send({type:'spell',id:(remove??add)!});continue}
  if(model.view==='combat'){
   if(s.combat?.status!=='active'){send({type:'descend'});continue}
   if(!s.combat.turn){battles++;if(s.combat.monsterId==='golden-pharaoh')boss={hp:s.hp,weapon:s.weaponId,armor:s.armorId,health:s.potions.health,mana:s.potions.mana,turns:0}}
   const action=auditAction(s,policy)
   if(action.type==='magic'&&!s.equippedSpells.includes(action.id)){
    if(s.equippedSpells.length===2)send({type:'spell',id:s.equippedSpells[1]})
    send({type:'spell',id:action.id})
   }
   send({type:'combat',action});turns++
   if(action.type==='potion'){if(action.kind==='health')healthUsed++;else manaUsed++}
   if(s.combat.monsterId==='golden-pharaoh')boss!.turns++
   continue
  }
  if(!s.combat&&s.hp<playerMaxHp(s)*.65&&s.potions.health){send({type:'potion',kind:'health'});healthUsed++;continue}
  if(model.view==='doors'){send({type:'door',index:blindDoorIndex(seed,floor,s.forcedMerchant?.phase==='pending'||floor===50||floor===34&&!s.nameStory?.met?1:s.market.doors.length)});continue}
  if(model.view==='merchant'&&policy.shops){
   const potion=()=>['health','mana'].find(kind=>s.potions[kind as 'health'|'mana']<(kind==='health'?policy.healthTarget:policy.spells&&s.spells.length?policy.manaTarget:0)&&s.gold>=100)
   const offers=floorMerchantGoods(s).filter(item=>{
    if(item.kind!=='weapon'&&item.kind!=='armor')return false
    const score=item.kind==='weapon'?weaponValue:armorValue,items=item.kind==='weapon'?s.weapons:s.armor
    return score(item.gear!)>Math.max(...items.map(score))&&item.price<=s.gold
   }).sort((a,b)=>{
    const value=(item:typeof a)=>{const score=item.kind==='weapon'?weaponValue:armorValue,items=item.kind==='weapon'?s.weapons:s.armor;return (score(item.gear!)-Math.max(...items.map(score)))/item.price}
    return value(b)-value(a)
   })
   const kind=potion(),item=offers[0]
   if(kind&&(policy.shopPriority!=='gear'||!item)){send({type:'buy',id:kind+'-potion',quantity:1});continue}
   if(item){send({type:'buy',id:item.id,quantity:1});continue}
  }
  if(model.view==='shaman'&&policy.shops&&policy.spells){
   const power=(id:string)=>{const p=spellMechanics[id];return (p?.damage??0)+(p?.healing??0)+(p?.stun?10:0)}
   const spell=shamanSpells.filter(item=>s.shamanStock?.spellIds.includes(item.id)&&!s.spells.some(x=>x.id===item.id)&&item.learnPrice!<=s.gold).sort((a,b)=>power(b.id)-power(a.id)).find(item=>{
    const p=spellMechanics[item.id];if(!p||!(p.damage||p.healing||p.stun))return false
    return !policy.frugalMagic||!s.spells.some(known=>!!spellMechanics[known.id]?.healing===!!p.healing&&power(known.id)>=power(item.id))
   })
   if(spell){send({type:'learn',id:spell.id});continue}
  }
  const room=model.visit&&getAdventureRoom(model.visit.id)
  if(model.view==='room'&&room&&!model.settled){
   if(room.kind==='rest'){send({type:'rest'});continue}
   if(room.kind==='sphinx'){
    if(!model.quizDeadline){send({type:'quiz'});continue}
    const correct=model.visit!.question.correct,index=decisions()<policy.quizAccuracy?correct:(correct+1)%3
    send({type:'answer',index});continue
   }
   if((room.kind==='chest'||room.kind==='investigate')&&policy.risk!=='skip'){send({type:'search'});continue}
   if(room.kind==='giant'&&(policy.risk==='all'||policy.risk==='prudent'&&weaponValue(s.weapons.find(w=>w.id===s.weaponId)!)>=22&&s.hp>playerMaxHp(s)*.7)){send({type:'awaken'});continue}
   if(room.kind==='choice'&&policy.contracts){
    const id=room.id as ChoiceRoomId
    let accept=id!==policy.denyContract&&!choiceRoomBlock(s,id)
    if(accept&&id!==policy.forceContract){
     if(id==='deep-well')accept=s.hp<playerMaxHp(s)*.65
     if(id==='forbidden-trade')accept=policy.spells&&(policy.risk==='all'||s.hp>=85&&s.spells.length<3)
     if(id==='cursed-gem-eye')accept=policy.risk==='all'||s.hp>playerMaxHp(s)*.8&&weaponValue(s.weapons.find(w=>w.id===s.weaponId)!)>=20
     if(id==='broken-teleport')accept=policy.teleport&&s.hp<playerMaxHp(s)*.65
    }
    if(accept){send({type:'contract'});continue}
   }
   if(room.kind==='story'){
    if(room.id==='erased-name'&&policy.story){send({type:'story',action:'restore'});continue}
    if(room.id==='erased-name-record'&&policy.story){send({type:'story',action:'read-record'});continue}
    if(room.id==='nameless-guardian'){
     if(s.nameStory?.gateOpened){send({type:'story',action:'claim'});continue}
     send(canAppeaseNameGuardian(s)?{type:'story',action:'open-gate'}:{type:'guardian-fight'});continue
    }
   }
  }
  if(room?.kind==='scales'){
   const gear=(['weapon','armor'] as const).flatMap(kind=>(kind==='weapon'?s.weapons:s.armor).filter(item=>!gearSaleBlock(s,kind,item.id)).map(item=>({kind,id:item.id})))[0]
   if(gear){send({type:'sell',...gear});continue}
  }
  send({type:'descend'})
 }
 if(!model.state.completed&&model.state.hp>0)throw Error('Server audit stalled: '+seed+' '+policy.id+' '+model.view)
 const s=model.state
 return {seed,clear:!!s.completed,reached:s.market.floor,deathMonster:s.hp<=0&&s.combat?getCombatMonster(s).name:undefined,hp:s.hp,gold:s.gold,commands,turns,battles,healthUsed,manaUsed,spent,boss,checkpoints}
}
