import {useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Coins,ArrowDown,Swords,Shield,Sparkles,Heart,Droplets} from 'lucide-react'
import {useAccountResource} from '@/lib/account-query'
import {randomId} from '@/lib/random-id'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {GameLeaveGuard} from '@/features/arcade/game-leave-guard'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {hasOpenOverlay} from '@/components/overlay-back'
import {commandExploration,readExplorationRun,type ExplorationRequest} from './reward-api'
import type {ExplorationAction} from './server-engine'
import {playerMaxHp,playerManaMax,floorMerchantGoods,merchantPotions,purchaseBlock,type PracticeState} from './practice-state'
import {requiredDoorRoom,nextRoomLabel} from './run-state'
import {getAdventureRoom} from './adventure-rooms'
import {choiceRoomBlock,type ChoiceRoomId} from './choice-room-state'
import {canAppeaseNameGuardian,nameStoryGreeting} from './name-story'
import {getShopkeeper} from './shopkeepers'
import {shamanSpells,shamanLearningBlock} from './shaman-stock'
import {gearSaleBlock,gearSalePrice} from './room-loot'
import {combatBackgrounds,combatBackgroundUrl,resolveCombatBackground} from './combat-backgrounds'
import {drawFloorArt,DoorSprite,dungeonBackgrounds,doorSkins} from './dungeon-art'
import {HealthMeter} from './health-meter'
import {PlayerAilments} from './ailments'
import {ExplorerCombatStats} from './combat-stats'
import {ChoiceLog} from './choice-log'
import {RoomEffectDetails} from './room-effect-details'
import {getMonster} from './monster-catalog'
import {ExplorationMenu} from './exploration-menu'
import {PracticeInventory,type InventoryTab} from './practice-inventory'
import {PotionChoiceDialog} from './potion-choice-dialog'
import {ScorpionRoom} from './scorpion-room'
import {LootDialog} from './loot-dialog'
import {StatusScreenEffects} from './status-screen-effects'
import {createExplorationAudio} from './exploration-audio'
import {combatTimings} from './combat-timing'
import {combatPhaseEvents,combatPresentation} from './combat-presentation'
import type {CombatResult,TurnFeedback} from './combat-state'
import './verified-exploration.css'

export function VerifiedExplorationGame({runId,nickname,avatarPath,onLeave}:{runId:string;nickname:string;avatarPath?:string|null;onLeave:()=>void}){
 const query=useAccountResource(['exploration-run',runId],signal=>readExplorationRun(runId,signal))
 const receipt=query.data
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[bag,setBag]=useState(false),[leave,setLeave]=useState(false),[history,setHistory]=useState(false)
 const [bagTab,setBagTab]=useState<InventoryTab>('weapon'),[potions,setPotions]=useState(false)
 const [selected,setSelected]=useState<number|null>(null),[art,setArt]=useState(drawFloorArt)
 const [animation,setAnimation]=useState<{before:PracticeState;result:CombatResult;phase:TurnFeedback['phase'];action:TurnFeedback['action'];id:number}|null>(null)
 const pending=useRef<ExplorationRequest|null>(null),lock=useRef(false),active=useRef(true),current=useRef(receipt);current.current=receipt
 const audio=useRef<ReturnType<typeof createExplorationAudio>|null>(null)
 const timers=useRef<ReturnType<typeof setTimeout>[]>([])
 const requestExit=useRef(()=>setLeave(true));requestExit.current=()=>current.current?.model.state.completed?onLeave():setLeave(true)
 useEffect(()=>{
  active.current=true;audio.current=createExplorationAudio();audio.current.startMusic()
  const root=document.getElementById('root'),inert=root?.inert,overflow=document.body.style.overflow
  if(root)root.inert=true;document.body.style.overflow='hidden'
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!hasOpenOverlay()){event.preventDefault();requestExit.current()}}
  let wasFullscreen=!!document.fullscreenElement
  const fullscreen=()=>{if(document.fullscreenElement)wasFullscreen=true;else if(wasFullscreen){wasFullscreen=false;requestExit.current()}}
  document.addEventListener('keydown',key);document.addEventListener('fullscreenchange',fullscreen)
  return()=>{active.current=false;timers.current.forEach(clearTimeout);audio.current?.dispose();document.removeEventListener('keydown',key);document.removeEventListener('fullscreenchange',fullscreen);if(root)root.inert=!!inert;document.body.style.overflow=overflow;if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{})}
 },[])
 const floor=receipt?.model.state.market.floor
 useEffect(()=>{
  const deadline=receipt?.model.quizDeadline
  if(!deadline||receipt.model.settled||receipt.model.view!=='room')return
  const timer=setTimeout(()=>{if(!lock.current&&!pending.current)void send({type:'answer',index:-1})},Math.max(0,deadline-Date.now()))
  return()=>clearTimeout(timer)
 },[receipt?.model.quizDeadline,receipt?.model.settled,busy])
 useEffect(()=>{setSelected(null);setArt(drawFloorArt());audio.current?.startDescent();const timer=setTimeout(()=>audio.current?.stopDescent(),1000);return()=>clearTimeout(timer)},[floor])
 useEffect(()=>{audio.current?.startMusic(receipt?.model.view==='combat'?'combat':['merchant','shaman'].includes(receipt?.model.view??'')?'merchant':'exploration')},[receipt?.model.view])
 useEffect(()=>{if(receipt?.model.view==='combat'&&receipt.model.state.combat?.status==='escaped'&&!animation&&!busy&&!pending.current)void send({type:'descend'})},[receipt?.model.state.combat?.status,animation,busy])
 async function send(action:ExplorationRequest['action'],retry=false){
  const latest=current.current;if(!latest||lock.current||animation)return
  if(pending.current&&!retry)return
  pending.current??={runId,operationId:randomId(),revision:latest.revision,action}
  const request=pending.current
  lock.current=true;setBusy(true);setError('');audio.current?.unlock()
  try{
   const next=await commandExploration(request)
   pending.current=null
   if(!active.current)return
   if(request.action.type==='leave'){onLeave();return}
   if(request.action.type==='door'||request.action.type==='descend')setSelected(null)
   if(request.action.type==='combat'&&next.model.result){
    const result=next.model.result,id=next.revision,combatAction=request.action.action.type
    timers.current.forEach(clearTimeout);timers.current=[]
    setAnimation({before:latest.model.state,result,phase:'prepare',action:combatAction,id})
    const schedule=(ms:number,phase:TurnFeedback['phase'])=>timers.current.push(setTimeout(()=>{
     setAnimation({before:latest.model.state,result,phase,action:combatAction,id})
     if(phase==='player')audio.current?.play(combatAction==='attack'?(result.events.some(e=>e.kind==='player'&&e.critical)?'critical':'attack'):combatAction==='magic'?'magic':combatAction==='potion'?'health-potion':'flee')
     if(phase==='reply'&&result.events.some(e=>e.kind==='monster'))audio.current?.play('hit')
    },ms))
    const pause=result.actionState?combatTimings.statusPause:0
    schedule(combatTimings.player,'player')
    if(result.actionState)schedule(combatTimings.bleed,'bleed')
    schedule(combatTimings.counter+pause,'counter');schedule(combatTimings.reply+pause,'reply')
    timers.current.push(setTimeout(()=>{timers.current=[];setAnimation(null);setBusy(false);lock.current=false},combatTimings.done+pause))
    return
   }
   if(request.action.type==='buy'||request.action.type==='learn')audio.current?.play('loot')
   if(request.action.type==='equip'||request.action.type==='spell')audio.current?.play('equip')
   if(request.action.type==='potion')audio.current?.play(request.action.kind==='health'?'health-potion':'mana-potion')
  }catch(cause){
   if((cause as {definitive?:boolean}).definitive)pending.current=null
   if(active.current)setError((cause as Error).message==='REVISION_CONFLICT'?'다른 화면에서 진행이 바뀌었어요. 현재 상태를 다시 불러와주세요.':'요청 결과를 확인하지 못했어요. 다시 확인해도 중복 지급되지 않아요.')
  }finally{if(active.current&&!timers.current.length){setBusy(false);lock.current=false}}
  lock.current=false;if(active.current)setBusy(false)
 }
 if(!receipt)return createPortal(<section className="exploration-game"><p role="status">탐험을 불러오고 있어요.</p>{query.error&&<button onClick={()=>void query.refetch()}>다시 불러오기</button>}<button onClick={onLeave}>메인 화면으로</button></section>,document.body)
 if(receipt.abandoned)return createPortal(<section className="exploration-game exploration-run-complete"><div><h1>탐험이 종료됐어요</h1><p>다른 화면에서 새 탐험을 시작했거나 이미 나간 탐험이에요.</p><button onClick={onLeave}>메인 화면으로</button></div></section>,document.body)
 const model=receipt.model,server=model.state
 const state=animation?animation.phase==='reply'?animation.result.state:animation.phase==='prepare'?animation.before:animation.phase==='player'?(animation.result.actionState??animation.result.playerState):animation.result.playerState:server
 const feedback:TurnFeedback|null=animation?{id:animation.id,phase:animation.phase,action:animation.action,events:combatPhaseEvents(animation.result,animation.phase)}:null
 const required=requiredDoorRoom(state),doors=required?[required]:state.market.doors
 const room=model.visit?getAdventureRoom(model.visit.id):null
 const keeper=getShopkeeper(model.view==='shaman'?state.shamanStock?.shopkeeperId:state.market.shopkeeperId)
 const combatBackground=resolveCombatBackground(state.combat?.monsterId,combatBackgrounds[0])
 const background=model.view==='combat'?combatBackgroundUrl(combatBackground):room?.background??(['merchant','shaman'].includes(model.view)?keeper.background:dungeonBackgrounds[art.background])
 const presentation=animation?combatPresentation(animation.result,animation.phase,animation.action):model.result?combatPresentation(model.result,model.result.events.some(e=>e.phase==='reply')?'reply':'player'):undefined
 const latest=presentation?.text??model.visit?.entry??'문을 선택하고 탐험을 계속하세요.'
 const disabled=busy||!!pending.current||!!animation
 const command=(action:ExplorationAction)=>void send(action)
 const roomAction=(type:'search'|'rest'|'contract'|'awaken'|'quiz')=><button onClick={()=>command({type})}>{({search:'조사한다',rest:'쉬었다 간다',contract:'선택을 받아들인다',awaken:'봉인을 건드린다',quiz:'문제를 듣는다'} as const)[type]}</button>
 const errorPanel=error&&<div className="verified-error" role="alert"><p>{error}</p>{pending.current?<button disabled={busy} onClick={()=>void send(pending.current!.action,true)}>같은 요청 다시 확인</button>:<button onClick={()=>{setError('');void query.refetch()}}>현재 상태 다시 불러오기</button>}</div>
 if(server.completed)return createPortal(<section className="exploration-game exploration-run-complete"><div><span>EXPLORATION COMPLETE</span><h1>50층 탐험 완료</h1><p>왕릉의 마지막 왕, 황금왕 라세프를 쓰러뜨렸습니다.</p><p role="status">{receipt.rewardGold===2000?'2,000골드 지급 완료':'보상 지급을 확인하고 있어요.'}</p><button onClick={onLeave}>메인 화면으로</button></div></section>,document.body)
 return createPortal(<section className="exploration-game is-practice is-verified" aria-label="파라오 지하 탐험">
  <GameLeaveGuard active practice={false}/><StatusScreenEffects state={state} feedback={feedback}/>
  <header className="exploration-top exploration-compact-header"><div className="exploration-toolbar"><div className="exploration-map-location"><h1>파라오의 황금해</h1><span className="exploration-level-chip"><ArrowDown size={10}/>지하 <b>{state.market.floor}</b>층<small> / 50</small></span></div><div className="exploration-header-actions"><span className="exploration-gold" aria-label="탐험용 골드"><Coins size={13}/>{state.gold.toLocaleString()}</span><ExplorationMenu onPreview={()=>audio.current?.play('attack')} onHistory={()=>setHistory(true)} onLeave={()=>setLeave(true)}/></div></div>
   <section className="exploration-player-status exploration-split-hud" aria-label="탐험가 상태"><div className="exploration-status-main"><div className="exploration-hud-identity"><div className="exploration-avatar-ring"><PlayerAvatar nickname={nickname} path={avatarPath} className="size-6"/></div><strong className="exploration-player-name"><span>{nickname}</span>{state.combat?.status==='active'&&<small>전투 중</small>}</strong></div><div className="exploration-vitals"><div className="exploration-resource-row"><div className="exploration-meter exploration-hp"><span><Heart size={11}/><span className="sr-only">체력</span></span><HealthMeter label="탐험가 체력" value={state.hp} max={playerMaxHp(state)}/><span><b>{state.hp}</b><small>/{playerMaxHp(state)}</small></span></div></div><div className="exploration-resource-row"><div className="exploration-meter exploration-mp"><span><Droplets size={11}/><span className="sr-only">마나</span></span><progress aria-label="탐험가 마나" value={state.mp} max={playerManaMax(state)}/><span><b>{state.mp}</b><small>/{playerManaMax(state)}</small></span></div></div></div></div><PlayerAilments state={state}/><ExplorerCombatStats state={state} iconsOnly/></section>
  </header>
  {errorPanel}<main className="exploration-scene has-dungeon-art is-close-scene" inert={disabled} data-scene={model.view==='doors'?'dungeon':model.view==='merchant'||model.view==='shaman'?'merchant':room?.id??'combat'} data-shopkeeper={model.view==='merchant'||model.view==='shaman'?keeper.id:undefined} style={{backgroundImage:`linear-gradient(#07101430,#07101410 55%,#07101480),url(${background})`}}>
    {model.view==='doors'&&<><div className={`exploration-doors ${doors.length===1?'is-single':''}`} data-door-count={doors.length} role="group" aria-label={`지하 ${state.market.floor}층의 ${doors.length===1?'하나뿐인 문':'세 문'}`}>{doors.map((_,index)=><button key={index} className="exploration-choice" aria-pressed={selected===index} onClick={()=>setSelected(index)}><DoorSprite skin={art.doors[index]} opening={busy&&selected===index}/><span className="exploration-choice-copy"><small>0{index+1}</small><strong>{doorSkins[art.doors[index]].name}</strong></span></button>)}</div><div className="exploration-door-controls"><ChoiceLog speaker="탐험" text={latest}/><button className="exploration-preview-enter" disabled={selected===null} onClick={()=>{audio.current?.play('door');command({type:'door',index:selected!})}}>{selected===null?'문을 선택해주세요':'선택한 문으로 입장'}</button></div></>}
    {model.view==='combat'&&state.combat&&<ScorpionRoom background={combatBackground} logEvent={presentation?.event} state={state} busy={disabled} feedback={feedback} latestLog={latest} speaker="탐험" onAction={action=>command({type:'combat',action})} onDescend={()=>command({type:'descend'})} onReturnToMain={()=>setLeave(true)} onReward={()=>audio.current?.play('loot')} onLootReady={()=>{}}/>}
    {(['merchant','shaman'].includes(model.view))&&<section className="exploration-merchant"><div className="exploration-merchant-art"><img src={keeper.portrait} alt={keeper.name}/></div><div className="exploration-npc-dialogue"><h2>{keeper.name}<small>{keeper.shopName}</small></h2></div><div className="exploration-shop-items">
     {model.view==='merchant'?floorMerchantGoods(state).map(item=><article key={item.id}><div><h3>{item.name}</h3><p>{item.description}</p><small>{item.price} 골드</small></div><button disabled={!!purchaseBlock(state,item.id)} onClick={()=>command({type:'buy',id:item.id,quantity:1})}>{purchaseBlock(state,item.id)??'구매'}</button></article>):(state.shamanStock?.spellIds??[]).flatMap(id=>shamanSpells.filter(s=>s.id===id)).map(spell=><article key={spell.id}><img src={spell.image} alt=""/><div><h3>{spell.name}</h3><p>{spell.description}</p><small>{spell.learnPrice} 골드</small></div><button disabled={!!shamanLearningBlock(state,spell.id)} onClick={()=>command({type:'learn',id:spell.id})}>{shamanLearningBlock(state,spell.id)??'배우기'}</button></article>)}
    </div><button onClick={()=>command({type:'descend'})}>{state.forcedMerchant?'문으로 돌아간다':'아래층으로 내려간다.'}</button></section>}
    {model.view==='room'&&room&&model.visit&&<section className={`exploration-adventure-room is-${room.kind}`}>
     {room.kind==='giant'&&<img className="verified-room-portrait" src={getMonster(room.monsterId).image} alt={room.title}/>}
     {room.kind==='thief'&&<img className="verified-room-portrait" src="/exploration/rooms/desert-thief.png" alt="모래두건 도둑"/>}
     {room.id==='nameless-guardian'&&<img className="verified-room-portrait" src="/exploration/npcs/nameless-royal-warden.png" alt="이름 없는 왕실 수문장"/>}
     <div className="exploration-room-panel"><div className="exploration-npc-dialogue"><h2>{room.title}</h2><p>{room.id==='nameless-guardian'?nameStoryGreeting(state):model.settled?model.visit.progress:model.visit.entry}</p></div><RoomEffectDetails id={room.id} state={state} done={model.settled}/><div className="exploration-room-decisions">
     {!model.settled&&<>
      {(room.kind==='chest'||room.kind==='investigate')&&roomAction('search')}
      {room.kind==='rest'&&roomAction('rest')}
      {room.kind==='lore'&&<button onClick={()=>command({type:'read'})}>읽어본다</button>}
      {room.kind==='choice'&&<><p>{room.intro[0]}</p><button disabled={!!choiceRoomBlock(state,room.id as ChoiceRoomId)} onClick={()=>command({type:'contract'})}>{choiceRoomBlock(state,room.id as ChoiceRoomId)??'선택을 받아들인다'}</button></>}
      {room.kind==='giant'&&roomAction('awaken')}
      {room.kind==='sphinx'&&(model.quizDeadline?<><p>{model.visit.question.question}</p>{model.visit.question.answers.map((answer,index)=><button key={answer} onClick={()=>command({type:'answer',index})}>{answer}</button>)}</>:roomAction('quiz'))}
      {room.kind==='sphinx'&&<button onClick={()=>command({type:'answer',index:-1})}>영혼의 절반을 내어준다 · 체력 50% 감소</button>}
      {room.id==='erased-name'&&<><button onClick={()=>command({type:'story',action:'restore'})}>지워진 이름을 다시 새긴다</button><button onClick={()=>command({type:'story',action:'leave-name'})}>남의 무덤에 손대지 않는다</button></>}
      {room.id==='erased-name-record'&&<button onClick={()=>command({type:'story',action:'read-record'})}>먼지를 털고 기록을 읽는다</button>}
      {room.id==='nameless-guardian'&&(state.nameStory?.gateOpened?<button onClick={()=>command({type:'story',action:'claim'})}>열린 문 안을 살펴본다</button>:canAppeaseNameGuardian(state)?<button onClick={()=>command({type:'story',action:'open-gate'})}>그의 이름을 불러준다</button>:<button onClick={()=>command({type:'guardian-fight'})}>수문장과 싸운다</button>)}
     </>}
     {room.kind==='scales'&&(['weapon','armor'] as const).flatMap(kind=>(kind==='weapon'?state.weapons:state.armor).map(gear=><button key={gear.id} disabled={!!gearSaleBlock(state,kind,gear.id)} onClick={()=>command({type:'sell',kind,id:gear.id})}>{gear.name} 판매 · {gearSalePrice(gear)} 골드</button>))}
     {(room.kind!=='sphinx'||model.settled)&&<button onClick={()=>command({type:'descend'})}>{nextRoomLabel(state)}</button>}
    </div></div></section>}
  </main>
  <section className="exploration-equipment-dock" aria-label="장비와 마법 관리"><div className="exploration-equipped">{(['weapon','armor'] as const).map(kind=>{const gear=(kind==='weapon'?state.weapons:state.armor).find(item=>item.id===(kind==='weapon'?state.weaponId:state.armorId))!;return <button key={kind} className="exploration-equipment" disabled={disabled} aria-label={kind==='weapon'?'주무기 교체':'주보호구 교체'} onClick={()=>{setBagTab(kind);setBag(true)}}>{gear.image?<img className="exploration-equipped-weapon" src={gear.image} alt=""/>:kind==='weapon'?<Swords/>:<Shield/>}<span><small>{kind==='weapon'?'주무기':'주보호구'}</small><strong>{gear.name}</strong></span></button>})}{[0,1].map(index=>{const spell=state.spells.find(item=>item.id===state.equippedSpells[index]);return <button key={index} className={`exploration-spell-slot ${spell?'is-equipped':'is-empty'}`} disabled={disabled} aria-label={`마법 ${index+1} 장착`} onClick={()=>{setBagTab('magic');setBag(true)}}>{spell?.image?<img className="exploration-equipped-weapon" src={spell.image} alt=""/>:<Sparkles/>}<span><small>마법 {index+1}</small><strong>{spell?.name??'마법 선택'}</strong></span></button>})}<button className="exploration-potion-loadout" aria-label="포션 보관함" disabled={disabled||!!state.combat} onClick={()=>setPotions(true)}><div>{merchantPotions.map(potion=><span key={potion.kind}><img src={potion.image} alt=""/><b>×{state.potions[potion.kind]}</b></span>)}</div><span><small>회복 물품</small><strong>포션</strong></span></button></div></section>
  <LootDialog loot={!animation?model.pendingLoot:null} onClaim={()=>{if(!disabled)command({type:'loot'})}}/>
  <PracticeInventory initialTab={bagTab} open={bag} onOpenChange={setBag} state={state} busy={disabled} onChange={()=>{}} onEquipChange={()=>{}} onEquip={(kind,id)=>command({type:'equip',kind,id})} onToggleSpell={id=>command({type:'spell',id})} onUsePotion={kind=>{if(!disabled)command({type:'potion',kind});return false}}/>
  <PotionChoiceDialog open={potions} onOpenChange={setPotions} state={state} busy={disabled} onUse={kind=>{if(!disabled)command({type:'potion',kind});return false}}/>
  <Dialog open={history} onOpenChange={setHistory}><DialogContent className="exploration-modal"><DialogHeader><DialogTitle>현재 탐험</DialogTitle><DialogDescription>지하 {state.market.floor}층 · 체력 {state.hp} · 탐험용 골드 {state.gold}</DialogDescription></DialogHeader><p>{model.result?.lines.join('\n')??latest}</p></DialogContent></Dialog>
  <ConfirmDialog compact open={leave} onOpenChange={setLeave} title="탐험을 마치고 나갈까요?" description="완료하지 않은 탐험에는 골드 보상이 지급되지 않아요." confirmLabel="나가기" cancelLabel="계속 탐험" onConfirm={()=>void send({type:'leave'})}/>
 </section>,document.body)
}
