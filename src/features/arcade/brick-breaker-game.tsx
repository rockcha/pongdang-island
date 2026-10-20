import {useCallback,useEffect,useRef,useState} from 'react'
import {Pause,Play,ShieldCheck,ArrowUpRight} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {GameModal} from './game-modal'
import {useAuth} from '@/components/auth-provider'
import {BRICK_ENGINE_VERSION} from './brick-breaker-replay'
import {BrickRanking} from './brick-ranking'
import {useGold} from '@/features/gold/gold-provider'
import {randomId} from '@/lib/random-id'
import {startBrickRun,settleBrickRun,brickError} from './brick-breaker-api'
import type {BrickRun} from './brick-breaker-api'
import {GameStartOverlay,GameTabs} from './game-controls'
import type {BrickController,BrickMode} from './brick-breaker-scene'
import {BrickMovementControls} from './brick-movement-controls'
import {BrickEffectBadges} from './brick-effect-badges'
import {BrickGameHud} from './brick-game-hud'
import {BrickLifeOverlay} from './brick-life-overlay'
import {brickRound,MAX_BRICK_ROUNDS} from './brick-breaker-rounds'
import type {BrickScore,DropKind} from './brick-breaker-model'
import {dropArtwork} from './brick-breaker-artwork'
import {BRICK_COUNT} from './brick-breaker-config'

const testDrops:{kind:DropKind;icon:string;name:string;detail:string}[]=[
 {kind:'poison',icon:'🧪',name:'독극물 병',detail:'독액 3방울 · 닿으면 생명 −1'},
 {kind:'item',icon:'🚀',name:'수중 미사일',detail:'양쪽으로 수중 미사일 2발'},
 {kind:'wide',icon:'🪵',name:'긴 널판지',detail:'8초 동안 널판지 확장'},
 {kind:'shield',icon:'🫧',name:'물방울 보호막',detail:'방해물 보호 1회 · 중첩 없음'},
 {kind:'split',icon:'🦪',name:'진주 분열',detail:'다음 패들 반사 때 공 2개 발사'},
 {kind:'heart',icon:'❤️',name:'하트 회복',detail:'생명력 +1 · 최대 3개'},
 {kind:'magnet',icon:'🧲',name:'집게 자석',detail:'다음 공을 붙잡고 원하는 때 발사'},
 {kind:'wave',icon:'🌊',name:'파도 탄환',detail:'즉시 전방 발사 · 끝까지 관통 · 피해 1'},
 {kind:'dash',icon:'🦦',name:'돌진하는 퐁이',detail:'위로 돌진 · 처음 맞는 벽돌 1개 즉시 파괴'},
 {kind:'star',icon:'⭐',name:'불가사리 표창',detail:'회전 표창 5연발 · 각각 피해 1'},
 {kind:'pirate',icon:'🪙',name:'해적의 동전',detail:'획득 즉시 보상 +20 골드'},
 {kind:'whale',icon:'🐋',name:'혹등고래의 노래',detail:'남아 있는 가장 아래 줄 전체에 피해 1'},
 {kind:'treasure',icon:'💰',name:'해적의 보물',detail:'획득 즉시 보상 +50 골드'},
 {kind:'anchor',icon:'⚓',name:'무거운 닻',detail:'쇠사슬 낙하 · 점점 가속 · 생명 −1'},
 {kind:'torpedo',icon:'💣',name:'어뢰',detail:'가까운 양 끝으로 이동 · 10초 후 폭발 · 반경 2칸'},
 {kind:'jelly',icon:'🪼',name:'독해파리',detail:'좌우로 흐물흐물 · 느린 하강 · 생명 −1'},
 {kind:'shark',icon:'🦈',name:'돌진 상어',detail:'맞으면 목숨 −1'},
 {kind:'urchin',icon:'🦔',name:'성게 트리오',detail:'좁게 퍼지는 성게 3개 · 생명 −1'},
 {kind:'ink',icon:'🐙',name:'먹물 문어',detail:'6초 동안 일부 시야 가림'},
 {kind:'seaweed',icon:'🌶️',name:'매운 해초',detail:'6초 동안 공 속도 ×1.5'},
 {kind:'puffer',icon:'🐡',name:'양갈래 복어',detail:'두 갈래로 천천히 유영 · 생명 −1'},
 {kind:'sticky',icon:'💧',name:'끈끈이 액체',detail:'6초 동안 패들 이동 속도 ×0.5'},
 {kind:'shrink',icon:'🪵',name:'널판지 축소',detail:'6초 동안 널판지가 짧아져요'},
]


const initial:BrickScore={phase:'ready',round:1,lives:3,remaining:BRICK_COUNT}
export default function BrickBreakerGame(){const {session}=useAuth();return <AccountBrickGame key={session?.user.id??'guest'}/>}
function AccountBrickGame(){
 const gold=useGold(),host=useRef<HTMLDivElement>(null),controller=useRef<BrickController|null>(null)
 const move=useCallback((direction:-1|0|1)=>controller.current?.setDirection(direction),[])
 const target=useCallback((position:number|null)=>controller.current?.setTarget(position),[])
 const [tab,setTab]=useState<'game'|'rank'>('game'),[score,setScore]=useState(initial),[mode,setMode]=useState<BrickMode|null>(null)
 const [ready,setReady]=useState(false),[paused,setPaused]=useState(false),[error,setError]=useState(''),[networkError,setNetworkError]=useState(''),[busy,setBusy]=useState(false)
 const paidRun=useRef<BrickRun|null>(null),operation=useRef<string|null>(null),queue=useRef<Promise<unknown>>(Promise.resolve()),requestLock=useRef(false),alive=useRef(true)
 const started=mode!==null,lab=mode==='lab',paid=mode==='paid',ended=score.phase==='over'||score.phase==='banked'
 const previousLives=useRef(3),[lifeLoss,setLifeLoss]=useState(0)
 useEffect(()=>{
  let current=true
  let instance:BrickController|null=null
  alive.current=true
  void import('./brick-breaker-scene').then(({createBrickGame})=>{if(!current||!host.current)return;instance=createBrickGame(host.current,value=>{if(current){if(value.lives<previousLives.current&&value.lives>0){setLifeLoss(value.lives);instance?.pause(true)}previousLives.current=value.lives;setScore(value)}},()=>{if(current)setPaused(true)},()=>{if(current)setReady(true)},()=>{if(current){setReady(false);setError('게임 이미지를 불러오지 못했어요. 새로고침해주세요.')}});controller.current=instance}).catch(()=>{if(current)setError('게임 화면을 불러오지 못했어요. 새로고침해주세요.')})
  const hide=()=>{if(document.hidden){controller.current?.pause(true);setPaused(true)}}
  const blur=()=>{controller.current?.pause(true);setPaused(true)}
  document.addEventListener('visibilitychange',hide);window.addEventListener('blur',blur)
  return()=>{current=false;alive.current=false;document.removeEventListener('visibilitychange',hide);window.removeEventListener('blur',blur);instance?.destroy();if(controller.current===instance)controller.current=null}
 },[])
 function pause(value:boolean){const next=value||lifeLoss>0;controller.current?.pause(next);setPaused(next)}
 function continueAfterLoss(){setLifeLoss(0);controller.current?.pause(false);setPaused(false);controller.current?.launch()}
 function start(nextMode:BrickMode){if(requestLock.current||busy)return;previousLives.current=3;setLifeLoss(0);setNetworkError('');setMode(nextMode);controller.current?.start(nextMode);setPaused(false)}
 async function startPaid(){
  if(requestLock.current)return;requestLock.current=true;setBusy(true);setNetworkError('');operation.current??=randomId()
  try{
   let run=await startBrickRun(operation.current)
   if(!alive.current)return
   // Preserve already verified legacy gold before starting with the new rules.
   if(run.engine_version===1&&!run.finished_at){await settleBrickRun(run.id,run.replay,true);operation.current=randomId();run=await startBrickRun(operation.current)}
   if(!alive.current)return
   if(run.engine_version!==BRICK_ENGINE_VERSION)throw new Error('ENGINE_VERSION_MISMATCH')
   if(run.finished_at){operation.current=null;throw new Error('FINISHED_OPERATION')}
   paidRun.current=run;operation.current=null;previousLives.current=0;setLifeLoss(0);setMode('paid');controller.current?.start('paid',Number(run.seed),run.replay);setPaused(false);void gold.refresh()
  }
  catch(cause){if(alive.current)setNetworkError(brickError(cause))}finally{requestLock.current=false;if(alive.current)setBusy(false)}
 }
 function settle(final:boolean){
  if(!paidRun.current||!controller.current)return Promise.resolve()
  const replay=controller.current.replay(),id=paidRun.current.id
  const task=queue.current.catch(()=>{}).then(async()=>{setBusy(true);try{const run=await settleBrickRun(id,replay,final);paidRun.current=run;if(alive.current){setNetworkError('');void gold.refresh()}}catch(cause){if(alive.current)setNetworkError(brickError(cause));throw cause}finally{if(alive.current)setBusy(false)}})
  queue.current=task;return task
 }
 useEffect(()=>{if(paid&&(score.phase==='round-clear'||ended))void settle(ended).catch(()=>{})},[paid,score.phase,score.round,ended]) // eslint-disable-line react-hooks/exhaustive-deps
 async function exit(){if(paid)await settle(true);controller.current?.stop();paidRun.current=null;setMode(null);setScore(initial);previousLives.current=3;setPaused(false);setLifeLoss(0);setNetworkError('')}
 async function next(){if(paid){try{await settle(score.round>=MAX_BRICK_ROUNDS)}catch{return}}pause(false);controller.current?.next()}
 return <div className="flex min-h-0 flex-1 flex-col">
  <GameTabs id="brick" value={tab} onChange={setTab}/>
  {tab==='rank'&&<BrickRanking/>}
  <div id="brick-game-panel" role="tabpanel" aria-labelledby="brick-game-tab" className={tab==='game'?'flex min-h-0 flex-1 flex-col':'hidden'}>
   <GameModal open={started} title="퐁이의 벽돌깨기" active={started&&!ended} practice={!paid} onExit={exit} onPause={pause} busy={busy} modeLabel={lab?'모션':paid?'실전':'연습'} headerClassName="bg-[#38291f] text-[#fff1dd] border-[#e7c19b]/15" headerActions={<Button variant="ghost" size="icon" aria-label={paused?'게임 계속하기':'게임 일시정지'} disabled={ended||busy||lifeLoss>0} onClick={()=>pause(!paused)}>{paused?<Play className="size-4"/>:<Pause className="size-4"/>}</Button>}>
    {()=><section className="brick-layout flex min-h-0 flex-1 flex-col bg-[#38291f]" aria-label="퐁이 벽돌깨기 연습">
     {started&&!lab&&<div className="brick-hud"><BrickGameHud score={score} practice={!paid}/></div>}
     {started&&<div className="brick-effects h-10 shrink-0 overflow-hidden"><BrickEffectBadges effects={score.effects??[]}/></div>}
     <div className="brick-stage relative min-h-0 flex-1 overflow-hidden">
      <div ref={host} className="absolute inset-0"/>
      {started&&!ended&&lifeLoss>0&&<BrickLifeOverlay lives={score.lives} busy={busy} onContinue={continueAfterLoss}/>}
      {started&&!lab&&!ended&&(score.phase==='ready'||score.held)&&!lifeLoss&&!paused&&!error&&<Button className="absolute top-1/2 left-1/2 z-10 min-h-14 -translate-x-1/2 -translate-y-1/2 gap-2 rounded-xl bg-[#9b643c] px-8 text-lg text-white hover:bg-[#ad7549]" disabled={busy} onClick={()=>controller.current?.launch()}><Play className="size-4"/>{score.held?'공 다시 발사':'시작하기'}</Button>}
      {!error&&!started&&<GameStartOverlay fee={0} poster="/arcade/brick-breaker/thumbnail.png" title="퐁이의 벽돌깨기" description="무료로 도전하고, 라운드를 클리어해 골드를 모아요." rules={['5개 라운드의 클리어 보상과 획득한 동전·보물이 누적돼요.','방해물과 공을 놓치는 순간을 조심하세요. 목숨은 3개예요.','중간에 끝나도 이미 모은 보상은 유지돼요.']} paidDisabled={!ready||busy} practiceDisabled={!ready||busy} onPaid={()=>void startPaid()} onPractice={()=>start('practice')} extraAction={<Button variant="ghost" aria-label="모션" disabled={!ready||busy} className="min-h-14 min-w-0 gap-1 rounded-none border-l px-1 text-xs" onClick={()=>start('lab')}>모션</Button>}>
       <p className="text-xs text-white/50">연습·모션은 골드 소모와 보상이 없어요.</p>
      </GameStartOverlay>}
      {started&&ended&&<div className="absolute inset-0 z-20 flex items-center justify-center bg-[#14252b]/95 p-6 text-center text-[#fff1dd]"><div className="space-y-5"><p className="text-xs tracking-widest text-[#e7c19b]/60">{score.phase==='banked'?'ALL CLEAR':'GAME OVER'}</p><h2 className="text-xl">{score.phase==='banked'?'모든 라운드 클리어!':'이번 도전은 여기까지'}</h2><div className="rounded-2xl border border-[#e7c19b]/15 bg-white/5 px-8 py-5"><p className="text-xs text-[#e7c19b]/70">현재 누적 보상</p><p className="mt-2 text-3xl font-semibold text-[#f2cf91]">{score.reward??0}<span className="ml-2 text-sm">G</span></p></div><p className="text-xs text-white/60">{paid?'서버에서 확인한 보상이 지급돼요.':'연습 · 실제 지급 없음'}</p><Button className="min-h-12 w-full rounded-xl" disabled={busy} onClick={()=>void exit().catch(()=>{})}>시작 화면으로</Button></div></div>}
      {(error||(started&&!ended&&(score.phase==='round-clear'||(paused&&!lifeLoss))))&&<div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/85 p-5 text-white"><div className="w-full max-w-64 space-y-4 text-center">
       {error?<p role="alert">{error}</p>:score.phase==='round-clear'?<><ShieldCheck className="mx-auto size-8"/><h2 className="text-xl">{score.round>=MAX_BRICK_ROUNDS?'모든 라운드 클리어!':score.round+'라운드 클리어'}</h2><p className="text-lg text-[#ffe0a0]">클리어 보상 +{score.roundReward??brickRound(score.round).reward} G</p><p className="text-sm">확보한 보상 {score.reward??0} G</p>{!paid&&<p className="text-xs text-white/60">연습 · 실제 지급 없음</p>}<Button className="min-h-11 w-full" disabled={busy} onClick={()=>void next()}>{score.round>=MAX_BRICK_ROUNDS?'결과 보기':'다음 라운드'}<ArrowUpRight className="size-4"/></Button></>:<><h2 className="text-xl">잠시 쉬어가요</h2><Button className="min-h-11 w-full" disabled={busy} onClick={()=>pause(false)}>계속하기</Button></>}
      </div></div>}
      {networkError&&<div role="alert" className="absolute inset-x-3 bottom-3 z-30 rounded-lg border bg-background p-3 text-sm text-foreground">{networkError}{paid&&<Button variant="ghost" disabled={busy} onClick={()=>void settle(ended).catch(()=>{})}>다시 확인</Button>}</div>}
     </div>
     {lab&&<div className="brick-lab-panel"><div id="brick-test-list" aria-label="아이템·방해물 테스트 목록" className="grid max-h-44 shrink-0 grid-cols-2 gap-2 overflow-y-auto border-t bg-background p-2">{testDrops.map(drop=><Button key={drop.kind} variant="outline" className="min-h-14 min-w-0 justify-start gap-2 px-2" disabled={!ready} onClick={()=>{pause(false);controller.current?.previewSkill(drop.kind)}}><span aria-hidden="true" className="relative size-9 shrink-0 overflow-hidden"><img src={dropArtwork[drop.kind].preview??dropArtwork[drop.kind].src} alt="" className={dropArtwork[drop.kind].sheet&&!dropArtwork[drop.kind].preview?'absolute left-0 top-0 size-18 max-w-none':'size-9 object-contain'}/></span><span className="min-w-0 text-left whitespace-normal"><span className="block text-sm">{drop.name}</span><span className="block text-xs font-normal text-muted-foreground">{drop.detail}</span></span></Button>)}</div></div>}
     {started&&<div className="brick-controls shrink-0"><BrickMovementControls enabled={!ended&&!lifeLoss&&!paused&&!error&&!busy&&score.phase!=='round-clear'} onDirection={move} onTarget={target}/></div>}
    </section>}
   </GameModal>
  </div>
 </div>
}
