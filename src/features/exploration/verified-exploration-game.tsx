import {ShopLoadout} from './shop-loadout'
import {SaleDialog} from './sale-dialog'
import {ShopPotions} from './shop-potions'
import {GoldGainEffect} from './gold-gain-effect'
import {PurchaseReceipt,usePurchaseReceipt} from './purchase-receipt'
import {RecoveryEffect} from './recovery-effect'
import {sphinxTimeLimitSeconds} from './adventure-rooms'
import {normalizeExplorationSpells} from './spell-availability'
import {campaignFinalFloor,campaignFinalBoss} from './campaign-profile'
import {GrowthPanel} from './growth-panel'
import {useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react'
import {createPortal} from 'react-dom'
import {Coins,ArrowDown,Swords,Shield,Sparkles,Heart,Droplets} from 'lucide-react'
import {useAccountResource} from '@/lib/account-query'
import {randomId} from '@/lib/random-id'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {GameLeaveGuard} from '@/features/arcade/game-leave-guard'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {hasOpenOverlay} from '@/components/overlay-back'
import {commandExploration,readExplorationRun,type ExplorationRequest,type ExplorationReceipt} from './reward-api'
import type {ExplorationAction} from './server-engine'
import {playerMaxHp,playerManaMax,floorMerchantGoods,merchantPotions,purchaseBlock,type PracticeState} from './practice-state'
import {requiredDoorRoom,nextRoomLabel} from './run-state'
import {getAdventureRoom} from './adventure-rooms'
import {choiceRoomBlock,type ChoiceRoomId} from './choice-room-state'
import {canAppeaseNameGuardian,nameStoryGreeting} from './name-story'
import {getShopkeeper} from './shopkeepers'
import {shamanSpells,shamanLearningBlock} from './shaman-stock'
import {drawCombatBackground,combatBackgroundUrl,resolveCombatBackground} from './combat-backgrounds'
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
import {DescentScene} from './descent-scene'
import {drawDoorArrival,drawMonsterArrival} from './exploration-narration'
import {encounterRoomBackdrop} from './encounter-background'
import {PotionThiefRoom} from './potion-thief-room'
import type {CombatResult,TurnFeedback} from './combat-state'
import './verified-exploration.css'
import './merchant-shop.css'

export function VerifiedExplorationGame({runId,nickname,avatarPath,onLeave}:{runId:string;nickname:string;avatarPath?:string|null;onLeave:()=>void}){
 const query=useAccountResource(['exploration-run',runId],signal=>readExplorationRun(runId,signal))
 return <ExplorationPlay runId={runId} nickname={nickname} avatarPath={avatarPath} onLeave={onLeave} receipt={query.data} dispatch={commandExploration} loadError={!!query.error} reload={()=>void query.refetch()}/>
}

/** Both modes share presentation and action sequencing; only the execution boundary differs. */
export function ExplorationPlay({runId,nickname,avatarPath,onLeave,receipt,dispatch,loadError=false,reload,testTools,localOnly=false}:{runId:string;nickname:string;avatarPath?:string|null;onLeave:()=>void;receipt?:ExplorationReceipt;dispatch:(request:ExplorationRequest)=>Promise<ExplorationReceipt>;loadError?:boolean;reload:()=>void;testTools?:(disabled:boolean)=>ReactNode;localOnly?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[bag,setBag]=useState(false),[leave,setLeave]=useState(false),[history,setHistory]=useState(false)
 const [bagTab,setBagTab]=useState<InventoryTab>('weapon'),[potions,setPotions]=useState(false)
 const [shop,setShop]=useState(false)
 const [trading,setTrading]=useState(false)
 const [recovery,setRecovery]=useState<{hp:number;mp:number;key:number}|null>(null)
 const [goldGain,setGoldGain]=useState<{amount:number;key:number}|null>(null)
 const [quizNow,setQuizNow]=useState(Date.now)
 useEffect(()=>{if(!receipt?.model.quizDeadline||receipt.model.settled)return;setQuizNow(Date.now());const timer=setInterval(()=>setQuizNow(Date.now()),100);return()=>clearInterval(timer)},[receipt?.model.quizDeadline,receipt?.model.settled])
 const {receipt:purchaseReceipt,showReceipt}=usePurchaseReceipt()
 const [doorTransition,setDoorTransition]=useState<ExplorationReceipt|null>(null)
 const [selected,setSelected]=useState<number|null>(null),[art,setArt]=useState(drawFloorArt)
 const [descendingFloor,setDescendingFloor]=useState<number|null>(null)
 const [arrivedFloor,setArrivedFloor]=useState<number|null>(null)
 const previousFloor=useRef<number|undefined>(undefined)
 const [animation,setAnimation]=useState<{before:PracticeState;result:CombatResult;phase:TurnFeedback['phase'];action:TurnFeedback['action'];id:number}|null>(null)
 const animationState=animation?(animation.phase==='reply'?animation.result.state:animation.phase==='prepare'?animation.before:animation.phase==='player'?(animation.result.actionState??animation.result.playerState):animation.result.playerState):undefined
 const musicCombat=(animationState??receipt?.model.state)?.combat
 const musicScene=receipt?.model.view==='combat'&&musicCombat?.status==='active'&&musicCombat.enemyHp>0?'combat':['merchant','shaman'].includes(receipt?.model.view??'')?'merchant':'exploration'
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
 const monsterArrival=useMemo(()=>receipt?.model.state.combat?drawMonsterArrival(receipt.model.state.combat.monsterId??'sand-scorpion'):'',[floor,receipt?.model.state.combat?.monsterId])
 const doorArrival=useMemo(()=>drawDoorArrival(receipt&&requiredDoorRoom(receipt.model.state)?1:receipt?.model.state.market.doors.length??3),[floor])
 const ambientCombatBackground=useMemo(()=>drawCombatBackground(),[floor,receipt?.model.state.combat?.monsterId])
 useEffect(()=>{
  const deadline=receipt?.model.quizDeadline
  if(!deadline||receipt.model.settled||receipt.model.view!=='room')return
  const timer=setTimeout(()=>{if(!lock.current&&!pending.current)void send({type:'answer',index:-1})},Math.max(0,deadline-Date.now()))
  return()=>clearTimeout(timer)
 },[receipt?.model.quizDeadline,receipt?.model.settled,busy])
 useEffect(()=>{
  if(floor===undefined||floor===previousFloor.current)return
  const initial=previousFloor.current===undefined;previousFloor.current=floor
  setSelected(null);setArt(drawFloorArt());setShop(false)
  setArrivedFloor(null)
  if(!initial||receipt?.model.view==='doors')setDescendingFloor(floor)
 },[floor])
 useEffect(()=>{
  if(descendingFloor===null)return
  audio.current?.startDescent()
  const timer=setTimeout(()=>{setDescendingFloor(null);setArrivedFloor(descendingFloor)},window.matchMedia('(prefers-reduced-motion: reduce)').matches?1200:4000)
  return()=>{clearTimeout(timer);audio.current?.stopDescent()}
 },[descendingFloor])
 useEffect(()=>{
  if(arrivedFloor===null)return
  const timer=setTimeout(()=>setArrivedFloor(null),2400)
  return()=>clearTimeout(timer)
 },[arrivedFloor])
 useEffect(()=>{audio.current?.startMusic(musicScene)},[musicScene])
 useEffect(()=>{if(receipt?.model.view==='combat'&&receipt.model.state.combat?.status==='escaped'&&!animation&&!busy&&!pending.current)void send({type:'descend'})},[receipt?.model.state.combat?.status,animation,busy])
 async function send(action:ExplorationRequest['action'],retry=false){
  const latest=current.current;if(!latest||lock.current||animation||descendingFloor!==null&&action.type!=='leave')return
  if(pending.current&&!retry)return
  pending.current??={runId,operationId:randomId(),revision:latest.revision,action}
  const request=pending.current
  const doorStarted=performance.now()
  if(request.action.type==='door'){setArrivedFloor(null);setDoorTransition(latest)}
  lock.current=true;setBusy(true);setError('');audio.current?.unlock()
  try{
   const next=await dispatch(request)
   pending.current=null
   if(!active.current)return
   if(request.action.type==='leave'){onLeave();return}
   if(request.action.type==='door'){
    const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches?100:1100
    timers.current.push(setTimeout(()=>{timers.current=[];setDoorTransition(null);setSelected(null);setShop(false);setBusy(false);lock.current=false},Math.max(0,duration-(performance.now()-doorStarted))))
    return
   }
   if(request.action.type==='descend'){setSelected(null);setShop(false);setTrading(false);setRecovery(null);setGoldGain(null)}
   if(request.action.type==='sell'&&next.model.state.gold>latest.model.state.gold)audio.current?.play('gold')
   if(request.action.type==='search'&&next.model.visit?.outcome.kind==='gold'&&next.model.state.gold>latest.model.state.gold){
    setGoldGain({amount:next.model.state.gold-latest.model.state.gold,key:next.revision})
    audio.current?.play('loot')
   }
   if(request.action.type==='rest'){
    setRecovery({hp:Math.max(0,next.model.state.hp-latest.model.state.hp),mp:Math.max(0,next.model.state.mp-latest.model.state.mp),key:next.revision})
    audio.current?.play('health-potion')
   }
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
   if(request.action.type==='buy'||request.action.type==='learn'){
    audio.current?.play('loot')
    if(next.model.state.gold<latest.model.state.gold){
     const action=request.action
     if(action.type==='buy'){
      const item=floorMerchantGoods(latest.model.state).find(item=>item.id===action.id)
      if(item){showReceipt({name:item.name+(item.kind==='potion'?' +'+action.quantity:''),image:item.kind==='potion'?item.image:undefined,kind:item.kind});setShop(false)}
     }else{
      const spell=shamanSpells.find(item=>item.id===action.id)
      if(spell){showReceipt({name:spell.name,image:spell.image,kind:'magic'});setShop(false)}
     }
    }
   }
   if(request.action.type==='learn')setShop(false)
   if(request.action.type==='allocate-stat'&&(next.model.state.growth?.allocations[request.action.stat]??0)>(latest.model.state.growth?.allocations[request.action.stat]??0))audio.current?.play('growth')
   if(request.action.type==='equip'||request.action.type==='spell')audio.current?.play('equip')
   if(request.action.type==='potion')audio.current?.play(request.action.kind==='health'?'health-potion':'mana-potion')
  }catch(cause){
   setDoorTransition(null)
   if((cause as {definitive?:boolean}).definitive)pending.current=null
   if(active.current)setError((cause as Error).message==='REVISION_CONFLICT'?'다른 화면에서 진행이 바뀌었어요. 현재 상태를 다시 불러와주세요.':'요청 결과를 확인하지 못했어요. 다시 확인해도 중복 지급되지 않아요.')
  }finally{if(active.current&&!timers.current.length){setBusy(false);lock.current=false}}
  lock.current=false;if(active.current)setBusy(false)
 }
 if(!receipt)return createPortal(<section className="exploration-game"><p role="status">탐험을 불러오고 있어요.</p>{loadError&&<button onClick={reload}>다시 불러오기</button>}<button onClick={onLeave}>메인 화면으로</button></section>,document.body)
 if(receipt.abandoned)return createPortal(<section className="exploration-game exploration-run-complete"><div><h1>탐험이 종료됐어요</h1><p>다른 화면에서 새 탐험을 시작했거나 이미 나간 탐험이에요.</p><button onClick={onLeave}>메인 화면으로</button></div></section>,document.body)
 const model=(doorTransition??receipt).model,server=model.state
 const state=normalizeExplorationSpells(animationState??server)
 const feedback:TurnFeedback|null=animation?{id:animation.id,phase:animation.phase,action:animation.action,events:combatPhaseEvents(animation.result,animation.phase)}:null
 const required=requiredDoorRoom(state),doors=required?[required]:state.market.doors
 const room=model.visit?getAdventureRoom(model.visit.id):null
 const keeper=getShopkeeper(model.view==='shaman'?state.shamanStock?.shopkeeperId:state.market.shopkeeperId)
 const combatBackground=resolveCombatBackground(state.combat?.monsterId,ambientCombatBackground)
 const roomBackdrop=model.view==='combat'?encounterRoomBackdrop(state):undefined
 const background=model.view==='combat'?(roomBackdrop??combatBackgroundUrl(combatBackground)):room?.background??(['merchant','shaman'].includes(model.view)?keeper.background:dungeonBackgrounds[art.background])
 const presentation=animation?combatPresentation(animation.result,animation.phase,animation.action):model.result?combatPresentation(model.result,model.result.events.some(e=>e.phase==='reply')?'reply':'player'):undefined
 const introduction=model.view==='combat'&&!presentation
 const latest=presentation?.text??(introduction?monsterArrival:model.visit?.entry??doorArrival)
 const disabled=busy||!!pending.current||!!animation||descendingFloor!==null
 const command=(action:ExplorationAction)=>void send(action)
 const roomAction=(type:'search'|'rest'|'contract'|'awaken'|'quiz')=><button onClick={()=>command({type})}>{({search:'조사한다',rest:'쉬고 저장하기',contract:'선택을 받아들인다',awaken:'봉인을 건드린다',quiz:'문제를 듣는다'} as const)[type]}</button>
 const errorPanel=error&&<div className="verified-error" role="alert"><p>{error}</p>{pending.current?<button disabled={busy} onClick={()=>void send(pending.current!.action,true)}>같은 요청 다시 확인</button>:<button onClick={()=>{setError('');reload()}}>현재 상태 다시 불러오기</button>}</div>
 if(server.completed)return createPortal(<section className="exploration-game exploration-run-complete"><div><span>EXPLORATION COMPLETE</span><h1>{campaignFinalFloor(server)}층 탐험 완료</h1><p>{getMonster(campaignFinalBoss(server)).name}을 쓰러뜨렸습니다.</p><p role="status">{testTools||localOnly?'테스트 완료 · 실제 골드 보상은 지급되지 않아요.':receipt.rewardGold===(campaignFinalFloor(server)===80?4000:2000)?(campaignFinalFloor(server)===80?'80층 보상 2,000골드 · 누적 4,000골드 지급 완료':'2,000골드 지급 완료'):'보상 지급을 확인하고 있어요.'}</p><button onClick={onLeave}>메인 화면으로</button></div></section>,document.body)
 return createPortal(<section className="exploration-game is-practice is-verified" aria-label="파라오 지하 탐험">
  <GameLeaveGuard active practice={false}/><StatusScreenEffects state={state} feedback={feedback}/>
  <header className="exploration-top exploration-compact-header"><div className="exploration-toolbar"><div className="exploration-map-location"><h1>파라오의 황금해</h1><span className="exploration-level-chip"><ArrowDown size={10}/>지하 <b>{state.market.floor}</b>층<small> / {campaignFinalFloor(state)}</small></span></div><div className="exploration-header-actions"><span className="exploration-gold" aria-label="탐험용 골드"><Coins size={13}/>{state.gold.toLocaleString()}</span><GrowthPanel state={server} busy={disabled} ready={model.view==='doors'&&!descendingFloor} onAllocate={stat=>command({type:'allocate-stat',stat})}/><ExplorationMenu onPreview={()=>audio.current?.play('attack')} onHistory={()=>setHistory(true)} onLeave={()=>setLeave(true)}/></div></div>
   <section className="exploration-player-status exploration-split-hud" aria-label="탐험가 상태"><div className="exploration-status-main"><div className="exploration-hud-identity"><div className="exploration-avatar-ring"><PlayerAvatar nickname={nickname} path={avatarPath} className="size-6"/></div><strong className="exploration-player-name"><span>{nickname}</span>{state.combat?.status==='active'&&<small>전투 중</small>}</strong></div><div className="exploration-vitals"><div className="exploration-resource-row"><div className="exploration-meter exploration-hp"><span><Heart size={11}/><span className="sr-only">체력</span></span><HealthMeter label="탐험가 체력" value={state.hp} max={playerMaxHp(state)}/><span><b>{state.hp}</b><small>/{playerMaxHp(state)}</small></span></div></div><div className="exploration-resource-row"><div className="exploration-meter exploration-mp"><span><Droplets size={11}/><span className="sr-only">마나</span></span><progress aria-label="탐험가 마나" value={state.mp} max={playerManaMax(state)}/><span><b>{state.mp}</b><small>/{playerManaMax(state)}</small></span></div></div></div></div><PlayerAilments state={state}/><ExplorerCombatStats state={state} iconsOnly/></section>
  {['merchant','shaman'].includes(model.view)&&!shop&&<ShopLoadout state={state}/>}</header>
  {purchaseReceipt&&<PurchaseReceipt key={purchaseReceipt.key} item={purchaseReceipt}/>}
  {recovery&&<RecoveryEffect key={recovery.key} amount={recovery}/>}
  {goldGain&&<GoldGainEffect key={goldGain.key} amount={goldGain.amount}/>}
  {errorPanel}<main className={`exploration-scene has-dungeon-art is-close-scene ${doorTransition?'is-entering-room':''}`} inert={disabled&&model.view!=='combat'} data-scene={descendingFloor!==null?'descent':model.view==='doors'?'dungeon':model.view==='merchant'||model.view==='shaman'?'merchant':room?.id??'combat'} data-shopkeeper={model.view==='merchant'||model.view==='shaman'?keeper.id:undefined} style={descendingFloor!==null?undefined:{backgroundImage:`linear-gradient(#07101430,#07101410 55%,#07101480),url(${background})`}}>
    {descendingFloor!==null?<DescentScene floor={descendingFloor}/>:<>
    {model.view==='doors'&&!required&&testTools?.(disabled)}
    {model.view==='doors'&&<><div className={`exploration-doors ${doors.length===1?'is-single':''} ${doorTransition?'is-focusing':''}`} data-door-count={doors.length} style={{'--door-pan':`${doorTransition&&doors.length>1?(1-(selected??0))*100/3:0}%`,transformOrigin:`${doorTransition&&doors.length>1?(((selected??0)+.5)/3)*100:50}% 45%`} as CSSProperties} role="group" aria-label={`지하 ${state.market.floor}층의 ${doors.length===1?'하나뿐인 문':'세 문'}`}>{doors.map((_,index)=><button key={index} className="exploration-choice" aria-pressed={selected===index} onClick={()=>setSelected(index)}><DoorSprite skin={art.doors[index]} opening={busy&&selected===index}/><span className="exploration-choice-copy"><small>0{index+1}</small><strong>{doorSkins[art.doors[index]].name}</strong></span></button>)}</div><div className="exploration-door-controls"><ChoiceLog speaker={nickname} nickname={nickname} avatarPath={avatarPath} text={latest}/><button className="exploration-preview-enter" disabled={selected===null} onClick={()=>{audio.current?.play('door');command({type:'door',index:selected!})}}>{selected===null?'문을 선택해주세요':'선택한 문으로 입장'}</button></div></>}
    {model.view==='combat'&&state.combat&&<ScorpionRoom background={combatBackground} backdropUrl={roomBackdrop} nickname={introduction?nickname:undefined} avatarPath={avatarPath} logEvent={presentation?.event} state={state} busy={disabled} feedback={feedback} latestLog={latest} speaker={introduction?nickname:'탐험'} onAction={action=>command({type:'combat',action})} onDescend={()=>command({type:'descend'})} onReturnToMain={()=>setLeave(true)} onReward={()=>audio.current?.play('loot')} onLootReady={()=>{}}/>}
    {(['merchant','shaman'].includes(model.view))&&<section className="exploration-merchant"><div className="exploration-merchant-art"><img src={keeper.portrait} alt={keeper.name}/></div><div className="exploration-npc-dialogue"><h2>{keeper.name}<small>{keeper.shopName}</small></h2><ChoiceLog speaker={keeper.name} text={keeper.greetings[0]}/></div><div className="exploration-merchant-choices"><button disabled={disabled} onClick={()=>setShop(true)}>{model.view==='shaman'?'마법을 살펴본다':'구매한다'}</button><button onClick={()=>command({type:'descend'})}>{state.forcedMerchant?'문으로 돌아간다':'아래층으로 내려간다.'}</button></div><Dialog open={shop} onOpenChange={setShop}><DialogContent className="exploration-modal exploration-room-preview exploration-shop exploration-minimal-shop"><DialogHeader><DialogTitle>{keeper.shopName}</DialogTitle><DialogDescription>배운 마법과 구매한 물품은 보관함에서 확인할 수 있어요.</DialogDescription></DialogHeader><ShopLoadout state={state}/><div className="exploration-shop-gold"><Coins size={16}/>{state.gold.toLocaleString()} 골드</div><div className="exploration-shop-items">
     {model.view==='merchant'?floorMerchantGoods(state).map(item=><article key={item.id}>{item.kind==='potion'?<img className="exploration-shop-weapon" src={item.image} alt=""/>:item.gear&&'image' in item.gear?<img className="exploration-shop-weapon" src={item.gear.image} alt=""/>:<span aria-hidden="true">{item.kind==='armor'?<Shield size={24}/>:item.kind==='magic'?<Sparkles size={24}/>:<Swords size={24}/>}</span>}<div><h3>{item.name}</h3><p>{item.description}</p><small>{item.price} 골드</small></div><button disabled={!!purchaseBlock(state,item.id)} onClick={()=>command({type:'buy',id:item.id,quantity:1})}>{purchaseBlock(state,item.id)??'구매'}</button></article>):(state.shamanStock?.spellIds??[]).flatMap(id=>shamanSpells.filter(s=>s.id===id)).map(spell=><article key={spell.id}><img className="exploration-shop-weapon" src={spell.image} alt=""/><div><h3>{spell.name}</h3><p>{spell.description}</p><span className="exploration-spell-mana"><Droplets size={13}/> 마나 {spell.mana} 소모</span><small>{spell.learnPrice} 골드</small></div><button disabled={!!shamanLearningBlock(state,spell.id)} onClick={()=>command({type:'learn',id:spell.id})}>{shamanLearningBlock(state,spell.id)??'배우기'}</button></article>)}
     {model.view==='shaman'&&<ShopPotions state={state} busy={disabled} onBuy={id=>command({type:'buy',id,quantity:1})}/>}
    </div><button onClick={()=>setShop(false)}>상인에게 돌아가기</button></DialogContent></Dialog></section>}
    {model.view==='room'&&room?.kind==='thief'&&model.visit&&<PotionThiefRoom key={model.visit.key} stolen={model.visit.stolen} canFight={model.version>=2} busy={disabled} onFight={()=>command({type:'thief-fight'})} onLeave={()=>command({type:'descend'})}/>}
    {model.view==='room'&&room?.kind==='supply'&&model.visit&&<section className="exploration-adventure-room is-supply"><div className="exploration-room-panel"><div className="exploration-room-decisions">{!model.settled&&<button disabled={disabled} onClick={()=>command({type:'search'})}>상자를 연다</button>}<button disabled={disabled} onClick={()=>command({type:'descend'})}>내려간다</button></div></div></section>}
    {model.view==='room'&&room&&room.kind!=='thief'&&room.kind!=='supply'&&model.visit&&<section className={`exploration-adventure-room is-${room.kind}`}>
     {room.kind==='giant'&&<img className="verified-room-portrait" src={getMonster(room.monsterId).image} alt={room.title}/>}
     {room.id==='nameless-guardian'&&<img className="verified-room-portrait" src="/exploration/npcs/nameless-royal-warden.png" alt="이름 없는 왕실 수문장"/>}
     <div className="exploration-room-panel"><div className="exploration-npc-dialogue"><h2>{room.title}</h2><p>{room.id==='nameless-guardian'?nameStoryGreeting(state):room.kind==='rest'?(model.settled?(testTools||localOnly?'체력과 마나를 회복했습니다. 테스트 진행은 저장되지 않아요.':'체력과 마나를 회복하고 탐험을 저장했습니다.'):'쉬고 게임을 저장하겠습니까?'):model.settled?(model.visit.outcome.kind==='gold'?`금화 ${model.visit.outcome.gold.toLocaleString()} 골드를 획득했습니다.`:model.visit.progress):model.visit.entry}</p></div><RoomEffectDetails id={room.id} state={state} done={model.settled}/><div className="exploration-room-decisions">
     {!model.settled&&<>
      {(room.kind==='chest'||room.kind==='investigate')&&<button onClick={()=>command({type:'search'})}>상자를 살펴본다</button>}
      {room.kind==='rest'&&roomAction('rest')}
      {room.kind==='lore'&&<button onClick={()=>command({type:'read'})}>읽어본다</button>}
      {room.kind==='choice'&&<><p>{room.intro[0]}</p><button disabled={!!choiceRoomBlock(state,room.id as ChoiceRoomId)} onClick={()=>command({type:'contract'})}>{choiceRoomBlock(state,room.id as ChoiceRoomId)??'선택을 받아들인다'}</button></>}
      {room.kind==='giant'&&roomAction('awaken')}
      {room.kind==='sphinx'&&(model.quizDeadline?<div className="verified-sphinx-quiz"><div className="verified-quiz-clock" data-urgent={model.quizDeadline-quizNow<=5000}><strong>남은 시간 {Math.max(0,Math.ceil((model.quizDeadline-quizNow)/1000))}초</strong><progress aria-label="퀴즈 남은 시간" max={sphinxTimeLimitSeconds*1000} value={Math.max(0,model.quizDeadline-quizNow)}/></div><h3>{model.visit.question.question}</h3><div>{model.visit.question.answers.map((answer,index)=><button key={answer} disabled={disabled||quizNow>=model.quizDeadline!} onClick={()=>command({type:'answer',index})}><b>{index+1}.</b> {answer}</button>)}</div></div>:roomAction('quiz'))}
      {room.kind==='sphinx'&&<button onClick={()=>command({type:'answer',index:-1})}>영혼의 절반을 내어준다 · 체력 50% 감소</button>}
      {room.id==='erased-name'&&<><button onClick={()=>command({type:'story',action:'restore'})}>지워진 이름을 다시 새긴다</button><button onClick={()=>command({type:'story',action:'leave-name'})}>남의 무덤에 손대지 않는다</button></>}
      {room.id==='erased-name-record'&&<button onClick={()=>command({type:'story',action:'read-record'})}>먼지를 털고 기록을 읽는다</button>}
      {room.id==='nameless-guardian'&&(state.nameStory?.gateOpened?<button onClick={()=>command({type:'story',action:'claim'})}>열린 문 안을 살펴본다</button>:canAppeaseNameGuardian(state)?<button onClick={()=>command({type:'story',action:'open-gate'})}>그의 이름을 불러준다</button>:<button onClick={()=>command({type:'guardian-fight'})}>수문장과 싸운다</button>)}
     </>}
     {room.kind==='scales'&&<button onClick={()=>setTrading(true)}>판매한다</button>}
     {(room.kind!=='sphinx'||model.settled)&&<button onClick={()=>command({type:'descend'})}>{room.kind==='scales'?'아래층으로 내려간다':nextRoomLabel(state)}</button>}
    </div></div></section>}
    </>}
   {descendingFloor===null&&model.view==='doors'&&!doorTransition&&arrivedFloor===state.market.floor&&<div key={arrivedFloor} className="exploration-floor-toast is-shared-arrival" role="status" aria-label={`지하 ${arrivedFloor}층 도착`}><span>지하 <b>{arrivedFloor}</b>층</span></div>}
  </main>
  <section className="exploration-equipment-dock" aria-label="장비와 마법 관리"><div className="exploration-equipped">{(['weapon','armor'] as const).map(kind=>{const gear=(kind==='weapon'?state.weapons:state.armor).find(item=>item.id===(kind==='weapon'?state.weaponId:state.armorId))!;return <button key={kind} className="exploration-equipment" disabled={disabled} aria-label={kind==='weapon'?'주무기 교체':'주보호구 교체'} onClick={()=>{setBagTab(kind);setBag(true)}}>{gear.image?<img className="exploration-equipped-weapon" src={gear.image} alt=""/>:kind==='weapon'?<Swords/>:<Shield/>}<span><small>{kind==='weapon'?'주무기':'주보호구'}</small><strong>{gear.name}</strong></span></button>})}{[0,1].map(index=>{const spell=state.spells.find(item=>item.id===state.equippedSpells[index]);return <button key={index} className={`exploration-spell-slot ${spell?'is-equipped':'is-empty'}`} disabled={disabled} aria-label={`마법 ${index+1} 장착`} onClick={()=>{setBagTab('magic');setBag(true)}}>{spell?.image?<img className="exploration-equipped-weapon" src={spell.image} alt=""/>:<Sparkles/>}<span><small>마법 {index+1}</small><strong>{spell?.name??'마법 선택'}</strong></span></button>})}<button className="exploration-potion-loadout" aria-label="포션 보관함" disabled={disabled||!!state.combat} onClick={()=>setPotions(true)}><div>{merchantPotions.map(potion=><span key={potion.kind}><img src={potion.image} alt=""/><b>×{state.potions[potion.kind]}</b></span>)}</div><span><small>회복 물품</small><strong>포션</strong></span></button></div></section>
  <LootDialog loot={!animation?model.pendingLoot:null} onClaim={()=>{if(!disabled)command({type:'loot'})}}/>
  <SaleDialog state={state} open={trading&&model.view==='room'&&room?.kind==='scales'} onOpenChange={setTrading} busy={disabled} onSell={(kind,id)=>command({type:'sell',kind,id})}/>
  <PracticeInventory initialTab={bagTab} open={bag} onOpenChange={setBag} state={state} busy={disabled} onChange={()=>{}} onEquipChange={()=>{}} onEquip={(kind,id)=>command({type:'equip',kind,id})} onToggleSpell={id=>command({type:'spell',id})} onUsePotion={kind=>{if(!disabled)command({type:'potion',kind});return false}}/>
  <PotionChoiceDialog open={potions} onOpenChange={setPotions} state={state} busy={disabled} onUse={kind=>{if(!disabled)command({type:'potion',kind});return false}}/>
  <Dialog open={history} onOpenChange={setHistory}><DialogContent className="exploration-modal"><DialogHeader><DialogTitle>현재 탐험</DialogTitle><DialogDescription>지하 {state.market.floor}층 · 체력 {state.hp} · 탐험용 골드 {state.gold}</DialogDescription></DialogHeader><p>{model.result?.lines.join('\n')??latest}</p></DialogContent></Dialog>
  <ConfirmDialog compact open={leave} onOpenChange={setLeave} title="탐험을 마치고 나갈까요?" description={testTools||localOnly?'테스트 진행은 저장되지 않아요.':'현재 진행을 저장하고 나갑니다. 다음에 같은 층과 상태에서 이어할 수 있어요.'} confirmLabel="나가기" cancelLabel="계속 탐험" onConfirm={()=>void send({type:'leave'})}/>
 </section>,document.body)
}
