import {useEffect,useRef,useState} from 'react'
import {Crown,RotateCcw,UserPlus,UserCheck,Clock3} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {GameStartOverlay,GameTabs} from './game-controls'
import {GameLeaveGuard} from './game-leave-guard'
import {oddEvenAction,oddEvenError,oddEvenLeaderboard,type OddEvenAction,type OddEvenState,type OddEvenRanks} from './odd-even-api'
import {createOddEvenPractice} from './odd-even-practice'
import {sendFriendRequest} from '@/features/friends/api'
import {useSocial} from '@/features/social/social-provider'
import {socialErrorMessage} from '@/features/social/types'
import {OddEvenActor,type OddEvenScene} from './odd-even-actor'
import './odd-even-game.css'

function Ranking(){
 const social=useSocial(),[requesting,setRequesting]=useState<string|null>(null),requestLock=useRef(false)
 const [data,setData]=useState<OddEvenRanks|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const alive=useRef(true),locked=useRef(false)
 async function addFriend(code:string){if(requestLock.current)return;requestLock.current=true;setRequesting(code);try{await sendFriendRequest(code);if(alive.current){setData(old=>old?{...old,rows:old.rows.map(row=>row.friendCode===code?{...row,friendStatus:'pending'}:row)}:old);toast.success('친구 요청을 보냈어요.');void social.refresh()}}catch(cause){if(alive.current)toast.error(socialErrorMessage(cause))}finally{requestLock.current=false;if(alive.current)setRequesting(null)}}
 async function load(offset=0){if(locked.current)return;locked.current=true;setBusy(true);try{const next=await oddEvenLeaderboard(offset);if(alive.current){setData(old=>({...next,rows:offset&&old?[...old.rows,...next.rows]:next.rows}));setError('')}}catch(cause){if(alive.current)setError(oddEvenError(cause))}finally{locked.current=false;if(alive.current)setBusy(false)}}
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false}},[]) // eslint-disable-line react-hooks/exhaustive-deps
 return <div role="tabpanel" id="odd-even-rank-panel" aria-labelledby="odd-even-rank-tab" className="min-h-0 flex-1 space-y-3 overflow-y-auto">
  <div className="flex items-center justify-between"><h3 className="text-sm font-normal">최고 수령액</h3><Button variant="ghost" size="icon" aria-label="순위 새로고침" disabled={busy} onClick={()=>void load()}><RotateCcw className="size-4"/></Button></div>
  <p className="text-xs text-muted-foreground">실제 받은 보상 기준 · 개인 최고 기록</p>
  <ol className="space-y-2">{data?.rows.map(row=>{
   const related=social.requests.find(request=>(request.sender_id===row.userId||request.recipient_id===row.userId)&&(request.status==='accepted'||request.status==='pending'))
   const status=related?.status??row.friendStatus,label=status==='accepted'?'이미 친구예요':status==='pending'?'요청 중':'친구 요청'
   const Icon=status==='accepted'?UserCheck:status==='pending'?Clock3:UserPlus
   return <li key={row.id} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${row.rank===1?'border-amber-300 bg-amber-50 text-amber-900':row.rank===2?'border-slate-300 bg-slate-50 text-slate-700':row.rank===3?'border-orange-200 bg-orange-50 text-orange-900':'bg-card'}`}><span className="flex w-12 shrink-0 items-center gap-1">{row.rank<=3&&<Crown className="size-4"/>}{row.rank}등</span><span className="min-w-0 flex-1 truncate">{row.nickname}{row.mine?' (나)':''}</span><span className="flex shrink-0 items-center gap-1"><GoldIcon className="size-4"/><span className="tabular-nums">{row.gold.toLocaleString('ko-KR')}</span></span>{!row.mine&&row.friendCode?<Button variant="ghost" size="icon" className="size-8 shrink-0" title={label} aria-label={`${row.nickname} · ${label}`} disabled={!!status||!!requesting} onClick={()=>void addFriend(row.friendCode!)}><Icon className="size-4"/></Button>:<span className="size-8 shrink-0"/>}</li>
  })}</ol>
  {data&&!data.total&&<p className="py-6 text-center text-sm text-muted-foreground">아직 수령 기록이 없어요.</p>}{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
  {busy&&<p role="status" className="text-xs">기록을 불러오는 중…</p>}{data&&data.rows.length<data.total&&<Button variant="outline" disabled={busy} onClick={()=>void load(data.rows.length)}>기록 더 보기 ({data.rows.length}/{data.total})</Button>}
 </div>
}
export default function OddEvenGame(){const {session}=useAuth();return <AccountGame key={session?.user.id??'guest'}/>}
function AccountGame(){
 const gold=useGold(),[state,setState]=useState<OddEvenState>({run:null,maxWins:20}),[tab,setTab]=useState<'game'|'rank'>('game')
 const [practiceMode,setPracticeMode]=useState(false),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false)
 const [scene,setScene]=useState<OddEvenScene>('mixing')
 const alive=useRef(true),locked=useRef(false),operation=useRef<string|null>(null),practice=useRef<ReturnType<typeof createOddEvenPractice>|null>(null)
 const run=state.run,playing=!!run&&(run.stage==='choose'||run.stage==='decision')
 const visibleStake=run&&scene!=='result'&&run.stage==='decision'?run.stake/2:run&&scene!=='result'&&run.stage==='lost'?10*2**run.wins:run?.stake??0
 useEffect(()=>{for(const name of ['mix','open']){const image=new Image();image.src=`/arcade/odd-even/pongi-${name}-sprite.png`}},[])
 useEffect(()=>{
  if(!run)return
  if(run.stage==='banked'){setScene('result');return}
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const choosing=run.stage==='choose'
  setScene(choosing?'mixing':'opening')
  const timer=setTimeout(()=>setScene(choosing?'asking':'result'),reduced?0:choosing?1200:720)
  return()=>clearTimeout(timer)
 },[run?.id,run?.round,run?.stage]) // eslint-disable-line react-hooks/exhaustive-deps
 async function request(args:OddEvenAction){
  if(locked.current)return;locked.current=true;setBusy(true)
  try{const next=practice.current?practice.current(args):await oddEvenAction(args);if(!alive.current)return;setState(next);setError('');setLoaded(true)
   if(args.p_action==='start'){operation.current=null;setConfirm(false)}
   if(!practice.current&&(args.p_action==='start'||args.p_action==='cashout'))void gold.refresh()
   if(args.p_action==='cashout'&&next.run?.stage==='banked')toast.success(practice.current?'연습 보상을 받았어요.':`${next.run.stake.toLocaleString('ko-KR')}골드를 받았습니다.`)
  }catch(cause){if(alive.current){setError(oddEvenError(cause));setLoaded(true);if(args.p_action==='answer')setScene('asking')}}finally{locked.current=false;if(alive.current)setBusy(false)}
 }
 useEffect(()=>{alive.current=true;void request({p_action:'state'});const reload=()=>{if(!practice.current&&!operation.current&&document.visibilityState==='visible')void request({p_action:'state'})};window.addEventListener('focus',reload);window.addEventListener('online',reload);return()=>{alive.current=false;window.removeEventListener('focus',reload);window.removeEventListener('online',reload)}},[]) // eslint-disable-line react-hooks/exhaustive-deps
 function startPaid(){practice.current=null;setPracticeMode(false);operation.current??=crypto.randomUUID();void request({p_action:'start',p_operation_id:operation.current})}
 function startPractice(){if(locked.current||operation.current)return;practice.current=createOddEvenPractice();setPracticeMode(true);void request({p_action:'start'})}
 function act(p_action:OddEvenAction['p_action'],p_choice?:'odd'|'even'){if(!run||locked.current)return;if(p_action==='answer'){if(scene!=='asking')return;setScene('submitting')}if(p_action==='double'&&scene!=='result')return;void request({p_action,p_run_id:run.id,p_round:run.round,p_choice})}
 return <div className="flex min-h-0 flex-1 flex-col gap-2">
  <GameLeaveGuard active={playing||busy} practice={practiceMode} description="실전 진행과 확보 금액은 보관돼요. 돌아와 이어할 수 있어요."/>
  <GameTabs id="odd-even" value={tab} onChange={setTab}/>
  {tab==='rank'?<Ranking/>:<div role="tabpanel" id="odd-even-game-panel" aria-labelledby="odd-even-game-tab" className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
   {!run?<GameStartOverlay title="퐁이의 홀짝 조개" description="조개 속 진주, 홀일까요 짝일까요?" poster="/arcade/odd-even/thumbnail.png" onPaid={()=>setConfirm(true)} onPractice={startPractice} paidDisabled={!loaded||busy||gold.loading||gold.wallet.gold<10} practiceDisabled={busy||!!operation.current}/>:<div className="flex h-full min-h-0 flex-col gap-2 p-3 sm:p-4">
    <div className="shrink-0 text-center"><p className="text-xs text-muted-foreground">{run.stage==='banked'?'받은 보상':scene!=='result'?'현재 베팅금':'현재 확보 금액'}</p><p className="flex items-center justify-center gap-1 text-3xl tabular-nums text-primary"><GoldIcon className="size-7"/>{visibleStake.toLocaleString('ko-KR')}</p>{run.stage==='choose'&&<p className="text-xs text-muted-foreground">맞히면 {(run.stake*2).toLocaleString('ko-KR')}골드</p>}</div>
    <div aria-live="polite" className={`odd-even-scene flex min-h-0 flex-1 flex-col items-center gap-1 rounded-lg p-2 ${scene==='result'&&run.stage==='lost'?'odd-even-result--wrong bg-red-50 text-red-800':scene==='result'&&(run.stage==='decision'||run.stage==='banked')?'odd-even-result--correct bg-emerald-50 text-emerald-800':'bg-secondary/40 text-primary'}`}>
     <OddEvenActor scene={scene} pearls={run.pearls}/>
     <div className="flex h-12 shrink-0 flex-col items-center justify-center gap-1">
      {scene==='result'&&run.pearls!==null?<><p className="text-base">진주 {run.pearls}개 · {run.pearls%2?'홀':'짝'}</p><p className="text-xs">{run.stage==='lost'?'아쉬워요!':run.stage==='banked'?'보상 수령 완료':'맞혔어요!'}</p></>:scene==='asking'?<p className="text-sm">홀일까요, 짝일까요?</p>:<span className="sr-only">{scene==='mixing'?'퐁이가 진주를 섞고 있어요.':'조개를 열고 있어요.'}</span>}
     </div>
    </div>
    <div className="grid shrink-0 grid-cols-2 gap-2">
     {run.stage==='choose'?<><Button disabled={busy||scene!=='asking'} onClick={()=>act('answer','odd')}>홀</Button><Button disabled={busy||scene!=='asking'} variant="outline" onClick={()=>act('answer','even')}>짝</Button></>:run.stage==='decision'?<><Button className={run.wins>=state.maxWins?'col-span-2':undefined} disabled={busy||scene!=='result'} onClick={()=>act('cashout')}>보상 받기</Button>{run.wins<state.maxWins&&<Button variant="outline" disabled={busy||scene!=='result'} onClick={()=>act('double')}>묻고 더블로 가 !</Button>}</>:<Button className="col-span-2" disabled={busy||scene!=='result'} onClick={()=>{setState({run:null,maxWins:20});setError('')}}>다시 하기</Button>}
    </div>
   </div>}
   {error&&<div role="alert" className="absolute inset-x-2 bottom-2 z-30 rounded-lg border bg-card p-3 text-xs text-destructive">{error}<Button variant="ghost" className="ml-2 h-7 text-xs" disabled={busy} onClick={()=>operation.current?startPaid():void request({p_action:'state'})}>다시 확인</Button></div>}
  </div>}
  <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="10골드로 시작하시겠습니까?" description="별도 참가비 없이 10골드를 베팅해요. 틀리면 이번 판의 베팅금은 사라져요." busy={busy} onConfirm={startPaid}/>
 </div>
}
