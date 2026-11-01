import {type ExplorationMode} from './campaign'
import {useEffect,useRef,useState} from 'react'
import {LockKeyhole,MessageCircle} from 'lucide-react'
import {useAuth,getNickname} from '@/components/auth-provider'
import {useSocial} from '@/features/social/social-provider'
import {useOperator} from '@/features/notices/use-operator'
import {GameTabs,GameStartOverlay,type GameTab} from '@/features/arcade/game-controls'
import {GamePanel,GameStage} from '@/features/arcade/game-layout'
import {ExplorationGame} from './exploration-game'
import {ExplorationCodex} from './codex'
import {ExplorationFeedback} from './exploration-feedback'
import {commandExploration} from './reward-api'
import {VerifiedExplorationGame} from './verified-exploration-game'
import {randomId} from '@/lib/random-id'
import './exploration.css'
import './exploration-hud.css'
import './exploration-usability.css'
import './exploration-combat.css'
import './exploration-header.css'

export function ExplorationPage(){
 const {operator,loading}=useOperator()
 const {session,recovery}=useAuth(),{profile}=useSocial()
 const [playing,setPlaying]=useState(false),[mode,setMode]=useState<ExplorationMode>('practice')
 const [tab,setTab]=useState<GameTab>('game')
 const [runId,setRunId]=useState<string>(),[starting,setStarting]=useState(false),[startError,setStartError]=useState('')
 const pendingStart=useRef<string|undefined>(undefined),startLock=useRef(false),owner=useRef(session?.user.id);owner.current=session?.user.id
 const fullscreenRequest=useRef(0)
 useEffect(()=>{if(!playing)fullscreenRequest.current++},[playing])
 useEffect(()=>()=>{fullscreenRequest.current++},[])
 useEffect(()=>{setPlaying(false);pendingStart.current=undefined;setRunId(undefined);setStartError('')},[session?.user.id])
 useEffect(()=>{if(recovery||mode==='test'&&!loading&&!operator)setPlaying(false)},[loading,operator,mode,recovery])
 async function enter(selected:ExplorationMode){
  if(!session||recovery||selected==='test'&&(!operator||loading))return
  if(startLock.current)return
  const account=session.user.id
  startLock.current=true;setStarting(true);setStartError('')
  try{
   if(selected==='practice'){
    pendingStart.current??=randomId()
    const receipt=await commandExploration({runId:pendingStart.current,operationId:pendingStart.current,revision:-1,action:{type:'start'}})
    if(owner.current!==account)return
    if(receipt.abandoned||receipt.finishedAt){pendingStart.current=undefined;throw Error('EXPLORATION_CLOSED')}
    setRunId(receipt.id);pendingStart.current=undefined
   }else setRunId(undefined)
  }catch(cause){if((cause as {definitive?:boolean}).definitive)pendingStart.current=undefined;if(owner.current===account)setStartError('탐험 서버에 연결하지 못했어요. 같은 시작 요청으로 다시 확인해주세요.');return}
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
  <GameTabs id="exploration" value={tab} onChange={setTab} secondaryLabel="피드백" secondaryIcon={MessageCircle}/>
  <GamePanel id="exploration" hidden={tab!=='game'}>
   <GameStage>
    <GameStartOverlay
     title="파라오의 황금해"
     description="세 개의 문 너머, 지하 50층의 황금왕에게 도전하세요."
     poster="/arcade/exploration/thumbnail.webp"
     fee={0}
     paidDisabled={!session||!!recovery||starting}
     onPaid={()=>enter('practice')}
     onPractice={operator&&!loading?()=>enter('test'):undefined}
     practiceLabel="테스트"
     practiceDisabled={!session||!!recovery||starting}
     rules={['문을 선택하고 무기·방어구·마법을 모아 성장해요.','몬스터와 보스를 물리치며 지하 50층까지 내려가요.','황금왕을 쓰러뜨리고 탐험을 완료하면 2,000골드를 받아요. 테스트에는 지급되지 않아요.','체력이 0이 되면 탐험이 끝나고, 처음부터 다시 도전해요.']}
    >
     <ExplorationCodex/>
     {startError&&<p role="alert">{startError}</p>}
     <p className="text-xs leading-5 text-white/65">{!session?<><LockKeyhole className="mr-1 inline size-3"/>로그인 후 탐험할 수 있어요.</>:'탐험용 골드와 물품은 이번 탐험에서만 사용해요.'}</p>
     {operator&&!loading&&<p className="text-xs leading-5 text-white/65">테스트는 운영자 전용이며, 방 선택과 테스트 물품을 사용할 수 있어요.</p>}
    </GameStartOverlay>
   </GameStage>
  </GamePanel>
  <div role="tabpanel" id="exploration-rank-panel" aria-labelledby="exploration-rank-tab" hidden={tab!=='rank'} className={`${tab==='rank'?'flex':'hidden'} min-h-0 min-w-0 flex-1 flex-col overflow-y-auto`}>
   <ExplorationFeedback key={`feedback:${session?.user.id??'guest'}`} owner={session?.user.id}/>
  </div>
  {session&&!recovery&&playing&&(mode==='practice'||operator&&!loading)&&(mode==='practice'&&runId?<VerifiedExplorationGame runId={runId} key={`game:${session.user.id}:${runId}`} nickname={getNickname(session)||'탐험가'} avatarPath={profile?.avatar_path} onLeave={()=>setPlaying(false)}/>:<ExplorationGame mode={mode} key={`game:${session.user.id}`} nickname={getNickname(session)||'탐험가'} avatarPath={profile?.avatar_path} onLeave={()=>setPlaying(false)}/>)}
 </section>
}
