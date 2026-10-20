import {useEffect,useRef,useState} from 'react'
import {Heart,Pause,Play,ShieldCheck,ArrowUpRight,FlaskConical,ChevronDown} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {GameLeaveGuard} from './game-leave-guard'
import {GameStartOverlay} from './game-controls'
import type {BrickController} from './brick-breaker-scene'
import type {BrickScore,DropKind} from './brick-breaker-model'
import {dropArtwork} from './brick-breaker-artwork'

const testDrops:{kind:DropKind;icon:string;name:string;detail:string}[]=[
 {kind:'item',icon:'🚀',name:'어뢰 아이템',detail:'양쪽으로 어뢰 2발'},
 {kind:'wide',icon:'🪵',name:'긴 널판지',detail:'8초 동안 널판지 확장'},
 {kind:'shield',icon:'🫧',name:'물방울 보호막',detail:'방해물 보호 1회 · 중첩 없음'},
 {kind:'split',icon:'🦪',name:'진주 분열',detail:'다음 벽돌 충돌 위치에서 공 2개'},
 {kind:'heart',icon:'❤️',name:'하트 회복',detail:'생명력 +1 · 최대 3개'},
 {kind:'magnet',icon:'🧲',name:'집게 자석',detail:'다음 공을 붙잡고 원하는 때 발사'},
 {kind:'wave',icon:'🌊',name:'파도 탄환',detail:'다음 충돌 주변 한 칸에 피해 1'},
 {kind:'shark',icon:'🦈',name:'돌진 상어',detail:'맞으면 목숨 −1'},
 {kind:'urchin',icon:'🦔',name:'성게 트리오',detail:'회전하는 성게 3개 · 점수 −3'},
 {kind:'ink',icon:'🐙',name:'먹물 문어',detail:'6초 동안 일부 시야 가림'},
 {kind:'seaweed',icon:'🌶️',name:'매운 해초',detail:'6초 동안 공 속도 ×1.5'},
 {kind:'puffer',icon:'🐡',name:'양갈래 복어',detail:'두 갈래 발사 · 맞으면 점수 −1'},
 {kind:'sticky',icon:'💧',name:'끈끈이 액체',detail:'6초 동안 패들 이동 속도 ×0.5'},
 {kind:'shrink',icon:'🪵',name:'널판지 축소',detail:'6초 동안 널판지가 짧아져요'},
]

const initial:BrickScore={phase:'ready',round:1,lives:3,secured:0,pending:0,remaining:30}
export default function BrickBreakerGame(){
 const host=useRef<HTMLDivElement>(null),controller=useRef<BrickController|null>(null)
 const [score,setScore]=useState(initial),[started,setStarted]=useState(false),[ready,setReady]=useState(false),[paused,setPaused]=useState(false),[error,setError]=useState('')
 const [testsOpen,setTestsOpen]=useState(false)
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
 function testDrop(kind:DropKind){
  if(!ready)return
  if(!started||ended)start()
  pause(false);controller.current?.testDrop(kind)
 }
 const testPanel=<div id="brick-test-list" aria-label="아이템·방해물 테스트 목록" className="grid max-h-44 shrink-0 grid-cols-2 gap-2 overflow-y-auto border-t bg-background p-2">
  {testDrops.map(drop=><Button key={drop.kind} variant="outline" className="min-h-14 min-w-0 justify-start gap-2 px-2" disabled={!ready||(started&&!ended&&score.phase==='round-clear')} onClick={()=>testDrop(drop.kind)}><span aria-hidden="true" className="relative size-9 shrink-0 overflow-hidden"><img src={dropArtwork[drop.kind].preview??dropArtwork[drop.kind].src} alt="" className={dropArtwork[drop.kind].sheet&&!dropArtwork[drop.kind].preview?'absolute left-0 top-0 size-18 max-w-none':'size-9 object-contain'}/></span><span className="min-w-0 text-left whitespace-normal"><span className="block text-xs">{drop.name}</span><span className="block text-[9px] font-normal text-muted-foreground">{drop.detail}</span></span></Button>)}
 </div>
 return <section className="flex min-h-0 flex-1 flex-col bg-[#183139] pb-[env(safe-area-inset-bottom)]" aria-label="퐁이 벽돌깨기 연습">
  <GameLeaveGuard active={playing} practice/>
  <div className="flex h-11 shrink-0 items-center gap-2 border-b bg-background px-3 text-[10px] tabular-nums">
   <span aria-label={`${score.testMode?'아이템·방해물 테스트':'무료 연습'}, ${score.round}라운드`} className="shrink-0 whitespace-nowrap text-muted-foreground">{score.testMode?'테스트':'연습'}<span className="mx-1 opacity-50">·</span>{score.round}R</span>
   <span aria-label={score.testMode?'생명력 무한':`남은 목숨 ${score.lives}개`} className="flex shrink-0 items-center gap-0.5">{score.testMode?<><Heart aria-hidden="true" className="size-3 fill-[#d5947a] text-[#d5947a]"/><span aria-hidden="true" className="text-sm leading-none">∞</span></>:[0,1,2].map(i=><Heart key={i} aria-hidden="true" className={`size-3 ${i<score.lives?'fill-[#d5947a] text-[#d5947a]':'text-border'}`}/>)}</span>
   <div className="ml-auto flex min-w-0 items-center gap-1.5 whitespace-nowrap"><span aria-label={`확정 점수 ${score.secured}점`} className="text-primary">확정 <strong className="text-xs font-medium">{score.secured.toLocaleString('ko-KR')}</strong></span><span aria-hidden="true" className="text-muted-foreground/50">·</span><span aria-label={`현재 라운드 점수 ${score.pending}점`} className="text-muted-foreground">현재 <strong className="text-xs font-medium text-foreground">{score.pending}</strong></span></div>
   {started&&!ended&&<Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="아이템·방해물 테스트" aria-expanded={testsOpen} aria-controls="brick-test-list" onClick={()=>setTestsOpen(value=>!value)}><FlaskConical className="size-3.5"/></Button>}
   <Button variant="ghost" size="icon" className="-mr-2 size-11 shrink-0" aria-label={paused?'게임 계속하기':'게임 일시정지'} disabled={!playing} onClick={()=>pause(!paused)}>{paused?<Play className="size-3.5"/>:<Pause className="size-3.5"/>}</Button>
  </div>
  <div className="relative min-h-0 flex-1 overflow-hidden bg-[#183139]">
   <div ref={host} className="absolute inset-0"/>
   {started&&!ended&&(score.phase==='ready'||score.held)&&!paused&&!error&&<Button className="absolute bottom-24 left-1/2 z-10 min-h-10 -translate-x-1/2 gap-2 rounded-full px-5 shadow-sm" onClick={()=>controller.current?.launch()}><Play className="size-3.5"/>{score.held?'공 다시 발사':'공 발사'}</Button>}
   {!error&&(!started||ended)&&<GameStartOverlay poster="/arcade/brick-breaker/thumbnail.png" title={ended?`확정 ${score.secured}점 · 연습 종료`:'퐁이의 벽돌깨기'} description={ended?'완료한 라운드의 점수는 남고, 실패한 라운드 점수만 사라져요. 연습 기록은 저장되지 않아요.':'나무 널판지로 공을 튕기고 상어를 피하세요. 벽돌 1개 = 1점 · 목숨 3개'} paidDisabled practiceDisabled={!ready} onPaid={()=>{}} onPractice={start} extraAction={<Button variant="ghost" aria-label="아이템·방해물 테스트" aria-expanded={testsOpen} aria-controls="brick-test-list" className="min-h-14 min-w-0 gap-1 rounded-none border-l px-1 text-[10px]" onClick={()=>setTestsOpen(value=>!value)}><FlaskConical className="size-3.5 shrink-0"/><span>아이템·방해물<br/>테스트</span><ChevronDown className={`size-3 shrink-0 transition-transform ${testsOpen?'rotate-180':''}`}/></Button>} extraPanel={testsOpen?testPanel:undefined}>
    <div className="flex justify-center gap-2" aria-label="벽돌 내구도 1회부터 4회">{['#8bd2c5','#f4d792','#eaa78d','#9eafda'].map((color,i)=><span key={color} style={{background:color}} className="flex h-7 w-11 items-center justify-center rounded text-xs text-[#183f4a]">{i+1}</span>)}</div>
    <p className="text-[11px] leading-5 text-white/80">라운드 클리어 시 점수 확정<br/>실전 준비 중 · 지금은 무료 연습으로 즐겨요.</p>
   </GameStartOverlay>}
   {(error||(started&&!ended&&(score.phase==='round-clear'||paused)))&&<div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-black/85 p-5 text-white backdrop-blur-[3px] [&_.text-muted-foreground]:text-white/65"><div className="w-full max-w-64 space-y-4 text-center">
    {error?<p role="alert" className="text-sm text-destructive">{error}</p>:score.phase==='round-clear'?<><ShieldCheck className="mx-auto size-8 text-primary"/><h2 className="text-xl">{score.round}라운드 클리어</h2><p className="text-sm">총 {score.secured}점 확정</p><p className="text-xs leading-5 text-muted-foreground">다음 라운드에서 실패해도<br/>확정한 점수는 유지돼요.</p><Button className="min-h-11 w-full gap-2" onClick={()=>{pause(false);controller.current?.next()}}>다음 라운드<ArrowUpRight className="size-4"/></Button><Button variant="outline" className="min-h-11 w-full bg-white/10 text-white hover:bg-white/20" onClick={()=>{pause(false);controller.current?.bank()}}>여기서 점수 확보</Button></>:<><h2 className="text-xl">잠시 쉬어가요</h2><Button className="min-h-11 w-full" onClick={()=>pause(false)}>계속하기</Button></>}
   </div></div>}
  </div>
  {started&&!ended&&testsOpen&&testPanel}
 </section>
}
