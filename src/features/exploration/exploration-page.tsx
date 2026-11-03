import {localExplorationEnabled} from './local-growth-model'
import {type ExplorationMode} from './campaign'
import {useEffect,useRef,useState} from 'react'
import {LockKeyhole,MessageCircle} from 'lucide-react'
import {useAuth,getNickname} from '@/components/auth-provider'
import {useSocial} from '@/features/social/social-provider'
import {useOperator} from '@/features/notices/use-operator'
import {GameMenuTabs,GameStartOverlay} from '@/features/arcade/game-controls'
import {appArt} from '@/components/app-art'
import {GamePanel,GameStage} from '@/features/arcade/game-layout'
import {TestExplorationGame} from './test-exploration-game'
import {ExplorationCodex} from './codex'
import {ExplorationFeedback} from './exploration-feedback'
import {ExplorationRanking} from './exploration-ranking'
import {commandExploration,type ExplorationRequest} from './reward-api'
import {readSavedExploration} from './saved-run-api'
import {useAccountResource} from '@/lib/account-query'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {Button} from '@/components/ui/button'
import {VerifiedExplorationGame} from './verified-exploration-game'
import {randomId} from '@/lib/random-id'
import './exploration.css'
import './exploration-hud.css'
import './exploration-usability.css'
import './exploration-combat.css'
import './exploration-header.css'
import './exploration-desktop.css'
const explorationStartsPaused = false

export function ExplorationPage(){
 const {operator,loading}=useOperator()
 const {session,recovery}=useAuth(),{profile}=useSocial()
 const [playing,setPlaying]=useState(false),[mode,setMode]=useState<ExplorationMode>('practice')
 const [tab,setTab]=useState<'game'|'feedback'|'rank'>('game')
 const [runId,setRunId]=useState<string>(),[starting,setStarting]=useState(false),[startError,setStartError]=useState('')
 const [confirmNew,setConfirmNew]=useState(false)
 const savedQuery=useAccountResource('exploration-saved-run',readSavedExploration,{enabled:!playing&&!localExplorationEnabled,staleTime:0})
 const saved=localExplorationEnabled?undefined:savedQuery.data
 const pendingResume=useRef<ExplorationRequest|undefined>(undefined)
 const pendingStart=useRef<string|undefined>(undefined),startLock=useRef(false),owner=useRef(session?.user.id);owner.current=session?.user.id
 const fullscreenRequest=useRef(0)
 useEffect(()=>{if(!playing)fullscreenRequest.current++},[playing])
 useEffect(()=>()=>{fullscreenRequest.current++},[])
 useEffect(()=>{setPlaying(false);pendingStart.current=undefined;pendingResume.current=undefined;setConfirmNew(false);setRunId(undefined);setStartError('')},[session?.user.id])
 useEffect(()=>{if(recovery||mode==='test'&&!loading&&!operator)setPlaying(false)},[loading,operator,mode,recovery])
 async function enter(selected:ExplorationMode,resume=false){
  if(!session||recovery||selected==='test'&&(!operator||loading))return
  if(startLock.current)return
  const account=session.user.id
  startLock.current=true;setStarting(true);setStartError('')
  try{
   if(selected==='practice'&&!localExplorationEnabled){
    let request:ExplorationRequest
    if(resume){
     if(!saved)throw Error('NO_SAVED_EXPLORATION')
     pendingResume.current??={runId:saved.id,operationId:randomId(),revision:saved.revision,action:{type:'resume'}}
     request=pendingResume.current
    }else{
     if(explorationStartsPaused)throw Error('EXPLORATION_START_PAUSED')
     pendingStart.current??=randomId()
     request={runId:pendingStart.current,operationId:pendingStart.current,revision:-1,action:{type:'start',growthVersion:1,balanceVersion:2}}
    }
    const receipt=await commandExploration(request)
    if(owner.current!==account)return
    if(receipt.abandoned||receipt.finishedAt){pendingStart.current=undefined;throw Error('EXPLORATION_CLOSED')}
    setRunId(receipt.id);pendingStart.current=undefined;pendingResume.current=undefined
   }else setRunId(undefined)
  }catch(cause){if((cause as {definitive?:boolean}).definitive){pendingStart.current=undefined;pendingResume.current=undefined;if(owner.current===account)void savedQuery.refetch()}if(owner.current===account)setStartError(cause instanceof Error&&cause.message==='EXPLORATION_START_PAUSED'?'버그 점검으로 실전 탐험 신규 입장을 잠시 중단했습니다.':resume?'저장된 탐험을 불러오지 못했어요. 다시 눌러 같은 요청을 확인해주세요.':'탐험 서버에 연결하지 못했어요. 같은 시작 요청으로 다시 확인해주세요.');return}
  finally{startLock.current=false;setStarting(false)}
  setMode(selected);setPlaying(true)
  const request=++fullscreenRequest.current
  if(window.matchMedia('(pointer: coarse)').matches&&!document.fullscreenElement){
   void document.documentElement.requestFullscreen?.().then(async()=>{
    if(request!==fullscreenRequest.current){if(document.fullscreenElement)await document.exitFullscreen();return}
   }).catch(()=>{/* The portrait viewport also works without native fullscreen. */})
  }
 }
 return <section className="exploration-lobby exploration-arcade-lobby" aria-label="탐험">
  <GameMenuTabs id="exploration" value={tab} onChange={setTab} tabs={[
   {value:'game',label:'게임 플레이',icon:appArt.gameplay},
   {value:'feedback',label:'피드백',icon:MessageCircle},
   {value:'rank',label:'랭킹',icon:appArt.ranking},
  ]}/>
  <GamePanel id="exploration" hidden={tab!=='game'}>
   <GameStage>
    <GameStartOverlay
     title="파라오의 황금해"
     description="세 개의 문 너머, 지하 80층의 황금가면에게 도전하세요."
     poster="/arcade/exploration/thumbnail.webp"
     fee={0}
     paidLabel={saved?'이어하기':undefined}
     paidDisabled={(!saved&&explorationStartsPaused)||!session||!!recovery||starting||(!localExplorationEnabled&&(savedQuery.isPending||!!savedQuery.error))}
     onPaid={()=>enter('practice',!!saved)}
     extraAction={saved?<Button variant="secondary" className="min-h-14 rounded-none text-xs" disabled={explorationStartsPaused||starting||!!recovery} onClick={()=>setConfirmNew(true)}>새로 시작하기</Button>:undefined}
     onPractice={operator&&!loading?()=>enter('test'):undefined}
     practiceLabel="테스트"
     practiceDisabled={!session||!!recovery||starting}
     rules={['문을 선택하고 무기·방어구·마법을 모아 성장해요.','몬스터와 보스를 물리치며 지하 80층까지 내려가요.','50층 라세프 처치 시 2,000골드, 80층 최종 완료 시 추가 2,000골드를 받아요. 테스트에는 지급되지 않아요.','체력이 0이 되면 탐험이 끝나요. 이미 받은 50층 보상은 유지돼요.']}
    >
     <ExplorationCodex/>
     {localExplorationEnabled&&<p role="status" className="text-xs leading-5 text-amber-100">로컬 실전 · 성장 시스템 테스트 중입니다. 운영 진행·저장·보상에는 반영되지 않아요.</p>}
     {saved&&<p className="text-sm text-amber-100">저장된 탐험 · 지하 {saved.floor}층</p>}
     {savedQuery.error&&<div role="alert" className="text-xs">저장된 탐험을 확인하지 못했어요.<button className="ml-2 underline" onClick={()=>void savedQuery.refetch()}>다시 확인</button></div>}
     {explorationStartsPaused&&<p role="status" className="text-sm leading-6 text-amber-200">🛠️ 버그 점검으로 실전 탐험 신규 입장을 잠시 중단했습니다. 진행 중인 탐험은 계속 이용하실 수 있습니다.</p>}
     {startError&&<p role="alert">{startError}</p>}
     <p className="text-xs leading-5 text-white/65">{!session?<><LockKeyhole className="mr-1 inline size-3"/>로그인 후 탐험할 수 있어요.</>:'탐험용 골드와 물품은 이번 탐험에서만 사용해요.'}</p>
     {operator&&!loading&&<p className="text-xs leading-5 text-white/65">테스트에서는 모든 무기·마법과 테스트 물품이 제공돼요. 실제 보상과 휴식방 저장은 적용되지 않아요.</p>}
    </GameStartOverlay>
   </GameStage>
  </GamePanel>
  <div role="tabpanel" id="exploration-feedback-panel" aria-labelledby="exploration-feedback-tab" hidden={tab!=='feedback'} className={`${tab==='feedback'?'flex':'hidden'} min-h-0 min-w-0 flex-1 flex-col overflow-y-auto`}>
   <ExplorationFeedback key={`feedback:${session?.user.id??'guest'}`} owner={session?.user.id}/>
  </div>
  <div role="tabpanel" id="exploration-rank-panel" aria-labelledby="exploration-rank-tab" hidden={tab!=='rank'} className={`${tab==='rank'?'flex':'hidden'} min-h-0 min-w-0 flex-1 flex-col overflow-y-auto`}>
   {tab==='rank'&&(session&&!recovery?<ExplorationRanking key={`ranking:${session.user.id}`}/>:<p className="p-4 text-sm text-muted-foreground">로그인 후 탐험 랭킹을 볼 수 있어요.</p>)}
  </div>
  <ConfirmDialog open={confirmNew} onOpenChange={setConfirmNew} title="새 탐험을 시작할까요?" description="저장된 탐험을 종료하고 처음부터 시작해요. 이미 받은 골드 보상은 유지돼요." confirmLabel="새로 시작하기" busy={starting} confirmDisabled={explorationStartsPaused} onConfirm={()=>{setConfirmNew(false);void enter('practice')}}/>
  {session&&!recovery&&playing&&(mode==='practice'||operator&&!loading)&&(localExplorationEnabled&&mode==='practice'?<TestExplorationGame localPractice key={`local:${session.user.id}`} nickname={getNickname(session)||'tester'} avatarPath={profile?.avatar_path} onLeave={()=>setPlaying(false)}/>:mode==='practice'&&runId?<VerifiedExplorationGame runId={runId} key={`game:${session.user.id}:${runId}`} nickname={getNickname(session)||'탐험가'} avatarPath={profile?.avatar_path} onLeave={()=>setPlaying(false)}/>:<TestExplorationGame key={`game:${session.user.id}`} nickname={getNickname(session)||'탐험가'} avatarPath={profile?.avatar_path} onLeave={()=>setPlaying(false)}/>)}
 </section>
}
