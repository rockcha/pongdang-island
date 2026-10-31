import {progressNameStory} from './name-story'
import {finishForcedMerchant} from './merchant-pity'
import {beginForcedMerchant} from './shop-state'
import {formatBasicAttack} from './attack-roll'
import {drawFloorMonster,practiceFinalFloor,practiceFinalBossId,practiceFinalBossRoom,type ExplorationMode} from './campaign'
import {advanceExploration,canLeaveRoom,needsFinalBoss,enterBossOasis,needsNameGuardian,meetNameGuardian,finishNameGuardian} from './run-state'
import {combatTimings} from './combat-timing'
import {HealthMeter} from './health-meter'
import {AdventureRoom} from './adventure-room'
import {createRoomVisit,enterRoomVisit,getAdventureRoom,type RoomVisit} from './adventure-rooms'
import {LootDialog} from './loot-dialog'
import {receiveRoomLoot,refreshRoomLoot,lootDiscoveryText,lootAcquiredText,type RoomLoot} from './room-loot'
import {PracticeInventory,type InventoryTab} from './practice-inventory'
import {PotionChoiceDialog} from './potion-choice-dialog'
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react'
import {createPortal} from 'react-dom'
import {TypedText} from './typed-text'
import {ChoiceLog} from './choice-log'
import {StatusScreenEffects} from './status-screen-effects'
import {ExplorerCombatStats} from './combat-stats'
import {PlayerAilments} from './ailments'
import {armorStats} from './armor-catalog'
import {createExplorationAudio} from './exploration-audio'
import {ExplorationSoundSettings} from './sound-settings'
import {ArrowDown,Check,Coins,Heart,History,LogOut,Shield,Sparkles,Swords,Droplets} from 'lucide-react'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {GameLeaveGuard} from '@/features/arcade/game-leave-guard'
import {hasOpenOverlay} from '@/components/overlay-back'
import {roomTypes,type RoomTypeId} from './room-preview'
import {MerchantRoom} from './merchant-room'
import {npcLineText} from './npc-dialogue'
import {ShamanRoom} from './shaman-room'
import {getShopkeeper,shopkeeperForRoom} from './shopkeepers'
import {enterShopkeeper} from './shop-state'
import type {ConversationMemory} from './use-npc-conversation'
import {ScorpionRoom} from './scorpion-room'
import {drawMonster,regularMonsters,getMonster,getFloorMonster,type MonsterId} from './monster-catalog'
import {resolveCombatTurn,startMonsterCombat,type CombatAction,type CombatEvent,type CombatResult,type TurnFeedback} from './combat-state'
import {DoorSprite,doorSkins,drawFloorArt,dungeonBackgrounds} from './dungeon-art'
import descentSprite from './assets/pharaoh-descent-8f.png'
import {newPractice,type Gear,type PotionKind,playerMaxHp,playerManaMax,merchantPotions,potionBlock,usePotion as consumePotion} from './practice-state'

export const doorArrivalLines=[
 '어? 문이 3개나 있네... 어디로 들어가지?',
 '문이 세 개라니... 어느 쪽으로 가야 할까?',
 '음... 세 개 다 수상한데. 어디부터 살펴보지?',
 '여기서 길이 갈리네... 어떤 문을 골라야 하지?',
 '드디어 도착! 그런데 문이 세 개네... 어디가 좋을까?',
] as const
export const encounterWonderLines=[
 '이곳엔 무엇이 기다리고 있을까?',
 '잠깐… 안쪽에서 무슨 소리가 들려.',
 '공기가 달라졌어. 조심해서 가자.',
 '누군가 있는 것 같은데…?',
 '이 발자국은… 아직 새것이야.',
 '등불 너머로 그림자가 움직였어.',
 '너무 조용한데… 긴장을 늦추지 말자.',
 '모래가 흩어져 있어. 무언가 지나갔나?',
 '저 안쪽에 보이는 건 뭐지?',
 '이상한 기척이 느껴져. 준비해야겠어.',
] as const
export const scorpionArrivalLines=['발밑의 모래가 꿈틀거리더니, 거대한 모래 전갈이 모습을 드러냈다.','어둠 속에서 집게가 부딪히는 소리가 들린다. 모래 전갈이 천천히 다가온다.','고요하던 모래 위로 긴 그림자가 드리운다. 꼬리를 치켜든 모래 전갈이다.','벽 뒤에서 바스락거리는 소리… 모래를 헤치고 거대한 전갈이 기어 나왔다.'] as const
 type StoryLine={text:string;spoken:boolean;events?:CombatEvent[]}
const doors=[{name:'모래에 묻힌 문',rune:'𓂀',hint:'문틈으로 마른 모래가 흘러내립니다.',detail:'모래 위에는 오래된 발자국만 남아 있습니다. 누군가 먼저 이곳을 지나갔을까요?'},{name:'황금 문양의 문',rune:'𓆣',hint:'빛바랜 황금 문양이 희미하게 빛납니다.',detail:'황금빛 풍뎅이가 새겨져 있습니다. 문 너머에서는 낮고 규칙적인 울림이 들립니다.'},{name:'물소리가 나는 문',rune:'𓈖',hint:'고요한 물방울 소리가 들려옵니다.',detail:'문 아래로 차가운 물기가 번집니다. 어둠 속에서 물방울이 천천히 떨어지고 있습니다.'}]
export function gearStats(item:Gear){return (item.attack!==undefined?`공격력 ${formatBasicAttack(item.attack,item.attackVariance)} · 치명타 ${item.critical}%`:armorStats(item))+(item.attack!==undefined&&item.escapeBonus?` · 도망 +${item.escapeBonus}%p`:'')}

export function ExplorationGame({nickname,avatarPath,onLeave,mode='test'}:{mode?:ExplorationMode;nickname:string;avatarPath?:string|null;onLeave:()=>void}){
 const audio=useRef<ReturnType<typeof createExplorationAudio>|null>(null)
 useEffect(()=>{audio.current=createExplorationAudio();audio.current.startMusic();return()=>{audio.current?.dispose();audio.current=null}},[])
 const [state,setState]=useState(()=>mode==='practice'?newPractice(Math.random,'practice'):newPractice()),[descending,setDescending]=useState(true),[bag,setBag]=useState(false),[leave,setLeave]=useState(false)
 const [floorArrival,setFloorArrival]=useState<number|null>(null)
 const [arrivalLine]=useState(()=>doorArrivalLines[Math.floor(Math.random()*doorArrivalLines.length)])
 const [bagTab,setBagTab]=useState<InventoryTab>('weapon')
 const [showHistory,setShowHistory]=useState(false)
 const [potionsOpen,setPotionsOpen]=useState(false)
 const [message,setMessage]=useState<StoryLine>({text:'지하 1층으로 내려가는 중...',spoken:false})
 const [history,setHistory]=useState<StoryLine[]>([])
 const [conversationMemory]=useState<ConversationMemory>(()=>new Map())
 const lastInscription=useRef<string|undefined>(undefined)
 const [doorTypes,setDoorTypes]=useState<RoomTypeId[]>(()=>state.market.doors)
 const [roomVisit,setRoomVisit]=useState<RoomVisit|null>(null),[pendingLoot,setPendingLoot]=useState<RoomLoot|null>(null)
 const visitSequence=useRef(0),pendingLootRef=useRef<RoomLoot|null>(null)
 const [encounterAmbush,setEncounterAmbush]=useState(false)
 const [encounterLoot,setEncounterLoot]=useState<RoomLoot|undefined>(undefined)
 const [encounterLootSource,setEncounterLootSource]=useState<'chest'|undefined>()
 const lastWonder=useRef<string|null>(null)
 const isPractice=mode==='practice'
 const floor=state.market.floor
 const [merchant,setMerchant]=useState(false),[shaman,setShaman]=useState(false)
 const activeShopkeeper=getShopkeeper(shaman?(state.shamanStock?.shopkeeperId??'nadim'):(state.market.shopkeeperId??'hasan'))
 const [floorArt,setFloorArt]=useState(drawFloorArt)
 const [opening,setOpening]=useState<{index:number;type:RoomTypeId;monsterId:MonsterId|'random'}|null>(null)
 const [encounter,setEncounter]=useState<'wonder'|'reveal'|null>(null)
 const [encounterLine,setEncounterLine]=useState('')
 const [doorMonsters,setDoorMonsters]=useState<(MonsterId|'random')[]>(()=>state.market.monsterIds??['random','random','random'])
 const [encounterMonster,setEncounterMonster]=useState<MonsterId>('sand-scorpion')
 const [encounterBackground,setEncounterBackground]=useState<string|null>(null)
 const musicScene=merchant||shaman?'merchant':state.combat?.status==='active'?'combat':'exploration'
 useEffect(()=>{audio.current?.startMusic(musicScene)},[musicScene])
 const currentMonster=useMemo(()=>getFloorMonster(state.combat?.monsterId??encounterMonster,floor,isPractice),[state.combat?.monsterId,encounterMonster,floor,isPractice])
 const entryLock=useRef(false)
 const turnLock=useRef(false),liveState=useRef(state);liveState.current=state
 const [combatBusy,setCombatBusy]=useState(false)
 const [pendingTurn,setPendingTurn]=useState<{result:CombatResult;action:CombatAction['type'];potionKind?:PotionKind;id:number}|null>(null)
 const [feedback,setFeedback]=useState<TurnFeedback|null>(null)
 const turnSequence=useRef(0)
 function tell(text:string,spoken=false){const line={text,spoken};setMessage(line);setHistory(previous=>[...previous,line])}
 const canManageEquipment=!descending&&!opening&&!encounter&&!combatBusy&&(!state.combat||state.combat.status==='active')
 function openInventory(tab:InventoryTab){if(!canManageEquipment||turnLock.current)return;setBagTab(tab);setBag(true)}
 const requestExit=useRef(()=>setLeave(true));requestExit.current=()=>state.completed?onLeave():setLeave(true)
 const mounted=useRef(true)
 useEffect(()=>{
  mounted.current=true
  const root=document.getElementById('root'),wasInert=root?.inert,overflow=document.body.style.overflow
  if(root)root.inert=true
  document.body.style.overflow='hidden'
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!hasOpenOverlay()){event.preventDefault();requestExit.current()}}
  let wasFullscreen=!!document.fullscreenElement
  const fullscreen=()=>{if(document.fullscreenElement){wasFullscreen=true;if(!mounted.current)void document.exitFullscreen().catch(()=>{})}else if(wasFullscreen){wasFullscreen=false;requestExit.current()}}
  window.addEventListener('keydown',key);document.addEventListener('fullscreenchange',fullscreen)
  return()=>{
   mounted.current=false
   if(root)root.inert=wasInert??false
   document.body.style.overflow=overflow
   window.removeEventListener('keydown',key);document.removeEventListener('fullscreenchange',fullscreen)
   queueMicrotask(()=>{
    if(mounted.current)return
    if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{})
   })
  }
 },[])
 useEffect(()=>{
  if(!descending)return
  setFloorArrival(null)
  audio.current?.startDescent()
  const timer=setTimeout(()=>{setDescending(false);setFloorArrival(floor);tell(isPractice&&floor===practiceFinalFloor?'마지막 문지기가 기다린다. 어느 방을 택하든 황금왕 라세프를 쓰러뜨려야 돌아갈 수 있어.':arrivalLine,true)},window.matchMedia('(prefers-reduced-motion: reduce)').matches?100:4000)
  return()=>{clearTimeout(timer);audio.current?.stopDescent()}
 },[descending,floor,arrivalLine])
 useEffect(()=>{
  if(floorArrival===null)return
  const timer=setTimeout(()=>setFloorArrival(null),isPractice?1800:5600)
  return()=>clearTimeout(timer)
 },[floorArrival,isPractice])
 useEffect(()=>{
  if(descending||state.forcedMerchant?.phase!=='pending')return
  const next=beginForcedMerchant(liveState.current)
  liveState.current=next;setState(next);setMerchant(true);setShaman(false)
  tell('갈림길 앞에서 보급 상인을 만났다. 물품을 살펴본 뒤 이 층의 탐험을 계속할 수 있다.')
 },[descending,state.forcedMerchant?.phase])
 useEffect(()=>{
  if(descending||state.forcedMerchant||!needsNameGuardian(liveState.current))return
  const met=meetNameGuardian(liveState.current),visit=createRoomVisit('nameless-guardian',met,`34:guardian:${++visitSequence.current}`)
  const next=enterRoomVisit(met,visit);liveState.current=next;setState(next);setRoomVisit(visit);setMerchant(false);setShaman(false);tell('아래층으로 이어지는 길목을 거대한 왕실 수문장이 지키고 있다.')
 },[descending,state.market.floor,state.forcedMerchant,state.nameStory?.met])
 function descend(){
  if(liveState.current.forcedMerchant?.phase==='active'){const next=finishForcedMerchant(liveState.current);liveState.current=next;setState(next);setMerchant(false);tell(`지하 ${next.market.floor}층의 문을 선택해주세요.`);return}
  if(pendingLootRef.current)return
  const oasis=enterBossOasis(liveState.current)
  if(oasis!==liveState.current){const visit=createRoomVisit('rest-oasis',oasis,`${floor}:boss-rest:${++visitSequence.current}`);const next=enterRoomVisit(oasis,visit);liveState.current=next;setState(next);setFeedback(null);setPendingTurn(null);turnLock.current=false;setCombatBusy(false);setRoomVisit(visit);setMerchant(false);setShaman(false);tell('보스가 지키던 길 너머에서 맑은 오아시스를 발견했다.');return}
  const checkpoint=finishNameGuardian(liveState.current)
  if(checkpoint!==liveState.current){liveState.current=checkpoint;setState(checkpoint);setRoomVisit(null);setFeedback(null);setPendingTurn(null);turnLock.current=false;setCombatBusy(false);tell('수문장의 길을 지나 지하 34층의 문 앞에 도착했다.');return}
  if(needsFinalBoss(liveState.current)&&canLeaveRoom(liveState.current)){turnLock.current=false;setCombatBusy(false);setPendingTurn(null);setFeedback(null);setMerchant(false);setShaman(false);beginEncounter(practiceFinalBossId,false,practiceFinalBossRoom);return}
  const next=advanceExploration(liveState.current);if(next===liveState.current)return
  if(next.completed){turnLock.current=false;setCombatBusy(false);setPendingTurn(null);setFeedback(null);liveState.current=next;setState(next);return}
  setRoomVisit(null);setEncounterBackground(null);setPendingLoot(null);pendingLootRef.current=null
  turnLock.current=false;setCombatBusy(false);setPendingTurn(null)
  setFeedback(null)
  setFloorArt(drawFloorArt());setOpening(null);entryLock.current=false
  const market=next.market
  setDoorMonsters(market.monsterIds??['random','random','random'])
  setDoorTypes(market.doors);setMerchant(false);setShaman(false);setState(next);liveState.current=next;setDescending(true)
  tell(`지하 ${next.market.floor}층으로 내려가는 중...`)
 }
 function beginEncounter(id:MonsterId,ambush=false,bossRoom?:'boss-anubis'|'boss-pharaoh'){
  setEncounterLootSource(roomVisit?.id==='chest'&&roomVisit.outcome.kind==='monster'?'chest':undefined);const monster=getMonster(id),lines=encounterWonderLines.filter(line=>line!==lastWonder.current),wonder=lines[Math.floor(Math.random()*lines.length)];lastWonder.current=wonder;setEncounterLoot(!bossRoom&&roomVisit?.outcome.kind==='monster'?roomVisit.outcome.loot:undefined);setEncounterBackground(bossRoom?getAdventureRoom(bossRoom)!.background:roomVisit?getAdventureRoom(roomVisit.id)!.background:null);setRoomVisit(null);setEncounterAmbush(ambush);setEncounterMonster(id);setEncounterLine(id==='sand-scorpion'?scorpionArrivalLines[Math.floor(Math.random()*scorpionArrivalLines.length)]:monster.arrival);setEncounter('wonder');tell(ambush?'잠든 틈을 노려 조심스럽게 다가간다…':wonder,true)
 }
 function openLoot(loot:RoomLoot){if(pendingLootRef.current)return;const reward=refreshRoomLoot(liveState.current,loot);pendingLootRef.current=reward;setPendingLoot(reward);if(liveState.current.combat?.status==='won')tell(lootDiscoveryText(reward))}
 function finishLoot(replaceId?:string,decline=false){
  const loot=pendingLootRef.current;if(!loot)return
  const previous=liveState.current,next=decline?previous:receiveRoomLoot(previous,loot,replaceId)
  if(!decline&&next===previous)return
  const collected=next.combat?.status==='won'&&next.combat.monsterId==='nameless-royal-warden'?progressNameStory(next,'claim'):next
  const completed=collected.combat?.status==='won'?{...collected,combat:{...collected.combat,lootClaimed:true}}:collected
  pendingLootRef.current=null;setPendingLoot(null);liveState.current=completed;setState(completed)
  tell(decline?'장비를 교체하지 않고 발견한 물품을 두고 간다.':lootAcquiredText(loot))
  if(!decline){audio.current?.unlock();audio.current?.play('loot')}
 }
 function enterRoom(){
  if(state.door===null||entryLock.current||descending||state.forcedMerchant||needsNameGuardian(state)||state.guardianCheckpoint)return
  audio.current?.unlock();audio.current?.play('door')
  entryLock.current=true;setOpening({index:state.door,type:doorTypes[state.door],monsterId:doorMonsters[state.door]});tell('돌문이 천천히 열립니다...')
 }
 useEffect(()=>{
  if(!opening)return
  const timer=setTimeout(()=>{
   const profile=shopkeeperForRoom(opening.type)
   if(profile){const next=enterShopkeeper(liveState.current,profile);liveState.current=next;setState(next);setMerchant(profile.kind==='equipment');setShaman(profile.kind==='magic')}
   else if(opening.type==='monster'||opening.type==='guardian'){const monster=opening.monsterId==='random'?(isPractice?getMonster(drawFloorMonster(floor,Math.random,opening.type==='guardian')):drawMonster()):getMonster(opening.monsterId);beginEncounter(monster.id)}
   else {const room=getAdventureRoom(opening.type);if(room?.kind==='boss')beginEncounter(room.monsterId,false,room.id);else if(room){const visit=createRoomVisit(room.id,liveState.current,`${floor}:${++visitSequence.current}:${room.id}`,Math.random,lastInscription.current);const next=enterRoomVisit(liveState.current,visit);liveState.current=next;setState(next);setRoomVisit(visit);tell(visit.entry)}}
   setOpening(null);entryLock.current=false
  },window.matchMedia('(prefers-reduced-motion: reduce)').matches?100:1100)
  return()=>clearTimeout(timer)
 },[opening])
 useEffect(()=>{
  if(!encounter)return
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const timer=setTimeout(()=>{
   if(encounter==='wonder'){audio.current?.play('arrival');setEncounter('reveal');tell(encounterLine)}
   else {const next=startMonsterCombat(liveState.current,encounterMonster,{ambush:encounterAmbush,loot:encounterLoot,lootSource:encounterLootSource});liveState.current=next;setState(next);setEncounter(null)}
  },reduced?100:encounter==='wonder'?2200:3200)
  return()=>clearTimeout(timer)
 },[encounter,encounterLine,encounterMonster,encounterAmbush,encounterLoot,encounterLootSource])
 useEffect(()=>{
  if(!pendingTurn)return
  const player=setTimeout(()=>{
   audio.current?.play(pendingTurn.action==='attack'&&pendingTurn.result.events.some(event=>event.kind==='player'&&event.critical)?'critical':pendingTurn.action==='magic'?'magic':pendingTurn.action==='potion'?(pendingTurn.potionKind==='mana'?'mana-potion':'health-potion'):pendingTurn.action)
   const escaped=pendingTurn.result.state.combat?.status==='escaped'
   const playerState=escaped?pendingTurn.result.state:pendingTurn.result.playerState
   liveState.current=playerState;setState(playerState)
   setFeedback({id:pendingTurn.id,phase:'player',events:pendingTurn.result.events,action:pendingTurn.action})
   const events=pendingTurn.result.events.filter(event=>event.phase!=='reply'&&(event.kind==='player'||event.kind==='system'||(event.kind==='status'&&!event.damage&&!event.source)||(event.effect==='bleed'&&event.target==='player'&&event.damage!==undefined)))
   setMessage({text:events.map(event=>event.text).join('\n'),spoken:false,events})
   if(escaped)setHistory(previous=>[...previous,{text:pendingTurn.result.lines.join('\n'),spoken:false,events:pendingTurn.result.events}])
  },combatTimings.player)
  const counter=setTimeout(()=>{
   if(!pendingTurn.result.events.some(event=>event.kind==='monster'||event.kind==='defense'))return
   setFeedback({id:pendingTurn.id,phase:'counter',events:pendingTurn.result.events,action:pendingTurn.action})
   const stopped=pendingTurn.result.events.some(event=>event.kind==='defense'&&(event.effect==='freeze'||event.effect==='stun'))
   setMessage({text:stopped?`${currentMonster.name}의 움직임이 멈췄다…`:`${currentMonster.name} · ${[currentMonster.basic,...currentMonster.magic].find(move=>move.id===pendingTurn.result.events.find(event=>event.moveId)?.moveId)?.name??currentMonster.basic.name} 준비…`,spoken:false})
  },combatTimings.counter)
  const reply=setTimeout(()=>{
   const response=pendingTurn.result.events.find(event=>event.kind==='monster'||event.kind==='defense')
   if(response)audio.current?.play(response.attackType==='magic'?'enemy-magic':response.kind==='monster'?'hit':'defense')
   liveState.current=pendingTurn.result.state;setState(pendingTurn.result.state)
   setFeedback({id:pendingTurn.id,phase:'reply',events:pendingTurn.result.events,action:pendingTurn.action})
   const line={text:pendingTurn.result.lines.join('\n'),spoken:false,events:pendingTurn.result.events}
   setMessage(line);setHistory(previous=>[...previous,line])
  },combatTimings.reply)
  const done=setTimeout(()=>{turnLock.current=false;setCombatBusy(false);setPendingTurn(null)},combatTimings.done)
  return()=>{clearTimeout(player);clearTimeout(counter);clearTimeout(reply);clearTimeout(done)}
 },[pendingTurn,currentMonster])
 function combatAction(action:CombatAction){
  if(turnLock.current)return false
  const result=resolveCombatTurn(liveState.current,action)
  if(result.state===liveState.current)return false
  audio.current?.unlock()
  setBag(false);turnLock.current=true;setCombatBusy(true)
  const id=++turnSequence.current
  setFeedback({id,phase:'prepare',events:result.events,action:action.type});setPendingTurn({result,action:action.type,potionKind:action.type==='potion'?action.kind:undefined,id})
  setMessage({text:action.type==='attack'?'무기를 고쳐 쥐고, 공격할 틈을 노린다…':action.type==='magic'?'마력을 모으고 있다…':action.type==='potion'?'포션의 마개를 열고 있다…':'빠져나갈 틈을 살핀다…',spoken:false})
  return true
 }
 const weapon=state.weapons.find(item=>item.id===state.weaponId)!,armor=state.armor.find(item=>item.id===state.armorId)!
 function drinkPotion(kind:PotionKind){
  if(quickPotionBlock(kind))return false
  if(liveState.current.combat?.status==='active')return combatAction({type:'potion',kind})
  const previous=liveState.current,next=consumePotion(previous,kind)
  if(next===previous)return false
  liveState.current=next;setState(next)
  audio.current?.unlock();audio.current?.play(kind==='health'?'health-potion':'mana-potion')
  const potion=merchantPotions.find(item=>item.kind===kind)!
  tell(`${potion.name}을 마셨다. ${kind==='health'?'체력':'마나'} ${kind==='health'?next.hp-previous.hp:next.mp-previous.mp} 회복!`,true)
  return true
 }
 function quickPotionBlock(kind:PotionKind){return descending||opening||encounter||combatBusy?'행동이나 이동이 끝난 뒤 사용해요.':state.combat&&state.combat.status!=='active'?'지금은 사용할 수 없어요.':potionBlock(state,kind,state.combat?.status==='active')}
 const latestLog=message.events?.at(-1)?.text??message.text
 const lastEvent=message.events?.at(-1)
 const logSpeaker=message.spoken?nickname:merchant||shaman?activeShopkeeper.name:lastEvent?.source??(lastEvent?.kind==='monster'||feedback?.phase==='counter'?currentMonster.name:lastEvent?.kind==='player'||feedback?.phase==='prepare'?nickname:'탐험')
 function chooseDoor(index:number){setState(previous=>({...previous,door:index}));tell(doors[index].detail)}
 if(state.completed)return createPortal(<section className="exploration-game exploration-run-complete" aria-label="파라오 지하 탐험"><div><span>EXPLORATION COMPLETE</span><h1>{practiceFinalFloor}층 탐험 완료</h1><p>왕릉의 마지막 왕, 황금왕 라세프를 쓰러뜨렸습니다.</p><dl><div><dt>남은 체력</dt><dd>{state.hp} / {playerMaxHp(state)}</dd></div><div><dt>남은 골드</dt><dd>{state.gold.toLocaleString()}</dd></div><div><dt>발견한 물품</dt><dd>{Math.max(0,(state.acquiredIds?.length??0)-2)}</dd></div></dl><button onClick={onLeave}>메인 화면으로</button></div></section>,document.body)
 return createPortal(<section className={`exploration-game ${isPractice?'is-practice':''} ${state.combat?.status==='lost'?'is-dead':''}`} aria-label="파라오 지하 탐험">
  <StatusScreenEffects state={state} feedback={feedback}/>
  <GameLeaveGuard active practice description="탐험 진행과 연습 물품은 저장되지 않아요. 저장하지 않고 나가시겠습니까?"/>
  <header inert={state.combat?.status==='lost'} className="exploration-top exploration-compact-header" aria-label="탐험 위치와 메뉴"><div className="exploration-toolbar">
 <div className="exploration-map-location"><h1>파라오의 황금해</h1><span className="exploration-level-chip"><ArrowDown size={10}/>지하 <b>{floor}</b>층{isPractice&&<small> / {practiceFinalFloor}</small>}</span></div>
 <div className="exploration-header-actions"><span key={state.gold} className={`exploration-gold ${feedback?.phase==='reply'&&feedback.events.some(event=>event.kind==='reward')?'has-reward':''}`} aria-label="탐험용 골드"><Coins size={13}/>{state.gold.toLocaleString()}</span><ExplorationSoundSettings onPreview={()=>{audio.current?.unlock();audio.current?.play('attack')}}/><button onClick={()=>setShowHistory(true)} aria-label="탐험 기록" title="탐험 기록"><History size={14}/></button><button onClick={()=>setLeave(true)} aria-label="탐험 나가기" title="탐험 나가기"><LogOut size={15}/></button></div>
 </div><section className="exploration-player-status" aria-label="탐험가 상태">
     {feedback?.phase==='reply'&&feedback.events.some(event=>event.kind==='monster')&&<span key={feedback.id} className="exploration-player-damage" aria-hidden="true">−{feedback.events.find(event=>event.kind==='monster')?.damage}</span>}

 <div className="exploration-status-main"><div className="exploration-avatar-ring"><PlayerAvatar nickname={nickname} path={avatarPath} className="size-10"/></div><div className="exploration-vitals"><strong className="exploration-player-name">{nickname}{state.combat?.status==='active'&&<small>전투 중</small>}</strong>
 <div className="exploration-resource-row"><div className="exploration-meter exploration-hp"><span><Heart size={11}/><span className="sr-only">체력</span></span><HealthMeter label="탐험가 체력" max={playerMaxHp(state)} value={state.hp}/><span>{state.hp}<small>/{playerMaxHp(state)}</small></span></div></div>
 <div className="exploration-resource-row"><div className="exploration-meter exploration-mp"><span><Droplets size={11}/><span className="sr-only">마나</span></span><progress aria-label="탐험가 마나" max={playerManaMax(state)} value={state.mp}/><span>{state.mp}<small>/{playerManaMax(state)}</small></span></div></div>
 </div></div><PlayerAilments state={state}/>{state.soulLantern&&<div className="exploration-contract-badges"><span title="부활 후에도 최대 마나 감소는 유지됩니다.">영혼의 등불 · {state.soulLantern==='ready'?'부활 1회':'소진'}</span></div>}<ExplorerCombatStats state={state}/>
 </section></header>
  <div className={`exploration-scene ${!descending?'has-dungeon-art':''} ${opening?'is-entering-room':''} is-close-scene`} data-shopkeeper={merchant||shaman?activeShopkeeper.id:undefined} data-scene={merchant||shaman?'merchant':roomVisit?.id??encounterBackground?.split('/').pop()?.replace(/\.webp$/,'')??'dungeon'} data-background={floorArt.background} data-entry-door={opening?.index} style={!descending?{backgroundImage:`linear-gradient(#07101430,#07101410 55%,#07101480),url(${shaman||merchant?activeShopkeeper.background:roomVisit?getAdventureRoom(roomVisit.id)!.background:encounterBackground??dungeonBackgrounds[floorArt.background]})`}:undefined}>{!isPractice&&!descending&&!merchant&&!shaman&&!roomVisit&&!state.combat&&!encounter&&<div className="exploration-room-picker">{doorTypes.map((type,index)=><label key={index}><span>{index+1}번 문</span><select disabled={!!opening} aria-label={`${index+1}번 문 방 유형`} value={type==='monster'&&doorMonsters[index]!=='random'?`monster:${doorMonsters[index]}`:(shopkeeperForRoom(type)?.roomId??type)} onChange={event=>{const selected=event.target.value;setDoorTypes(previous=>previous.map((value,i)=>i===index?(selected.startsWith('monster:')?'monster':selected as RoomTypeId):value));setDoorMonsters(previous=>previous.map((value,i)=>i===index?(selected.startsWith('monster:')?selected.slice(8) as MonsterId:'random'):value))}}>{roomTypes.map(room=><option key={room.id} value={room.id}>{room.id==='monster'?'몬스터 방 · 무작위':room.name}</option>)}<optgroup label="몬스터 선택">{regularMonsters.map(monster=><option key={monster.id} value={`monster:${monster.id}`}>{monster.name}</option>)}</optgroup></select></label>)}</div>}{encounter?<section className={`exploration-encounter ${encounter==='reveal'?'is-revealing':''}`} aria-label="몬스터 방 등장"><img src={currentMonster.image} alt={`${currentMonster.name} 등장`}/></section>:state.combat?<ScorpionRoom logEvent={message.events?.at(-1)} onLootReady={openLoot} onReward={()=>audio.current?.play('gold')} speaker={logSpeaker} latestLog={latestLog} state={state} feedback={feedback} busy={combatBusy} onAction={combatAction} onDescend={descend} onReturnToMain={onLeave}/>:shaman?<ShamanRoom conversationMemory={conversationMemory} key={activeShopkeeper.id} latestLog={latestLog} state={state} onChange={setState} onDescend={descend} onTalk={tell}/>:merchant?<MerchantRoom onEquipChange={()=>{audio.current?.unlock();audio.current?.play('equip')}} returnToDoors={state.forcedMerchant?.phase==='active'} conversationMemory={conversationMemory} key={activeShopkeeper.id} latestLog={latestLog} state={state} onChange={setState} onDescend={descend} onTalk={tell}/>:roomVisit?<AdventureRoom onQuizClock={playing=>{if(playing)audio.current?.startQuizClock();else audio.current?.stopQuizClock()}} key={roomVisit.key} visit={roomVisit} state={state} onChange={setState} onTalk={text=>{if(roomVisit.id==='warning-wall'&&text===roomVisit.progress)lastInscription.current=text;tell(text)}} onDescend={descend} onEncounter={beginEncounter} onLoot={openLoot} onGold={()=>audio.current?.play('gold')}/>:descending?<div className="exploration-descent-scene" role="status" aria-label={`지하 ${floor}층으로 내려가는 중`}><StairwayIllustration/><section className="exploration-warning" aria-label="층 이동 안내"><p>지하 {floor}층으로 내려가는 중</p></section></div>:<div className={`exploration-doors ${opening?'is-focusing':''}`} style={{'--door-pan':`${opening?(1-opening.index)*100/3:0}%`,transformOrigin:`${opening?((opening.index+.5)/3)*100:50}% 45%`} as CSSProperties} role="group" aria-label={`지하 ${floor}층의 세 문`}>{doors.map((door,index)=><button key={door.name} className="exploration-choice" disabled={!!opening} aria-pressed={state.door===index} onClick={()=>chooseDoor(index)}><DoorSprite skin={floorArt.doors[index]} opening={opening?.index===index}/><span className="exploration-choice-copy"><small>0{index+1}</small><strong>{doorSkins[floorArt.doors[index]].name}</strong>{isPractice&&<small>{doors[index].detail}</small>}</span>{state.door===index?<Check size={14}/>:<span className="exploration-choice-arrow" aria-hidden="true">›</span>}</button>)}</div>}{!descending&&!merchant&&!shaman&&!roomVisit&&!state.combat&&!encounter&&<div className="exploration-door-controls"><ChoiceLog speaker={logSpeaker} text={latestLog} nickname={message.spoken?nickname:undefined} avatarPath={avatarPath}/><button className="exploration-preview-enter" disabled={state.door===null||!!opening} onClick={enterRoom} aria-label={state.door===null?'문을 선택해주세요':isPractice?'선택한 문으로 입장':`${roomTypes.find(room=>room.id===doorTypes[state.door!])?.name} · 입장`}>{state.door===null?"문을 선택해주세요":(doorSkins[floorArt.doors[state.door]].name)+"으로 들어가기"}</button></div>}{!!encounter&&<ChoiceLog speaker={logSpeaker} className="exploration-transit-log" text={latestLog} nickname={message.spoken?nickname:undefined} avatarPath={avatarPath} label="탐험 로그"/>}{!descending&&!merchant&&!shaman&&!roomVisit&&!state.combat&&!encounter&&!opening&&floorArrival!==null&&<div key={floorArrival} className="exploration-floor-toast" role="status" aria-label={`지하 ${floorArrival}층 도착`}><span>지하 <b>{floorArrival}</b>층</span></div>}</div>
  <section inert={state.combat?.status==='lost'} className="exploration-equipment-dock" aria-label="장비와 마법 관리"><div className="exploration-equipped" aria-label="현재 장비와 마법">     <button disabled={!canManageEquipment} className="exploration-equipment" onClick={()=>openInventory('weapon')} title={`${weapon.name} · ${gearStats(weapon)}`} aria-label="주무기 교체">{weapon.image?<img className="exploration-equipped-weapon" src={weapon.image} alt=""/>:<Swords size={17}/>}<span><small>주무기</small><strong>{weapon.name}</strong></span></button>
     <button disabled={!canManageEquipment} className="exploration-equipment" onClick={()=>openInventory('armor')} title={`${armor.name} · ${gearStats(armor)}`} aria-label="주보호구 교체">{armor.image?<img className="exploration-equipped-weapon" src={armor.image} alt=""/>:<Shield size={17}/>}<span><small>주보호구</small><strong>{armor.name}</strong></span></button>
     {[0,1].map(index=>{const spell=state.spells.find(item=>item.id===state.equippedSpells[index]);return <button disabled={!canManageEquipment} className={`exploration-spell-slot ${spell?'is-equipped':'is-empty'}`} key={index} title={spell?`${spell.name} · MP ${spell.mana}`:undefined} aria-label={spell?`${spell.name} 교체 · 마법 ${index+1}`:`마법 ${index+1} 장착`} onClick={()=>openInventory('magic')}>{spell?.image?<img className="exploration-equipped-weapon" src={spell.image} alt=""/>:<span className="exploration-empty-spell-sigil" aria-hidden="true"><Sparkles size={17}/><b>+</b></span>}<span><small>마법 {index+1}</small><strong>{spell?.name??'마법 장착'}</strong>{spell&&<span className="exploration-spell-cost">MP {spell.mana}</span>}</span></button>})}
<button className="exploration-potion-loadout" aria-label="포션 보관함" disabled={descending||!!opening||!!encounter||!!state.combat||combatBusy} onClick={()=>setPotionsOpen(true)}><div>{merchantPotions.map(potion=><span key={potion.kind}><img src={potion.image} alt=""/><b>×{state.potions[potion.kind]}</b></span>)}</div><span><small>회복 물품</small><strong>포션</strong></span></button></div></section>
  <PotionChoiceDialog state={state} open={potionsOpen} onOpenChange={setPotionsOpen} busy={combatBusy} onUse={drinkPotion}/>
  <PracticeInventory onEquipChange={()=>{audio.current?.unlock();audio.current?.play('equip')}} onUsePotion={drinkPotion} initialTab={bagTab} open={bag} onOpenChange={setBag} state={state} onChange={setState}/>
  <LootDialog state={state} loot={pendingLoot} onClaim={replaceId=>finishLoot(replaceId)} onDecline={()=>finishLoot(undefined,true)}/>
  <Dialog open={showHistory} onOpenChange={setShowHistory}><DialogContent className="exploration-modal exploration-history"><DialogHeader><DialogTitle>탐험 기록</DialogTitle><DialogDescription>이번 탐험에서 지나온 순간들이에요.</DialogDescription></DialogHeader><ol>{history.map((line,index)=><li key={index}><span>{String(index+1).padStart(2,'0')}</span><StoryContent line={line} nickname={nickname} avatarPath={avatarPath}/></li>)}</ol></DialogContent></Dialog>
  <ConfirmDialog compact open={leave} onOpenChange={setLeave} title="저장하지 않고 나가시겠습니까?" description="현재 탐험과 연습 물품이 사라져요. 다시 입장하면 지하실 입구부터 시작해요." confirmLabel="저장하지 않고 나가기" cancelLabel="계속 탐험" onConfirm={onLeave}/>
 </section>,document.body)
}

function StoryContent({line,nickname,avatarPath,animate=false}:{line:StoryLine;nickname:string;avatarPath?:string|null;animate?:boolean}){
 if(line.events)return <div className="exploration-combat-log">{line.events.map((event,index)=><p key={index} className={`combat-log-${event.kind}`}><b>{event.kind==='player'?`${nickname} → `:event.kind==='monster'?`${event.source??'몬스터'} → `:event.kind==='reward'?'🪙 ':event.kind==='defense'?'◇ ':''}</b><TypedText text={event.text} animate={animate}/></p>)}</div>
 return line.spoken?<div className="exploration-dialogue"><PlayerAvatar nickname={nickname} path={avatarPath} className="size-7"/><p><strong>{nickname}:</strong> <TypedText text={npcLineText(line.text)} animate={animate}/></p></div>:<p><TypedText text={npcLineText(line.text)} animate={animate}/></p>
}

function StairwayIllustration(){
 return <div className="exploration-stairway" aria-hidden="true"><div className="exploration-descent-sprite" style={{backgroundImage:`url(${descentSprite})`}}/></div>
}
