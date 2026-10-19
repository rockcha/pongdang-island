import {useCallback,useEffect,useRef,useState} from 'react'
import {Link} from 'react-router'
import {ArrowUpRight,Check,Clock3,RefreshCw} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/components/auth-provider'
import {appArt} from '@/components/app-art'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {claimQuest,loadQuests,questError,type QuestKind,type QuestState} from './api'

const questTabs=['daily','weekly','growth'] as const
const questLabels={daily:'일일',weekly:'주간',growth:'성장'}

export function QuestButton(){const {session}=useAuth();return session?<Quests key={session.user.id}/>:null}
function Quests(){
 const {refresh}=useGold()
 const [open,setOpen]=useState(false),[tab,setTab]=useState<QuestKind>('daily')
 const [data,setData]=useState<QuestState|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState(''),[now,setNow]=useState(Date.now())
 const request=useRef(0),alive=useRef(true),locked=useRef(false),offset=useRef(0)
 function apply(state:QuestState){offset.current=Date.parse(state.serverNow)-Date.now();setNow(Date.now()+offset.current);setData(state)}
 const reload=useCallback(async()=>{if(locked.current)return;const seq=++request.current;setLoading(true);try{const state=await loadQuests();if(alive.current&&seq===request.current){apply(state);setError('')}}catch(cause){if(alive.current&&seq===request.current)setError(questError(cause))}finally{if(alive.current&&seq===request.current)setLoading(false)}},[])
 useEffect(()=>{alive.current=true;void reload();const focus=()=>{if(document.visibilityState==='visible')void reload()};window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);return()=>{alive.current=false;request.current++;window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus)}},[reload])
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>void reload(),100)}
  const events=['quest-progress-changed','region-maps-changed','fishing-rods-changed']
  for(const event of events)window.addEventListener(event,changed)
  return()=>{clearTimeout(timer);for(const event of events)window.removeEventListener(event,changed)}
 },[reload])
 useEffect(()=>{if(!open)return;void reload();const timer=setInterval(()=>setNow(Date.now()+offset.current),1000);const poll=setInterval(()=>void reload(),30000);return()=>{clearInterval(timer);clearInterval(poll)}},[open,reload])
 async function claim(id:string){const selected=data?.[tab];if(!selected||locked.current)return;locked.current=true;request.current++;setLoading(false);setBusy(id);setError('');try{const state=await claimQuest(tab,selected.start,id);if(alive.current){apply(state);if(state.creditedFuel)toast.success(`기름 ${state.creditedFuel}통을 받았어요.`);else if(state.credited)toast.success(`${state.credited.toLocaleString('ko-KR')}골드를 받았어요.`);window.dispatchEvent(new Event('harbor-changed'))}await refresh()}catch(cause){if(alive.current)setError(questError(cause))}finally{locked.current=false;if(alive.current){setBusy(null)}}}
 const period=data?.[tab],completed=period?.quests.filter(q=>q.complete).length??0
 const readyByKind=Object.fromEntries(questTabs.map(kind=>{const p=data?.[kind];return [kind,p?p.quests.filter(q=>q.complete&&!q.claimed).length+(p.bonus>0&&p.bonusReady&&!p.bonusClaimed?1:0):0]})) as Record<QuestKind,number>
 const ready=questTabs.reduce((total,kind)=>total+readyByKind[kind],0)
 const remaining=period?(period.resetsAt?Math.max(0,Date.parse(period.resetsAt)-now):Infinity):0
 const resetLabel=tab==='growth'?'초기화 없이 한 번씩 달성':remaining?`${Math.floor(remaining/86400000)?Math.floor(remaining/86400000)+'일 ':''}${Math.floor(remaining/3600000)%24}시간 ${Math.floor(remaining/60000)%60}분 후 초기화`:'새 퀘스트 확인 중'
 return <Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger aria-label={`퀘스트${ready?`, 받을 보상 ${ready}개`:''}`} title="퀘스트" className="relative grid size-10 min-h-10 min-w-10 place-items-center rounded-lg outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><appArt.list className="size-7"/>{ready>0&&<span aria-hidden="true" className="header-indicator">{ready}</span>}</DialogTrigger>
  <DialogContent className="notification-sheet inset-x-0 bottom-0 top-auto left-0 flex h-[82dvh] max-h-[44rem] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
   <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"/>
   <DialogHeader className="shrink-0 px-4 py-4 pr-12"><DialogTitle className="flex items-center gap-2 text-lg font-normal"><appArt.list className="size-7"/>퀘스트</DialogTitle><DialogDescription className="sr-only">일일·주간·성장 퀘스트의 진행도를 확인하고 보상을 받으세요.</DialogDescription></DialogHeader>
   <div role="tablist" aria-label="퀘스트 종류" className="segmented-control grid shrink-0 grid-cols-3 border-b">{questTabs.map(kind=><button key={kind} role="tab" id={`quest-${kind}-tab`} aria-controls="quest-panel" aria-description={`${readyByKind[kind]}개 보상 수령 가능`} aria-selected={kind===tab} disabled={!!busy} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'daily':event.key==='End'?'growth':questTabs[(questTabs.indexOf(kind)+(event.key==='ArrowRight'?1:questTabs.length-1))%questTabs.length];setTab(next);document.getElementById(`quest-${next}-tab`)?.focus()}}} tabIndex={kind===tab?0:-1} onClick={()=>setTab(kind)} className={`flex min-h-12 items-center justify-center gap-2 border-r text-sm ${kind===tab?'bg-secondary text-primary':'text-muted-foreground'}`}>{kind==='daily'?<appArt.attendance className="size-6"/>:kind==='weekly'?<appArt.collection className="size-6"/>:<appArt.island className="size-6"/>}{questLabels[kind]}<span aria-hidden="true" className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] tabular-nums ${readyByKind[kind]>0?'bg-primary text-primary-foreground':'bg-muted text-muted-foreground'}`}>{readyByKind[kind]}</span></button>)}</div>
   {period&&<div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 className="size-3.5"/>{resetLabel}</span><span className="tabular-nums text-primary">완료 {completed} / {period.quests.length}</span></div>}
   {error&&<div role="alert" className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2 text-xs text-destructive"><p>{error}</p><Button variant="ghost" size="icon" aria-label="퀘스트 다시 확인" disabled={!!busy||loading} onClick={()=>void reload()}><RefreshCw className="size-4"/></Button></div>}
   <div role="tabpanel" id="quest-panel" aria-labelledby={`quest-${tab}-tab`} aria-busy={loading} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
    {!period&&!error&&<div role="status" aria-label="퀘스트를 불러오는 중" className="divide-y">{Array.from({length:6},(_,i)=><div key={i} className="flex items-center gap-3 px-4 py-5 motion-safe:animate-pulse"><span className="size-10 rounded-lg bg-secondary"/><div className="flex-1 space-y-2"><div className="h-3 w-3/4 rounded bg-secondary"/><div className="h-1.5 w-full rounded bg-secondary"/></div></div>)}</div>}
    {period?.quests.map(q=>{const Icon=appArt[q.icon as keyof typeof appArt]??appArt.list;return <div key={tab+q.id} className="flex min-h-24 items-center gap-3 border-b border-border/60 px-4 py-3"><Icon className={`size-10 ${q.claimed?'grayscale opacity-50':''}`}/><div className="min-w-0 flex-1"><Link to={q.href} onClick={()=>setOpen(false)} className="inline-flex max-w-full items-center gap-1 text-[13px] leading-5 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">{q.title}<ArrowUpRight aria-hidden="true" className="size-3 shrink-0 text-muted-foreground"/></Link><div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width]" style={{width:`${Math.min(100,q.progress/q.target*100)}%`}}/></div><p className="mt-1 text-[10px] tabular-nums text-muted-foreground">{q.progress} / {q.target}</p></div><Button variant={q.complete&&!q.claimed?'default':'secondary'} className="min-h-11 min-w-20 gap-1 rounded-lg px-2 text-xs" aria-label={q.claimed?`${q.title} 보상 수령 완료`:`${q.title} ${q.rewardFuel?`기름 ${q.rewardFuel}통`:`${q.reward}골드`} 받기`} disabled={!q.complete||q.claimed||!!busy||remaining===0} onClick={()=>void claim(q.id)}>{q.claimed?<><Check className="size-3.5"/>완료</>:busy===q.id?'받는 중…':<>{q.rewardFuel?<appArt.fuel className="size-5"/>:<GoldIcon className="size-4"/>}{q.rewardFuel||q.reward}{q.rewardFuel?'통':''}</>}</Button></div>})}
    {period&&tab==='growth'&&<p className="px-4 py-4 text-[10px] leading-5 text-muted-foreground">기존 보유 수량과 순풍 기록도 반영돼요. 기본 지급 테마와 처음부터 열린 바다는 제외되며, 각 보상은 한 번만 받을 수 있어요.</p>}
    {period&&tab!=='growth'&&<p className="px-4 py-4 text-[10px] leading-5 text-muted-foreground">한국 시간 기준 {tab==='daily'?'매일 자정':'월요일 자정'}에 초기화돼요. 낚시 횟수에는 실패도 포함돼요. 포획은 직접 낚시와 파견 결과 수령으로 기록돼요.{tab==='weekly'&&' 지도·낚싯대를 모두 보유했다면 해당 구매 퀘스트는 제외돼요.'}</p>}
   </div>
   {period&&tab!=='growth'&&<div className="flex shrink-0 items-center gap-3 border-t bg-secondary/35 px-4 py-3"><appArt.ranking className="size-10"/><div className="min-w-0 flex-1"><p className="text-sm">전체 완료 보상</p><p className="mt-1 text-[11px] text-muted-foreground">{period.bonusClaimed?'이번 보상을 받았어요':period.bonusReady?'모두 완료했어요!':'모든 퀘스트를 완료해 보세요'}</p></div><Button className="min-h-12 min-w-24 gap-1 rounded-lg px-3" aria-label={`전체 완료 ${period.bonus}골드 받기`} disabled={!period.bonusReady||period.bonusClaimed||!!busy||remaining===0} onClick={()=>void claim('all')}>{period.bonusClaimed?<Check className="size-4"/>:busy==='all'?'받는 중…':<><GoldIcon className="size-5"/>{period.bonus.toLocaleString('ko-KR')}</>}</Button></div>}
  </DialogContent>
 </Dialog>
}
