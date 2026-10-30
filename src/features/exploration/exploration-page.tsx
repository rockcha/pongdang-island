import {useEffect,useRef,useState} from 'react'
import {ArrowDown,Compass,LockKeyhole,Shield,Swords} from 'lucide-react'
import {useAuth,getNickname} from '@/components/auth-provider'
import {useSocial} from '@/features/social/social-provider'
import {useOperator} from '@/features/notices/use-operator'
import {pharaohArt} from '@/features/regions/pharaoh-art'
import {ExplorationGame} from './exploration-game'
import './exploration.css'

export function ExplorationPage(){
 const {operator,loading}=useOperator()
 const {session}=useAuth(),{profile}=useSocial()
 const [playing,setPlaying]=useState(false)
 const fullscreenRequest=useRef(0)
 useEffect(()=>{if(!playing)fullscreenRequest.current++},[playing])
 useEffect(()=>()=>{fullscreenRequest.current++},[])
 useEffect(()=>{if(!loading&&!operator)setPlaying(false)},[loading,operator])
 function enter(){
  if(!operator||loading)return
  setPlaying(true)
  const request=++fullscreenRequest.current
  // A real user gesture is needed for native fullscreen and orientation locking.
  if(window.matchMedia('(pointer: coarse)').matches&&!document.fullscreenElement){
   void document.documentElement.requestFullscreen?.().then(async()=>{
    if(request!==fullscreenRequest.current){if(document.fullscreenElement)await document.exitFullscreen();return}
    const orientation=screen.orientation as ScreenOrientation&{lock?:(value:string)=>Promise<void>}
    await orientation?.lock?.('landscape')
    if(request!==fullscreenRequest.current)orientation?.unlock?.()
   }).catch(()=>{/* The fixed viewport and rotation hint remain usable. */})
  }
 }
 return <section className="exploration-lobby" aria-label="탐험">
  <header className="exploration-intro"><span className="exploration-eyebrow"><Compass size={14}/> EXPLORE THE UNKNOWN</span><h1>탐험</h1><p>바다 아래, 아직 쓰이지 않은 이야기.</p></header>
  <div className="exploration-map-heading"><h2>탐험할 지도</h2><span>01</span></div>
  <article className="exploration-map">
   <img src={pharaohArt.scenery} alt="파라오의 황금해"/>
   <div className="exploration-map-shade"/>
   <div className="exploration-map-content"><span className="exploration-map-tag">지하 탐험 · 연습 모드</span><h2>파라오의 황금해</h2><p>황금빛 바다 아래 잠든 지하실.<br/>그 입구에서 첫 발을 내딛습니다.</p><div className="exploration-map-bottom"><span><ArrowDown size={14}/> 지하실 입구</span><span>지하 1층</span></div></div>
  </article>
  <div className="exploration-starters"><span><Swords size={15}/> 무딘 단검</span><span><Shield size={15}/> 낡은 잠수복</span></div>
  <button className="exploration-enter" disabled={loading||!operator} onClick={enter}>{loading?'입장 권한 확인 중…':operator?<><ArrowDown size={17}/> 지하 탐험 시작</>:<><LockKeyhole size={16}/> 준비 중</>}</button>
  <p className="exploration-lobby-note">{operator?'운영자 연습 · 진행과 획득 물품은 저장되지 않아요.':'지하 탐험을 준비하고 있어요. 조금만 기다려 주세요.'}</p>
  {operator&&playing&&<ExplorationGame key={session?.user.id} nickname={getNickname(session)||'탐험가'} avatarPath={profile?.avatar_path} onLeave={()=>setPlaying(false)}/>}
 </section>
}
