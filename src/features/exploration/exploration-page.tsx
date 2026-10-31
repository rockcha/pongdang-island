import {practiceFinalFloor,type ExplorationMode} from './campaign'
import {useEffect,useRef,useState} from 'react'
import {ArrowDown,Compass,LockKeyhole,Shield,Swords} from 'lucide-react'
import {useAuth,getNickname} from '@/components/auth-provider'
import {useSocial} from '@/features/social/social-provider'
import {useOperator} from '@/features/notices/use-operator'
import {pharaohArt} from '@/features/regions/pharaoh-art'
import {ExplorationGame} from './exploration-game'
import {ExplorationCodex} from './codex'
import {ExplorationFeedback} from './exploration-feedback'
import './exploration.css'
import './exploration-hud.css'

export function ExplorationPage(){
 const {operator,loading}=useOperator()
 const {session,recovery}=useAuth(),{profile}=useSocial()
 const [playing,setPlaying]=useState(false),[mode,setMode]=useState<ExplorationMode>('practice')
 const fullscreenRequest=useRef(0)
 useEffect(()=>{if(!playing)fullscreenRequest.current++},[playing])
 useEffect(()=>()=>{fullscreenRequest.current++},[])
 useEffect(()=>{setPlaying(false)},[session?.user.id])
 useEffect(()=>{if(recovery||mode==='test'&&!loading&&!operator)setPlaying(false)},[loading,operator,mode,recovery])
 function enter(selected:ExplorationMode){
  if(!session||recovery||selected==='test'&&(!operator||loading))return
  setMode(selected);setPlaying(true)
  const request=++fullscreenRequest.current
  // Native fullscreen is optional; keep the device's current orientation.
  if(window.matchMedia('(pointer: coarse)').matches&&!document.fullscreenElement){
   void document.documentElement.requestFullscreen?.().then(async()=>{
    if(request!==fullscreenRequest.current){if(document.fullscreenElement)await document.exitFullscreen();return}
   }).catch(()=>{/* The portrait viewport also works without native fullscreen. */})
  }
 }
 return <section className="exploration-lobby" aria-label="탐험">
  <header className="exploration-intro"><span className="exploration-eyebrow"><Compass size={14}/> EXPLORE THE UNKNOWN</span><h1>탐험</h1><p>바다 아래, 아직 쓰이지 않은 이야기.</p></header>
  <div className="exploration-map-heading"><h2>탐험할 지도</h2><span>01</span></div>
  <article className="exploration-map">
   <img src={pharaohArt.scenery} alt="파라오의 황금해"/>
   <div className="exploration-map-shade"/>
   <div className="exploration-map-content"><span className="exploration-map-tag">지하 탐험 · 실전연습</span><h2>파라오의 황금해</h2><p>황금빛 바다 아래 잠든 지하실.<br/>그 입구에서 첫 발을 내딛습니다.</p><div className="exploration-map-bottom"><span><ArrowDown size={14}/> 지하실 입구</span><span>지하 1층</span></div></div>
  </article>
  <ExplorationCodex/>
  <div className="exploration-starters"><span><Swords size={15}/> 무딘 단검</span><span><Shield size={15}/> 낡은 잠수복</span></div>
  <div className={`exploration-mode-buttons${operator&&!loading?'':' is-practice-only'}`}>
   <button aria-label="실전연습" className="exploration-enter" disabled={!session||!!recovery} onClick={()=>enter('practice')}><ArrowDown size={18}/><span><strong>실전연습</strong><small>100 골드 · 포션 0개 · {practiceFinalFloor}층 보스 격파</small></span></button>
   {operator&&!loading&&<button aria-label="테스트" className="exploration-enter is-test" onClick={()=>enter('test')}><Swords size={18}/><span><strong>운영자 테스트</strong><small>100,000 골드 · 방 직접 선택</small></span></button>}
  </div>
  <p className="exploration-lobby-note">{!session?<><LockKeyhole size={12}/> 로그인 후 탐험할 수 있어요.</>:'탐험용 골드와 물품은 이번 연습에서만 사용되며, 진행은 저장되지 않아요.'}</p>
  <ExplorationFeedback key={`feedback:${session?.user.id??'guest'}`} owner={session?.user.id}/>
  {session&&!recovery&&playing&&(mode==='practice'||operator&&!loading)&&<ExplorationGame mode={mode} key={`game:${session.user.id}`} nickname={getNickname(session)||'탐험가'} avatarPath={profile?.avatar_path} onLeave={()=>setPlaying(false)}/>}
 </section>
}
