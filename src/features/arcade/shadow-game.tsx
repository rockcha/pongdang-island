import {WeeklyRewards} from './weekly-rewards'
import {RankingRow,rankingListClass} from './ranking-row'
import {randomId} from '@/lib/random-id'
import { useEffect, useRef, useState } from 'react'
import { Clock3, Heart, Trophy, RefreshCw, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useAuth } from '@/components/auth-provider'
import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { collectibleUrl, loadCollection } from '@/features/collection/api'
import { createShadowPractice } from './shadow-practice'
import { shadowAction, shadowError, shadowLeaderboard, type ShadowState, type ShadowAction, type ShadowLeaderboard } from './shadow-api'
import { GameTabs, GameStartOverlay } from './game-controls'
import { GameModal } from './game-modal'
import './shadow-game.css'

function Leaderboard({ revision }: { revision:number }) {
 const [data,setData]=useState<ShadowLeaderboard|null>(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const lock=useRef(false),version=useRef(0)
 async function load(offset=0) {
  if(lock.current)return
  lock.current=true;setBusy(true)
  const request=version.current
  try {
   const result=await shadowLeaderboard(offset)
   if(request!==version.current)return
   setData(previous=>({...result,rows:offset&&previous?[...previous.rows,...result.rows]:result.rows}));setError('')
  }catch(cause){if(request===version.current)setError(shadowError(cause))}
  finally{if(request===version.current){lock.current=false;setBusy(false)}}
 }
 useEffect(()=>{version.current++;lock.current=false;void load();return()=>{version.current++}},[revision]) // eslint-disable-line react-hooks/exhaustive-deps

 return <section className="space-y-3" aria-label="서버 전체 기록">
  <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-normal"><Trophy className="size-4 text-primary" />이번 주 서버 랭킹</h3><Button variant="ghost" size="icon" aria-label="기록 새로고침" disabled={busy} onClick={()=>void load()}><RefreshCw className="size-4" /></Button></div>
  <p className="text-xs text-muted-foreground">이번 주 개인 최고 정답 수로 순위를 매겨요. 동점은 먼저 완료한 순서예요.</p>
  <WeeklyRewards rewards={data?.rewards} weekEnd={data?.weekEnd}/>
  <ol className={rankingListClass}>{data?.rows.map(row=><RankingRow key={row.id} rank={row.rank} nickname={row.nickname} mine={row.mine} record={<><span className="block">{row.score} 정답</span>{row.rewardGold!==undefined&&<span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground"><GoldIcon className="size-3.5"/>{row.rewardGold.toLocaleString('ko-KR')}</span>}</>}/>)}</ol>
  {data&&!data.total&&<p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">첫 번째 기록의 주인공이 되어보세요.</p>}
  {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
  {busy&&<p role="status" className="text-xs text-muted-foreground">기록을 불러오는 중…</p>}
  {data&&data.rows.length<data.total&&<Button variant="outline" className="w-full" disabled={busy} onClick={()=>void load(data.rows.length)}>기록 더 보기 ({data.rows.length}/{data.total})</Button>}
 </section>
}

export default function ShadowGame() {
 const {session}=useAuth()
 return <AccountShadowGame key={session?.user.id??'guest'} />
}

function AccountShadowGame() {
 const [modalContainer,setModalContainer]=useState<HTMLDialogElement|null>(null)
 const [gameOpen,setGameOpen]=useState(false),restore=useRef(true)
 const gold=useGold()
 const [state,setState]=useState<ShadowState|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const [ready,setReady]=useState(false),[confirm,setConfirm]=useState(false)
 const [remaining,setRemaining]=useState(8),[revision,setRevision]=useState(0)
 const [imageFailed,setImageFailed]=useState(false)
 const [practiceMode,setPracticeMode]=useState(false)
 const [tab,setTab]=useState<'game'|'rank'>('game')
 const [finalReviewed,setFinalReviewed]=useState(false)
 const practice=useRef<ReturnType<typeof createShadowPractice>|null>(null)
 const active=useRef(true),lock=useRef(false),operation=useRef<string|null>(null)
 const clock=useRef({received:0,remaining:0})
 const run=state?.run,round=run?.round
 function apply(result:ShadowState) {
  clock.current={received:performance.now(),remaining:result.run?(Date.parse(result.run.round.deadline)-Date.parse(result.serverNow))/1000:0}
  setRemaining(Math.max(0,clock.current.remaining));setState(result);setError('');setReady(true)
 }
 async function request(args:ShadowAction) {
  if(lock.current)return
  lock.current=true;setBusy(true)
  try {
   const result=practice.current?practice.current(args):await shadowAction(args)
   if(!active.current)return
   apply(result)
   if(restore.current){restore.current=false;if(result.run&&!result.run.finished)setGameOpen(true)}
   if(args.p_action==='start'){setGameOpen(true);operation.current=null;setConfirm(false);if(!practice.current)void gold.refresh()}
   if(result.run?.finished&&!practice.current)setRevision(value=>value+1)
  }catch(cause){if(active.current){setError(shadowError(cause));setReady(true)}}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 useEffect(()=>{
  active.current=true;void request({p_action:'state'})
  const refresh=()=>{if(!practice.current&&document.visibilityState==='visible')void request({p_action:'state'})}
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh)
  return()=>{active.current=false;window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh)}
 },[]) // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{setImageFailed(false)},[round?.id])
 useEffect(()=>{setFinalReviewed(false)},[round?.id])
 useEffect(()=>{
  if(!round||round.answered||run?.finished)return
  const tick=()=>setRemaining(Math.max(0,clock.current.remaining-(performance.now()-clock.current.received)/1000))
  tick();const timer=setInterval(tick,100);return()=>clearInterval(timer)
 },[round?.id,round?.answered,run?.finished]) // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{
  if(round&&!round.answered&&!run?.finished&&remaining<=0&&!busy&&!error)void request({p_action:'answer',p_run_id:run!.id,p_round_id:round.id})
 },[remaining,busy,error,round,run]) // eslint-disable-line react-hooks/exhaustive-deps
 function start(){practice.current=null;setPracticeMode(false);operation.current??=randomId();void request({p_action:'start',p_operation_id:operation.current})}
 async function startPractice(){
  if(lock.current)return
  lock.current=true;setBusy(true)
  try{
   const collection=await loadCollection()
   if(!active.current)return
   practice.current=createShadowPractice(collection.catalog);setPracticeMode(true)
   setGameOpen(true);apply(practice.current({p_action:'start'}))
  }catch(cause){if(active.current)setError(shadowError(cause))}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 return <div className="flex min-h-0 min-w-0 flex-1 flex-col">
  <GameTabs id="shadow" value={tab} onChange={setTab} />
  {tab==='rank'?<div role="tabpanel" id="shadow-rank-panel" aria-labelledby="shadow-rank-tab" className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"><Leaderboard revision={revision} /></div>:<GameModal onContainer={setModalContainer} open={gameOpen} title="그림자 맞추기" active={Boolean(run&&!run.finished)} practice={practiceMode} busy={busy} exitDescription={practiceMode?'나가면 연습 진행이 사라져요.':'실전 기록은 유지되며 문제의 제한 시간은 계속 흘러요.'} onExit={()=>{setGameOpen(false);if(practiceMode){setState(null);practice.current=null}}}><div role="tabpanel" id="shadow-game-panel" aria-labelledby="shadow-game-tab" className="flex min-h-0 flex-1 flex-col gap-2">
   <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-card">
    {gameOpen&&run&&round&&(!run.finished||!finalReviewed)?<section className="shadow-question flex min-h-0 flex-1 flex-col" aria-label="그림자 문제">
     <div className="flex shrink-0 items-center justify-between px-3 py-2 text-sm"><span className="tabular-nums">{run.score}/100점 <span className="ml-2 text-xs text-muted-foreground">{round.number}번째 문제</span></span><span className="flex gap-1" aria-label={`남은 찬스 ${run.lives}회`}>{[0,1,2].map(i=><Heart key={i} className={`size-4 ${i<run.lives?'fill-primary text-primary':'text-muted-foreground/25'}`} />)}</span></div>
     <div className="shrink-0 space-y-1 px-3 pb-2"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>이 그림자의 이름은?</span><span className="flex items-center gap-1 tabular-nums"><Clock3 className="size-3.5" />{Math.ceil(remaining)}초</span></div><div role="progressbar" aria-label="남은 시간" aria-valuemin={0} aria-valuemax={8} aria-valuenow={Math.ceil(remaining)} className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full transition-[width] duration-100 ${remaining<=3?'bg-destructive':'bg-primary'}`} style={{width:`${Math.min(100,remaining/8*100)}%`}} /></div></div>
     <div className={`relative min-h-0 flex-1 overflow-hidden ${round.answered?`shadow-answer-result ${round.correct?'shadow-answer-correct':'shadow-answer-wrong'}`:'bg-secondary/40'}`}>
      {round.answered&&<div key={round.id} aria-hidden="true" className={`shadow-feedback pointer-events-none absolute inset-0 z-20 grid place-items-center ${round.correct?'shadow-feedback-correct':'shadow-feedback-wrong'}`}><svg viewBox="0 0 240 240" className="shadow-feedback-symbol h-[min(70%,15rem)] w-[min(70%,15rem)] overflow-visible" fill="none" stroke="currentColor" strokeWidth="18" strokeLinecap="round">{round.correct?<circle cx="120" cy="120" r="88"/>:<path d="M55 55 185 185M185 55 55 185"/>}</svg></div>}
      {round.answered&&<div role="status" aria-label={round.correct?'정답':'오답'} className={`absolute inset-x-3 top-3 z-10 flex items-center justify-center gap-1.5 text-center text-sm ${round.correct?'text-green-800':'text-red-800'}`}>{round.correct?<Check className="size-4 shrink-0" aria-hidden="true"/>:<X className="size-4 shrink-0" aria-hidden="true"/>}<span>{round.answerName}</span></div>}
      {imageFailed?<p className="flex h-full items-center justify-center px-3 text-center text-xs text-destructive">이미지를 불러오지 못했어요.</p>:<img key={round.id} src={collectibleUrl(round.imagePath)} alt={round.answered?round.answerName??'정답 개체':'맞혀야 할 개체의 그림자'} className={`absolute inset-0 size-full object-contain p-3 ${round.answered?'pt-12':''}`} style={{filter:round.answered?'none':'brightness(0)'}} draggable={false} onError={()=>setImageFailed(true)} />}
     </div>
     {round.answered?<Button className="min-h-14 w-full shrink-0 rounded-none text-base" disabled={busy} onClick={()=>run.finished?setFinalReviewed(true):void request({p_action:'next',p_run_id:run.id,p_round_id:round.id})}>{run.finished?'결과 보기':'다음 문제'}</Button>:<div className="grid shrink-0 grid-cols-2 grid-rows-2 gap-px border-t border-border bg-border">{round.options.map(option=><Button key={option.id} variant="outline" className="min-h-14 h-full min-w-0 whitespace-normal rounded-none border-0 bg-background px-3 py-3 text-sm" disabled={busy||remaining<=0||imageFailed} onClick={()=>void request({p_action:'answer',p_run_id:run.id,p_round_id:round.id,p_choice_id:option.id})}>{option.name}</Button>)}</div>}
    </section>:<><GameStartOverlay rules={['문제마다 8초 안에 그림자의 이름을 고르세요.','틀리거나 시간이 지나면 찬스가 하나 줄어요.','찬스 3회를 모두 쓰거나 100점을 달성하면 종료돼요.']} poster="/arcade/shadow-thumbnail.png" title={run?.finished?(run.score>=100?'100점 달성!':`${run.score}개 정답!`):'그림자 맞추기'} description={run?.finished?(practiceMode?'연습 기록은 저장되지 않아요.':'기록이 서버 전체 순위에 등록됐어요.'):'지도 외 개체의 이름을 골라주세요. 문제당 8초 · 찬스 3회'} paidDisabled={!ready||busy||gold.loading||gold.busy||Boolean(gold.error)||gold.wallet.gold<10||Boolean(error)} practiceDisabled={!ready||busy} onPaid={()=>setConfirm(true)} onPractice={()=>void startPractice()}></GameStartOverlay></>}
   </div>
   {!ready&&<p role="status" className="shrink-0 text-xs text-muted-foreground">진행 중인 게임을 확인하는 중…</p>}
   {error&&!confirm&&<div role="alert" className="flex shrink-0 items-center gap-2"><p className="flex-1 text-[11px] text-destructive">{error}</p><Button variant="ghost" size="sm" disabled={busy} onClick={()=>void request({p_action:'state',...(run?{p_run_id:run.id}:{})})}>다시 연결</Button></div>}
  </div></GameModal>}
  <ConfirmDialog portalContainer={gameOpen?modalContainer:undefined} illustration="game" open={confirm} onOpenChange={setConfirm} title={<><span className="block">그림자 맞추기에</span><span className="inline-flex items-center gap-1"><GoldIcon className="size-5" />10골드로 참가하시겠습니까?</span></>} description="참가비는 시작할 때 한 번만 차감돼요. 정답마다 1점이며 찬스는 3회예요." busy={busy} error={error} onConfirm={start} />
 </div>
}
