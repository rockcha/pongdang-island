import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {ArrowDown,Backpack,Check,Coins,Flame,Heart,History,LogOut,Shield,Sparkles,Swords,Droplets} from 'lucide-react'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {GameLeaveGuard} from '@/features/arcade/game-leave-guard'
import {hasOpenOverlay} from '@/components/overlay-back'
import {RoomPreview,roomTypes,type RoomTypeId} from './room-preview'
import {MerchantRoom} from './merchant-room'
import {ScorpionRoom} from './scorpion-room'
import {resolveCombatTurn,startScorpionCombat,type CombatAction,type CombatEvent,type CombatResult,type TurnFeedback} from './combat-state'
import {DoorSprite,doorSkins,drawFloorArt,dungeonBackgrounds} from './dungeon-art'
import descentSprite from './assets/pharaoh-descent-8f.png'
import merchantBackdrop from './assets/merchant-alcove.png'
import {equipGear,grantPracticeSupplies,newPractice,toggleSpell,type Gear,type PracticeState,type Spell,castSpell} from './practice-state'

export const egyptianWarnings=[
 '황금의 눈은 탐욕스러운 자를 기억한다.',
 '잠든 왕의 이름을 함부로 부르지 말라.',
 '가져간 황금보다 무거운 대가를 치르리라.',
 '세 개의 문이 있으나, 돌아오는 길은 약속되지 않았다.',
 '저울 위에 놓이는 것은 금이 아니라 그대의 심장이다.',
 '모래 아래 잠든 것은 모두 죽은 것이 아니다.',
 '왕의 침묵을 깨운 자여, 뒤에서 들리는 발소리를 세지 말라.',
 '가장 밝게 빛나는 문이 가장 깊은 어둠을 품는다.',
 '이곳의 황금은 주인을 바꾸지 않는다.',
 '마지막 횃불이 꺼지기 전에, 무엇을 두고 갈지 정하라.',
] as const
export const doorArrivalLines=[
 '어? 문이 3개나 있네... 어디로 들어가지?',
 '문이 세 개라니... 어느 쪽으로 가야 할까?',
 '음... 세 개 다 수상한데. 어디부터 살펴보지?',
 '여기서 길이 갈리네... 어떤 문을 골라야 하지?',
 '드디어 도착! 그런데 문이 세 개네... 어디가 좋을까?',
] as const
type StoryLine={text:string;spoken:boolean;events?:CombatEvent[]}
const doors=[{name:'모래에 묻힌 문',rune:'𓂀',hint:'문틈으로 마른 모래가 흘러내립니다.',detail:'모래 위에는 오래된 발자국만 남아 있습니다. 누군가 먼저 이곳을 지나갔을까요?'},{name:'황금 문양의 문',rune:'𓆣',hint:'빛바랜 황금 문양이 희미하게 빛납니다.',detail:'황금빛 풍뎅이가 새겨져 있습니다. 문 너머에서는 낮고 규칙적인 울림이 들립니다.'},{name:'물소리가 나는 문',rune:'𓈖',hint:'고요한 물방울 소리가 들려옵니다.',detail:'문 아래로 차가운 물기가 번집니다. 어둠 속에서 물방울이 천천히 떨어지고 있습니다.'}]
export function gearStats(item:Gear){return (item.attack!==undefined?`공격력 ${item.attack} · 치명타 ${item.critical}%`:`피격 피해 ${item.reduction} 감소 · 회피 ${item.evasion}%`)+(item.escapeBonus?` · 도망 +${item.escapeBonus}%p`:'')}

export function ExplorationGame({nickname,avatarPath,onLeave}:{nickname:string;avatarPath?:string|null;onLeave:()=>void}){
 const [state,setState]=useState(newPractice),[descending,setDescending]=useState(true),[bag,setBag]=useState(false),[leave,setLeave]=useState(false)
 const [warning]=useState(()=>egyptianWarnings[Math.floor(Math.random()*egyptianWarnings.length)])
 const [arrivalLine]=useState(()=>doorArrivalLines[Math.floor(Math.random()*doorArrivalLines.length)])
 const [bagTab,setBagTab]=useState<'weapon'|'armor'|'magic'>('weapon')
 const [casting,setCasting]=useState<Spell|null>(null),[showHistory,setShowHistory]=useState(false)
 const [message,setMessage]=useState<StoryLine>({text:'지하 1층으로 내려가는 중...',spoken:false})
 const [history,setHistory]=useState<StoryLine[]>([])
 const [doorTypes,setDoorTypes]=useState<RoomTypeId[]>(['monster','merchant','quiz'])
 const [previewRoom,setPreviewRoom]=useState<RoomTypeId|null>(null)
 const [floor,setFloor]=useState(1),[merchant,setMerchant]=useState(false)
 const [floorArt,setFloorArt]=useState(drawFloorArt)
 const [opening,setOpening]=useState<{index:number;type:RoomTypeId}|null>(null)
 const entryLock=useRef(false)
 const turnLock=useRef(false),liveState=useRef(state);liveState.current=state
 const [combatBusy,setCombatBusy]=useState(false)
 const [pendingTurn,setPendingTurn]=useState<{result:CombatResult;action:CombatAction['type'];id:number}|null>(null)
 const [feedback,setFeedback]=useState<TurnFeedback|null>(null)
 const turnSequence=useRef(0),storyRef=useRef<HTMLDivElement|null>(null)
 function tell(text:string,spoken=false){const line={text,spoken};setMessage(line);setHistory(previous=>[...previous,line])}
 function openInventory(tab:'weapon'|'armor'|'magic'){if(state.combat||opening)return;setBagTab(tab);setBag(true)}
 const requestExit=useRef(()=>setLeave(true));requestExit.current=()=>setLeave(true)
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
  const timer=setTimeout(()=>{setDescending(false);tell(arrivalLine,true)},window.matchMedia('(prefers-reduced-motion: reduce)').matches?100:4000)
  return()=>clearTimeout(timer)
 },[descending,floor])
 function descend(){
  setFeedback(null)
  setFloorArt(drawFloorArt());setOpening(null);entryLock.current=false
  setMerchant(false);setFloor(previous=>previous+1);setState(previous=>({...previous,door:null,combat:null}));setDescending(true)
  tell(`지하 ${floor+1}층으로 내려가는 중...`)
 }
 function enterRoom(){
  if(state.door===null||entryLock.current||descending)return
  entryLock.current=true;setOpening({index:state.door,type:doorTypes[state.door]});tell('돌문이 천천히 열립니다...')
 }
 useEffect(()=>{
  if(!opening)return
  const timer=setTimeout(()=>{
   if(opening.type==='merchant')setMerchant(true)
   else if(opening.type==='monster'){setState(previous=>startScorpionCombat(previous));tell('모래 속에서 거대한 전갈이 나타났습니다! 공격력 8 · 체력 48. 어떻게 할까요?')}
   else setPreviewRoom(opening.type)
   setOpening(null);entryLock.current=false
  },window.matchMedia('(prefers-reduced-motion: reduce)').matches?100:1100)
  return()=>clearTimeout(timer)
 },[opening])
 useEffect(()=>{
  if(!pendingTurn)return
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const reply=setTimeout(()=>{
   liveState.current=pendingTurn.result.state;setState(pendingTurn.result.state)
   setFeedback({id:pendingTurn.id,phase:'reply',events:pendingTurn.result.events,action:pendingTurn.action})
   const line={text:pendingTurn.result.lines.join('\n'),spoken:false,events:pendingTurn.result.events}
   setMessage(line);setHistory(previous=>[...previous,line])
  },reduced?20:360)
  const done=setTimeout(()=>{turnLock.current=false;setCombatBusy(false);setPendingTurn(null)},reduced?50:800)
  return()=>{clearTimeout(reply);clearTimeout(done)}
 },[pendingTurn])
 useEffect(()=>{if(message.events&&storyRef.current)storyRef.current.scrollTop=storyRef.current.scrollHeight},[message])
 useEffect(()=>{
  if(state.combat?.status!=='escaped')return
  const timer=setTimeout(descend,600)
  return()=>clearTimeout(timer)
 },[state.combat?.status])
 function combatAction(action:CombatAction){
  if(turnLock.current)return
  const result=resolveCombatTurn(liveState.current,action)
  if(result.state===liveState.current)return
  turnLock.current=true;liveState.current=result.playerState;setState(result.playerState);setCombatBusy(true)
  const id=++turnSequence.current
  setFeedback({id,phase:'player',events:result.events,action:action.type});setPendingTurn({result,action:action.type,id})
  const events=result.events.filter(event=>event.kind==='player'||event.kind==='system')
  setMessage({text:events.map(event=>event.text).join('\n'),spoken:false,events})
 }
 function restartCombatRun(){
  setFeedback(null)
  setState(newPractice());setFloor(1);setMerchant(false);setDescending(true);setFloorArt(drawFloorArt());tell('지하 1층으로 내려가는 중...')
 }
 const weapon=state.weapons.find(item=>item.id===state.weaponId)!,armor=state.armor.find(item=>item.id===state.armorId)!
 function chooseDoor(index:number){setState(previous=>({...previous,door:index}));tell(doors[index].detail)}
 return createPortal(<section className="exploration-game" aria-label="파라오 지하 탐험">
  <GameLeaveGuard active practice description="탐험 진행과 연습 물품은 저장되지 않아요. 저장하지 않고 나가시겠습니까?"/>
  <div className="exploration-top">
   <header className="exploration-game-header"><div className="exploration-location"><h1 className="exploration-floor-badge"><ArrowDown size={13}/><span>지하 <b>{floor}</b>층</span></h1><span className="exploration-map-name">파라오의 황금해</span><span className="exploration-mode">연습</span></div><div className="exploration-game-actions"><span key={state.gold} className={`exploration-gold ${feedback?.phase==='reply'&&feedback.events.some(event=>event.kind==='reward')?'has-reward':''}`} aria-label="탐험용 골드"><Coins size={13}/>{state.gold.toLocaleString()}</span><button disabled={!!state.combat||!!opening} onClick={()=>openInventory('weapon')} aria-label="탐험 보관함"><Backpack size={16}/><span>인벤토리</span></button><button onClick={()=>setLeave(true)} aria-label="탐험 나가기"><LogOut size={16}/><span>나가기</span></button></div></header>
   <section className="exploration-status-frame" aria-label="탐험가 상태">
    {feedback?.phase==='reply'&&feedback.events.some(event=>event.kind==='monster')&&<span key={feedback.id} className="exploration-player-damage" aria-hidden="true">−{feedback.events.find(event=>event.kind==='monster')?.damage}</span>}
    <div className="exploration-glyph-border" aria-hidden="true">𓂀 · 𓆣 · 𓇳 · 𓈖 · 𓂀</div>
    <div className="exploration-identity"><div className="exploration-avatar-ring"><PlayerAvatar nickname={nickname} path={avatarPath} className="size-10"/></div><div className="exploration-vitals"><strong className="exploration-player-name">{nickname}</strong><div className="exploration-meter exploration-hp"><span><Heart size={10}/><span className="sr-only">체력</span></span><progress aria-label="탐험가 체력" max={100} value={state.hp}/><span>{state.hp}<small>/100</small></span></div><div className="exploration-meter exploration-mp"><span><Droplets size={10}/><span className="sr-only">마나</span></span><progress aria-label="탐험가 마나" max={30} value={state.mp}/><span>{state.mp}<small>/30</small></span></div></div></div>
    <div className="exploration-equipped" aria-label="현재 장비와 마법">
     <button disabled={!!state.combat||!!opening} className="exploration-equipment" onClick={()=>openInventory('weapon')} title={gearStats(weapon)} aria-label="주무기 교체"><Swords size={17}/><span><small>주무기</small><strong>{weapon.name}</strong><span className="exploration-gear-stats">{gearStats(weapon)}</span></span></button>
     <button disabled={!!state.combat||!!opening} className="exploration-equipment" onClick={()=>openInventory('armor')} title={gearStats(armor)} aria-label="주보호구 교체"><Shield size={17}/><span><small>주보호구</small><strong>{armor.name}</strong><span className="exploration-gear-stats">{gearStats(armor)}</span></span></button>
     {[0,1].map(index=>{const spell=state.spells.find(item=>item.id===state.equippedSpells[index]);return <button disabled={!!state.combat||!!opening} className={`exploration-spell-slot ${spell?'is-equipped':''}`} key={index} aria-label={spell?`${spell.name} 사용`:`마법 ${index+1} 장착`} onClick={()=>spell?setCasting(spell):openInventory('magic')}><Sparkles size={16}/><span><small>마법 {index+1}</small><strong>{spell?.name??'빈 칸'}</strong>{spell&&<span className="exploration-spell-cost">MP {spell.mana}</span>}</span></button>})}
    </div>
   </section>
  </div>
  <div className={`exploration-scene ${!descending?'has-dungeon-art':''} ${opening?'is-entering-room':''}`} data-background={floorArt.background} data-entry-door={opening?.index} style={!descending?{backgroundImage:`linear-gradient(#07101430,#07101410 55%,#07101480),url(${merchant?merchantBackdrop:dungeonBackgrounds[floorArt.background]})`}:undefined}>{!descending&&!merchant&&!state.combat&&<div className="exploration-room-picker">{doorTypes.map((type,index)=><label key={index}><span>{index+1}번 문</span><select disabled={!!opening} aria-label={`${index+1}번 문 방 유형`} value={type} onChange={event=>setDoorTypes(previous=>previous.map((value,i)=>i===index?event.target.value as RoomTypeId:value))}>{roomTypes.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}</select></label>)}</div>}{state.combat?<ScorpionRoom state={state} feedback={feedback} busy={combatBusy} onAction={combatAction} onDescend={descend} onRestart={restartCombatRun}/>:merchant?<MerchantRoom state={state} onChange={setState} onDescend={descend} onTalk={tell}/>:descending?<div className="exploration-descent-scene"><div className="exploration-floor-arrival"><span>DESCENDING</span><strong>지하 <b>{floor}</b>층</strong></div><StairwayIllustration/><section className="exploration-warning" aria-label="지하의 경고"><div className="exploration-warning-mark" aria-hidden="true">𓂀</div><div><span className="exploration-warning-caption">벽에 새겨진 경고</span><p>“{warning}”</p></div><span className="exploration-warning-decoration" aria-hidden="true">𓆣</span></section></div>:<div className={`exploration-doors ${opening?'is-focusing':''}`} style={{transformOrigin:`${opening?((opening.index+.5)/3)*100:50}% 45%`}} role="group" aria-label={`지하 ${floor}층의 세 문`}>{doors.map((door,index)=><button key={door.name} className="exploration-choice" disabled={!!opening} aria-pressed={state.door===index} onClick={()=>chooseDoor(index)}><DoorSprite skin={floorArt.doors[index]} opening={opening?.index===index}/><span className="exploration-choice-copy"><small>0{index+1}</small><strong>{doorSkins[floorArt.doors[index]].name}</strong></span>{state.door===index?<Check size={14}/>:<span className="exploration-choice-arrow" aria-hidden="true">›</span>}</button>)}</div>}{!descending&&!merchant&&!state.combat&&<button className="exploration-preview-enter" disabled={state.door===null||!!opening} onClick={enterRoom}>{state.door===null?'문을 선택해주세요':`${roomTypes.find(room=>room.id===doorTypes[state.door!])?.name} · ${['merchant','monster'].includes(doorTypes[state.door!])?'입장':'입장 미리보기'}`}</button>}</div>
  <main className="exploration-narrative" aria-label="탐험 이야기와 선택지">
   <header className="exploration-narrative-heading"><span><Flame size={13}/> {descending?'지하로 향하는 계단':state.combat?'모래 전갈 · 전투':merchant?'모래길의 상인':`지하 ${floor}층 · 세 개의 문`}</span><button onClick={()=>setShowHistory(true)} aria-label="탐험 기록"><History size={13}/><span>기록</span></button></header>
   <div ref={storyRef} className="exploration-story" role="status" aria-live="polite" aria-label={descending?`지하 ${floor}층으로 내려가는 중`:undefined}>{descending&&<ArrowDown className="exploration-descending-icon" size={15}/>}<StoryContent line={message} nickname={nickname} avatarPath={avatarPath}/></div>
   <footer className="exploration-narrative-footer"><span>모래 전갈 전투 · 상인 구매 테스트</span><span>저장되지 않는 연습 탐험</span></footer>
  </main>
  <PracticeInventory initialTab={bagTab} open={bag} onOpenChange={setBag} state={state} onChange={setState}/>
  <RoomPreview type={previewRoom} onClose={()=>setPreviewRoom(null)}/>
  <Dialog open={showHistory} onOpenChange={setShowHistory}><DialogContent className="exploration-history"><DialogHeader><DialogTitle>탐험 기록</DialogTitle><DialogDescription>이번 탐험에서 지나온 순간들이에요.</DialogDescription></DialogHeader><ol>{history.map((line,index)=><li key={index}><span>{String(index+1).padStart(2,'0')}</span><StoryContent line={line} nickname={nickname} avatarPath={avatarPath}/></li>)}</ol></DialogContent></Dialog>
  <ConfirmDialog compact open={!!casting} onOpenChange={open=>{if(!open)setCasting(null)}} title={casting?casting.name+' 사용':''} description={casting?<span>{casting.description}<br/>소모 마나 {casting.mana} · 현재 {state.mp} / 30{state.mp<casting.mana&&<span className="block text-destructive">마나가 부족해요.</span>}</span>:null} confirmLabel="시전하기" confirmDisabled={!casting||state.mp<casting.mana} onConfirm={()=>{if(!casting||state.mp<casting.mana)return;setState(previous=>castSpell(previous,casting.id));tell(casting.message);setCasting(null)}}/>
  <ConfirmDialog compact open={leave} onOpenChange={setLeave} title="저장하지 않고 나가시겠습니까?" description="현재 탐험과 연습 물품이 사라져요. 다시 입장하면 지하실 입구부터 시작해요." confirmLabel="저장하지 않고 나가기" cancelLabel="계속 탐험" onConfirm={onLeave}/>
 </section>,document.body)
}

function StoryContent({line,nickname,avatarPath}:{line:StoryLine;nickname:string;avatarPath?:string|null}){
 if(line.events)return <div className="exploration-combat-log">{line.events.map((event,index)=><p key={index} className={`combat-log-${event.kind}`}><b>{event.kind==='player'?`${nickname} → `:event.kind==='monster'?'모래 전갈 → ':event.kind==='reward'?'🪙 ':event.kind==='defense'?'◇ ':''}</b>{event.text}</p>)}</div>
 return line.spoken?<div className="exploration-dialogue"><PlayerAvatar nickname={nickname} path={avatarPath} className="size-7"/><p><strong>{nickname}:</strong> {line.text}</p></div>:<p>{line.text}</p>
}

function StairwayIllustration(){
 return <div className="exploration-stairway" aria-hidden="true"><div className="exploration-descent-sprite" style={{backgroundImage:`url(${descentSprite})`}}/></div>
}

function PracticeInventory({initialTab,open,onOpenChange,state,onChange}:{initialTab:'weapon'|'armor'|'magic';open:boolean;onOpenChange:(open:boolean)=>void;state:PracticeState;onChange:React.Dispatch<React.SetStateAction<PracticeState>>}){
 const [tab,setTab]=useState<'weapon'|'armor'|'magic'>('weapon'),[notice,setNotice]=useState('')
 useEffect(()=>{if(open)setTab(initialTab)},[open,initialTab])
 const items=tab==='weapon'?state.weapons:state.armor
 function spell(id:string){
  if(!state.equippedSpells.includes(id)&&state.equippedSpells.length===2){setNotice('마법은 최대 2개까지 장착할 수 있어요. 먼저 하나를 해제해주세요.');return}
  setNotice('');onChange(previous=>toggleSpell(previous,id))
 }
 return <Dialog open={open} onOpenChange={value=>{setNotice('');onOpenChange(value)}}><DialogContent className="exploration-inventory"><DialogHeader><DialogTitle>탐험 보관함</DialogTitle><DialogDescription>무기·보호구는 각각 3개 보관하고 하나를 사용해요. 마법은 최대 2개를 동시에 사용해요.</DialogDescription></DialogHeader>
  <div className="exploration-inventory-tabs" role="tablist" aria-label="탐험 장비 종류">{([{id:'weapon',name:'무기',Icon:Swords,count:state.weapons.length},{id:'armor',name:'보호구',Icon:Shield,count:state.armor.length},{id:'magic',name:'마법',Icon:Sparkles,count:state.equippedSpells.length}] as const).map(item=><button role="tab" aria-selected={tab===item.id} aria-controls="exploration-bag-items" id={`exploration-tab-${item.id}`} key={item.id} onClick={()=>{setTab(item.id);setNotice('')}}><item.Icon size={15}/>{item.name}<span>{item.count} / {item.id==='magic'?2:3}</span></button>)}</div>
  <div id="exploration-bag-items" role="tabpanel" aria-labelledby={`exploration-tab-${tab}`} className="exploration-inventory-items">{tab==='magic'?state.spells.length?state.spells.map(item=><article key={item.id}><Sparkles size={20}/><h3>{item.name}</h3><p>{item.description}<br/>MP {item.mana}</p><button aria-pressed={state.equippedSpells.includes(item.id)} onClick={()=>spell(item.id)}>{state.equippedSpells.includes(item.id)?'마법 해제':'마법 장착'}</button></article>):<p className="exploration-empty">아직 발견한 마법이 없어요.</p>:<>{items.map(item=><article key={item.id}>{tab==='weapon'?<Swords size={20}/>:<Shield size={20}/>}<h3>{item.name}</h3><p>{gearStats(item)}</p><small>{item.description}</small><button aria-pressed={(tab==='weapon'?state.weaponId:state.armorId)===item.id} onClick={()=>onChange(previous=>equipGear(previous,tab,item.id))}>{(tab==='weapon'?state.weaponId:state.armorId)===item.id?'사용 중':tab==='weapon'?'주 무기로 선택':'주 보호구로 선택'}</button></article>)}{Array.from({length:3-items.length},(_,i)=><div className="exploration-empty-slot" key={i}>빈 보관 칸</div>)}</>}</div>
  {notice&&<p role="alert" className="exploration-inventory-notice">{notice}</p>}<div className="exploration-inventory-footer"><span>이번 탐험에서만 사용하는 연습 물품이에요.</span><button disabled={state.supplies} onClick={()=>onChange(grantPracticeSupplies)}>{state.supplies?'연습 물품 지급 완료':'연습 물품 받기'}</button></div>
 </DialogContent></Dialog>
}
