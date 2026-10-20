import {useEffect,useRef,useState} from 'react'
import {Heart,Pause,Play,ShieldCheck,ArrowUpRight} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {GameLeaveGuard} from './game-leave-guard'
import {GameStartOverlay} from './game-controls'
import type {BrickController} from './brick-breaker-scene'
import type {BrickScore} from './brick-breaker-model'

const initial:BrickScore={phase:'ready',round:1,lives:3,secured:0,pending:0,remaining:30}
export default function BrickBreakerGame(){
 const host=useRef<HTMLDivElement>(null),controller=useRef<BrickController|null>(null)
 const [score,setScore]=useState(initial),[started,setStarted]=useState(false),[ready,setReady]=useState(false),[paused,setPaused]=useState(false),[error,setError]=useState('')
 const playing=started&&(score.phase==='playing'||score.phase==='ready'||score.phase==='round-clear')
 useEffect(()=>{
  let current=true
  void import('./brick-breaker-scene').then(({createBrickGame})=>{
   if(!current||!host.current)return
   controller.current=createBrickGame(host.current,value=>{if(current)setScore(value)},()=>{if(current)setPaused(true)},()=>{if(current)setReady(true)},()=>{if(current){setReady(false);setError('게임 이미지를 불러오지 못했어요. 페이지를 새로고침해주세요.')}})
  }).catch(()=>{if(current)setError('게임 화면을 불러오지 못했어요. 페이지를 새로고침해주세요.')})
  const hide=()=>{if(document.hidden){controller.current?.pause(true);setPaused(true)}}
  const blur=()=>{controller.current?.pause(true);setPaused(true)}
  document.addEventListener('visibilitychange',hide);window.addEventListener('blur',blur)
  return()=>{current=false;document.removeEventListener('visibilitychange',hide);window.removeEventListener('blur',blur);controller.current?.destroy();controller.current=null}
 },[])
 function start(){controller.current?.start();setStarted(true);setPaused(false)}
 function pause(value:boolean){controller.current?.pause(value);setPaused(value)}
 const ended=score.phase==='over'||score.phase==='banked'
 return <section className="flex min-h-0 flex-1 flex-col bg-[#e8f0e9] pb-[env(safe-area-inset-bottom)]" aria-label="퐁이 벽돌깨기 연습">
  <GameLeaveGuard active={playing} practice/>
  <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2.5">
   <div className="flex items-center gap-2"><span className="rounded bg-secondary px-2 py-1 text-[10px] text-primary">무료 연습</span><span className="text-xs text-muted-foreground">ROUND {score.round.toString().padStart(2,'0')}</span></div>
   <div className="flex items-center gap-2"><span aria-label={`남은 목숨 ${score.lives}개`} className="flex gap-1">{[0,1,2].map(i=><Heart key={i} className={`size-3.5 ${i<score.lives?'fill-[#d5947a] text-[#d5947a]':'text-border'}`}/>)}</span><Button variant="ghost" size="icon" className="size-8" aria-label={paused?'게임 계속하기':'게임 일시정지'} disabled={!playing} onClick={()=>pause(!paused)}>{paused?<Play className="size-3.5"/>:<Pause className="size-3.5"/>}</Button></div>
  </div>
  <div className="grid shrink-0 grid-cols-2 divide-x border-b py-2 text-center tabular-nums"><div><p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground"><ShieldCheck className="size-3"/>확정 점수</p><p className="mt-0.5 text-lg text-primary">{score.secured}<span className="ml-1 text-[10px]">점</span></p></div><div><p className="text-[10px] text-muted-foreground">이번 라운드 · {score.remaining}개 남음</p><p className="mt-0.5 text-lg">{score.pending}<span className="ml-1 text-[10px] text-muted-foreground">점</span></p></div></div>
  <div className="relative min-h-0 flex-1 overflow-hidden bg-[#e8f0e9]">
   <div ref={host} className="absolute inset-0"/>
   {started&&!ended&&score.phase==='ready'&&!paused&&!error&&<Button className="absolute bottom-24 left-1/2 z-10 min-h-10 -translate-x-1/2 gap-2 rounded-full px-5 shadow-sm" onClick={()=>controller.current?.launch()}><Play className="size-3.5"/>공 발사</Button>}
   {!error&&(!started||ended)&&<GameStartOverlay poster="/arcade/brick-breaker/thumbnail.png" title={ended?`확정 ${score.secured}점 · 연습 종료`:'퐁이의 벽돌깨기'} description={ended?'완료한 라운드의 점수는 남고, 실패한 라운드 점수만 사라져요. 연습 기록은 저장되지 않아요.':'나무 널판지로 공을 튕기고 상어를 피하세요. 벽돌 1개 = 1점 · 목숨 3개'} paidDisabled practiceDisabled={!ready} onPaid={()=>{}} onPractice={start}>
    <div className="flex justify-center gap-2" aria-label="벽돌 내구도 1회부터 4회">{['#8bd2c5','#f4d792','#eaa78d','#9eafda'].map((color,i)=><span key={color} style={{background:color}} className="flex h-7 w-11 items-center justify-center rounded text-xs text-[#183f4a]">{i+1}</span>)}</div>
    <p className="text-[11px] leading-5 text-white/80">라운드 클리어 시 점수 확정<br/>실전 준비 중 · 지금은 무료 연습으로 즐겨요.</p>
   </GameStartOverlay>}
   {(error||(started&&!ended&&(score.phase==='round-clear'||paused)))&&<div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-[#edf5f0]/85 p-5 backdrop-blur-[3px]"><div className="w-full max-w-64 space-y-4 text-center">
    {error?<p role="alert" className="text-sm text-destructive">{error}</p>:score.phase==='round-clear'?<><ShieldCheck className="mx-auto size-8 text-primary"/><h2 className="text-xl">{score.round}라운드 클리어</h2><p className="text-sm">총 {score.secured}점 확정</p><p className="text-xs leading-5 text-muted-foreground">다음 라운드에서 실패해도<br/>확정한 점수는 유지돼요.</p><Button className="min-h-11 w-full gap-2" onClick={()=>{pause(false);controller.current?.next()}}>다음 라운드<ArrowUpRight className="size-4"/></Button><Button variant="outline" className="min-h-11 w-full" onClick={()=>{pause(false);controller.current?.bank()}}>여기서 점수 확보</Button></>:<><h2 className="text-xl">잠시 쉬어가요</h2><Button className="min-h-11 w-full" onClick={()=>pause(false)}>계속하기</Button></>}
   </div></div>}
  </div>
 </section>
}
