import {RoomEffectDetails,roomNarrative,roomOutcomeNarrative,type ResourceDelta} from './room-effect-details'
import {RecoveryEffect} from './recovery-effect'
import {NameStoryRoom} from './name-story-room'
import {acceptChoiceRoom,choiceRoomBlock,type ChoiceRoomId} from './choice-room-state'
import {PurchaseReceipt,usePurchaseReceipt} from './purchase-receipt'
import {nextRoomLabel} from './run-state'
﻿import {useEffect,useEffectEvent,useRef,useState} from 'react'
import {ArrowDown,Coins,Scale,Timer,Flame,Droplets,Orbit} from 'lucide-react'
import {CurseRoomEffect} from './curse-room-effect'
import {ThiefPotionEffect} from './thief-potion-effect'
import {ChoiceLog} from './choice-log'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {getAdventureRoom,restFully,sphinxPenalty,sphinxTimeLimitSeconds,type RoomVisit} from './adventure-rooms'
import {gearSaleBlock,gearSalePrice,lootDiscoveryText,sellRoomGear,type RoomLoot} from './room-loot'
import {getMonster,type MonsterId} from './monster-catalog'
import type {PracticeState} from './practice-state'
export function AdventureRoom({visit,state,onChange,onTalk,onDescend,onEncounter,onLoot,onGold,onQuizClock}:{visit:RoomVisit;state:PracticeState;onChange:React.Dispatch<React.SetStateAction<PracticeState>>;onTalk:(text:string)=>void;onDescend:()=>void;onEncounter:(id:MonsterId,ambush?:boolean)=>void;onLoot:(loot:RoomLoot)=>void;onGold:()=>void;onQuizClock?:(playing:boolean)=>void}){
 const room=getAdventureRoom(visit.id)!,[phase,setPhase]=useState<'offer'|'quiz'|'result'|'awakening'>('offer'),[result,setResult]=useState(''),[remaining,setRemaining]=useState(sphinxTimeLimitSeconds)
 const awakeningTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
 useEffect(()=>()=>{if(awakeningTimer.current)clearTimeout(awakeningTimer.current)},[])
 const {receipt,showReceipt}=usePurchaseReceipt()
 const [trading,setTrading]=useState(false)
 const [recovery,setRecovery]=useState<ResourceDelta|null>(null)
 const [goldReward,setGoldReward]=useState<number|null>(null),[manaLoss,setManaLoss]=useState<number|null>(null),[gemOutcome,setGemOutcome]=useState<{gold:number;manaLost:number}|null>(null)
 useEffect(()=>{
  if(goldReward===null&&manaLoss===null)return
  const timer=setTimeout(()=>{setGoldReward(null);setManaLoss(null)},1600)
  return()=>clearTimeout(timer)
 },[goldReward,manaLoss])
 const stopQuizClock=useEffectEvent(()=>onQuizClock?.(false))
 const settled=useRef(false),deadline=useRef(0),expire=useRef(()=>{})
 function finish(text:string,command?:(state:PracticeState)=>PracticeState){
  if(settled.current)return false
  settled.current=true;if(deadline.current)onQuizClock?.(false);if(command)onChange(command);setResult(text);setPhase('result');onTalk(text);return true
 }
 function search(){
  if(settled.current)return
  const outcome=visit.outcome
  if(outcome.kind==='monster'){settled.current=true;onTalk('물건을 건드리는 순간, 어둠 속에서 무언가 움직였다!');onEncounter(outcome.monsterId);return}
  if(outcome.kind==='gold'){if(finish(`${visit.progress} 골드 +${outcome.gold}.`,previous=>({...previous,gold:previous.gold+outcome.gold}))){setGoldReward(outcome.gold);onGold()}}
  else if(outcome.kind==='loot'){if(finish(`${visit.progress} ${lootDiscoveryText(outcome.loot)}`))onLoot(outcome.loot)}
 }
 function answer(index:number){
  const correct=Date.now()<deadline.current&&index===visit.question.correct
  if(correct)finish(visit.progress)
  else finish(`${index<0?'시간이 다 됐다.':'틀린 답이다.'} 스핑크스가 생명의 절반을 거두었다. 정답은 ‘${visit.question.answers[visit.question.correct]}’.`,sphinxPenalty)
 }
 expire.current=()=>answer(-1)
 useEffect(()=>{
  if(phase!=='quiz')return
  const timer=setInterval(()=>{const seconds=Math.max(0,Math.ceil((deadline.current-Date.now())/1000));setRemaining(seconds);if(!seconds)expire.current()},200)
  return()=>{clearInterval(timer);stopQuizClock()}
 },[phase])
 function startQuiz(){if(deadline.current||settled.current)return;deadline.current=Date.now()+sphinxTimeLimitSeconds*1000;setRemaining(sphinxTimeLimitSeconds);onQuizClock?.(true);setPhase('quiz')}
 function sell(kind:'weapon'|'armor',id:string){
  if(gearSaleBlock(state,kind,id))return
  const gear=(kind==='weapon'?state.weapons:state.armor).find(item=>item.id===id)!
  onChange(previous=>sellRoomGear(previous,kind,id));setResult(`${gear.name} 판매 · 골드 +${gearSalePrice(gear)}.`);onTalk(`${gear.name}을 저울에 올렸다. 골드 +${gearSalePrice(gear)}.`);onGold()
 }
 function rest(){
  const next=restFully(state)
  if(finish(visit.progress,()=>next))setRecovery({hp:next.hp-state.hp,mp:next.mp-state.mp})
 }
 function acceptContract(){
  if(settled.current||room.kind!=='choice'||choiceRoomBlock(state,room.id as ChoiceRoomId))return
  const next=acceptChoiceRoom(state,room.id as ChoiceRoomId)
  if(next===state)return
  const spell=next.spells.find(item=>!state.spells.some(previous=>previous.id===item.id))
  const gem=room.id==='cursed-gem-eye'?{gold:next.gold-state.gold,manaLost:state.mp-next.mp}:null
  const narrative=gem?(gem.gold>0?'보석이 금빛으로 부서지며 금화가 쏟아졌다. 골드 +500.':gem.manaLost>0?`보석의 차가운 기운이 마력을 삼켰다. 마나 −${gem.manaLost}.`:'보석의 저주가 마력을 노렸지만, 남아 있는 마나가 없었다.'):(roomOutcomeNarrative(room.id)??visit.progress)+(spell?' '+spell.name:'')
  if(finish(narrative,()=>next)){
   if(room.id==='deep-well')setRecovery({hp:next.hp-state.hp,mp:0})
   if(spell)showReceipt({kind:'magic',acquired:true,name:spell.name,image:spell.image})
   if(gem){setGemOutcome(gem);if(gem.gold>0){setGoldReward(gem.gold);onGold()}else setManaLoss(gem.manaLost)}
  }
 }
 const contractLabels:Record<string,string>={'soul-lantern':'등불을 켠다 · 최대 마나 −10','deep-well':'물을 마신다 · 체력 전부 회복 / 마나 0','forbidden-trade':'피를 바친다 · 체력 −50','cursed-gem-eye':'보석을 뽑는다 · 골드 +500 또는 마나 −20 (각 50%)','broken-teleport':`골드 200을 넣는다 · 지하 ${state.market.floor+3}층으로`}
 if(room.kind==='story')return <NameStoryRoom visit={visit} state={state} onChange={onChange} onTalk={onTalk} onDescend={onDescend} onLoot={onLoot} onEncounter={onEncounter}/>
 const forced=room.kind==='curse'||room.kind==='thief'
 const ContractIcon=room.id==='soul-lantern'?Flame:room.id==='deep-well'?Droplets:Orbit
 return <section className={`exploration-adventure-room is-${room.kind}`} aria-label={`탐험 방 · ${room.title}`}>
 {room.kind==='choice'&&room.id!=='forbidden-trade'&&room.id!=='broken-teleport'&&room.id!=='cursed-gem-eye'&&<div className="exploration-contract-art" data-contract={room.id} aria-hidden="true"><div><ContractIcon size={60} strokeWidth={1}/></div></div>}
 {recovery&&<RecoveryEffect amount={recovery}/>}
 {receipt&&<PurchaseReceipt key={receipt.key} item={receipt}/>}
 {room.kind==='curse'&&<CurseRoomEffect lost={visit.hpLost>0||visit.mpLost>0}/>}
 {room.kind==='thief'&&<ThiefPotionEffect stolen={visit.stolen}/>}
 {goldReward!==null&&<div className="combat-victory-gold exploration-room-gold" role="status" aria-label="골드 획득" aria-live="polite" aria-atomic="true"><Coins size={26}/><span>골드 +{goldReward.toLocaleString()}</span></div>}
 {manaLoss!==null&&<div className="combat-victory-gold exploration-room-gold exploration-room-mana-loss" role="status" aria-label="마나 감소"><Droplets size={26}/><span>마나 −{manaLoss}</span></div>}
 {room.kind==='thief'&&<div className="exploration-room-character"><img src="/exploration/rooms/desert-thief.png" alt="정면을 바라보는 모래두건 도둑" draggable={false}/></div>}
 {room.kind==='giant'&&<div className={'exploration-sleeping-giant '+(phase==='awakening'?'is-awakening':'is-dormant')}><img src={room.id==='sleeping-giant'?(phase==='awakening'?'/exploration/rooms/ancient-giant.png':'/exploration/rooms/ancient-giant-sleeping.png'):getMonster(room.monsterId).image} alt={phase==='awakening'?'깨어나는 '+getMonster(room.monsterId).name:room.title}/><span>처치 시 아이템 확정 · 첫 공격 확정 치명타 · 첫 반격 봉쇄</span></div>}
 <div className="exploration-room-panel"><div className="exploration-npc-dialogue"><h2>{room.title}</h2>
 <ChoiceLog className="exploration-room-dialogue" speaker={room.title} label="방 진행" text={phase==='quiz'?visit.question.question:result||roomNarrative(room.id)||visit.entry}/></div>
 {phase!=='quiz'&&<RoomEffectDetails id={room.id} state={state} recovery={recovery} gemOutcome={gemOutcome} done={phase==='result'}/>}
 {phase==='awakening'?<p className="exploration-awakening-label" role="status">{room.id==='sleeping-giant'?'고대거인이 눈을 뜹니다…':'보물갑충의 봉인이 풀립니다…'}</p>:phase==='quiz'?<div className="exploration-sphinx-quiz"><div className="exploration-quiz-clock" role="timer" aria-label="남은 문제 시간"><Timer size={16}/>{remaining}초</div><div>{visit.question.answers.map((text,index)=><button key={text} onClick={()=>answer(index)}>{text}</button>)}</div><small>오답 또는 시간 초과 시 현재 체력 50% 감소</small></div>:room.kind==='scales'?<div className="exploration-room-decisions"><button onClick={()=>setTrading(true)}>장비를 판다</button><button className="is-secondary" onClick={onDescend}>그냥 지나간다</button></div>:forced||phase==='result'?<><button className="exploration-room-next" onClick={onDescend}><ArrowDown size={14}/>{nextRoomLabel(state)}</button></>:<div className="exploration-room-decisions">
 {room.kind==='choice'?<button aria-label={choiceRoomBlock(state,room.id as ChoiceRoomId)??contractLabels[room.id]} disabled={!!choiceRoomBlock(state,room.id as ChoiceRoomId)} onClick={acceptContract}>{choiceRoomBlock(state,room.id as ChoiceRoomId)??({'soul-lantern':'등불을 켠다','deep-well':'물을 마신다','forbidden-trade':'피를 바친다','cursed-gem-eye':'보석을 뽑는다','broken-teleport':'마법진을 사용한다'} as Record<string,string>)[room.id]}</button>:room.kind==='rest'?<button aria-label="쉬었다 간다 · 체력·마나 전부 회복" onClick={rest}>쉬었다 간다</button>:room.kind==='lore'?<button onClick={()=>finish(visit.progress)}>읽어본다</button>:room.kind==='giant'?<button onClick={()=>{if(settled.current)return;settled.current=true;setPhase('awakening');setResult(visit.progress);onTalk(visit.progress);awakeningTimer.current=setTimeout(()=>onEncounter(room.monsterId??'ancient-giant',true),1100)}}>{room.id==='sleeping-giant'?'거인을 깨운다':'봉인을 건드린다'}</button>:room.kind==='sphinx'?<button onClick={startQuiz}>문제를 듣는다 · 제한 시간 {sphinxTimeLimitSeconds}초</button>:<button onClick={search}>{room.kind==='chest'?'열어본다':'조사한다'}</button>}
 {room.kind==='sphinx'?<button className="is-secondary" onClick={()=>finish('스핑크스에게 생명의 절반을 내어주었다. 길이 열렸다.',sphinxPenalty)}>영혼의 절반을 내어준다 · 체력 50% 감소</button>:<button className="is-secondary" onClick={onDescend}>{room.id==='broken-teleport'?'계단으로 내려간다':room.id==='cursed-gem-eye'?'그대로 둔다':room.id==='forbidden-trade'?'거래하지 않고 내려간다':room.kind==='rest'||room.kind==='lore'||room.kind==='choice'?'그냥 지나간다':room.kind==='giant'?'조용히 지나간다':'무시하고 지하로 내려간다'}</button>}
 </div>}
 </div>
 {room.kind==='scales'&&<Dialog open={trading} onOpenChange={setTrading}><DialogContent className="exploration-modal exploration-selection-modal exploration-sale-modal"><DialogHeader><DialogTitle>장비 판매</DialogTitle><DialogDescription>장착 중인 장비는 먼저 다른 장비로 교체하세요. 마지막 무기와 보호구는 남겨둡니다.</DialogDescription></DialogHeader><div className="exploration-shop-gold"><Coins size={16}/> 보유 골드 {state.gold.toLocaleString()}</div><div className="exploration-scale-items">{(['weapon','armor'] as const).flatMap(kind=>(kind==='weapon'?state.weapons:state.armor).map(item=>{const blocked=gearSaleBlock(state,kind,item.id);return <article key={item.id}>{item.image?<img src={item.image} alt=""/>:<Scale size={25}/>}<div><h3>{item.name}</h3><span><Coins size={11}/>{gearSalePrice(item)} 골드</span><small>{blocked??'판매 가능'}</small></div><button disabled={!!blocked} onClick={()=>sell(kind,item.id)}>판매</button></article>}))}</div><button className="exploration-modal-return" onClick={()=>setTrading(false)}>거래를 마친다</button></DialogContent></Dialog>}
 </section>
}
