import {useCallback,useEffect,useRef,useState} from 'react'
import {Check,ChevronRight,Clock3,Shell,ArrowDownToLine,RotateCw} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {useAuth} from '@/components/auth-provider'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {randomId} from '@/lib/random-id'
import {changeSavings,isSavingsRejection,loadSavings,savingsError} from './api'
import type {SavingsAction,SavingsResult,SavingsState} from './api'
import {remainingTime,savingsStatus} from './savings-time'
import './savings.css'

const plans=[{days:3,bonus:20},{days:5,bonus:25},{days:7,bonus:30}] as const
const number=(n:number)=>n.toLocaleString('ko-KR')
const date=(value:string)=>new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})
function Money({value,large=false}:{value:number;large?:boolean}){return <span className={`inline-flex items-center gap-1.5 tabular-nums ${large?'text-2xl font-semibold':'font-medium'}`}><GoldIcon className={large?'size-6':'size-4'}/>{number(value)}</span>}
function Loading(){return <div role="status" aria-label="적금 불러오는 중" className="space-y-4 p-4">{[0,1,2].map(i=><div key={i} aria-hidden="true" className="h-28 rounded-2xl bg-secondary/50 motion-safe:animate-pulse"/>)}</div>}
export function SavingsPage(){const {session}=useAuth();return <AccountSavings key={session?.user.id??'guest'}/>}
function AccountSavings(){
 const gold=useGold()
 const [data,setData]=useState<SavingsState|null>(null),[loadError,setLoadError]=useState(''),[error,setError]=useState('')
 const [term,setTerm]=useState<3|5|7>(3),[amount,setAmount]=useState('10'),[busy,setBusy]=useState(false)
 const [confirm,setConfirm]=useState<'open'|'withdraw'|null>(null),[pending,setPending]=useState<SavingsAction|null>(null)
 const [receipt,setReceipt]=useState<SavingsResult['receipt']|null>(null)
 const [clock,setClock]=useState<{server:number;sample:number}|null>(null),[tick,setTick]=useState(()=>performance.now())
 const request=useRef(0),alive=useRef(true),locked=useRef(false),operation=useRef<SavingsAction|null>(null)
 const apply=useCallback((next:SavingsState)=>{setData(next);const sample=performance.now();setClock({server:Date.parse(next.serverNow),sample});setTick(sample);setLoadError('')},[])
 const reload=useCallback(async()=>{if(locked.current)return;const version=++request.current;try{const next=await loadSavings();if(alive.current&&version===request.current)apply(next)}catch(e){if(alive.current&&version===request.current)setLoadError(savingsError(e))}},[apply])
 useEffect(()=>{alive.current=true;void reload();const focus=()=>{if(document.visibilityState==='visible'){setTick(performance.now());void reload()}};window.addEventListener('focus',focus);window.addEventListener('online',focus);document.addEventListener('visibilitychange',focus);const timer=setInterval(()=>setTick(performance.now()),1000);return()=>{alive.current=false;request.current++;clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);document.removeEventListener('visibilitychange',focus)}},[reload])
 const account=data?.account??null,now=clock?clock.server+tick-clock.sample:0
 const status=account?savingsStatus(account,now):null
 const target=account?(status==='due'?account.depositDeadline:account.paid_count===account.term_days?account.maturesAt:account.nextOpenAt):null
 useEffect(()=>{if(!target||!clock)return;const delay=Date.parse(target)-(clock.server+performance.now()-clock.sample);if(delay<0)return;const timer=setTimeout(()=>void reload(),Math.max(100,delay+100));return()=>clearTimeout(timer)},[target,clock,reload])
 const daily=Number(amount),valid=/^\d+$/.test(amount)&&Number.isSafeInteger(daily)&&daily>=10&&daily<=5000
 const plan=plans.find(p=>p.days===term)!,principal=valid?daily*term:0,bonus=Math.floor(principal*plan.bonus/100)
 const full=account?.paid_count===account?.term_days
 const urgent=status==='due'&&target&&Date.parse(target)-now<=3600000
 async function run(args:Omit<SavingsAction,'p_operation_id'>){
  if(locked.current)return
  if(operation.current){const {p_operation_id:_,...previous}=operation.current;if(JSON.stringify(previous)!==JSON.stringify(args)){setError('이전 요청의 결과를 먼저 확인해주세요.');return}}
  let shouldReload=false
  locked.current=true;setBusy(true);setError('');request.current++
  operation.current??={...args,p_operation_id:randomId()};setPending(operation.current)
  try{const next=await changeSavings(operation.current);if(alive.current){apply(next);setConfirm(null);setReceipt(next.receipt.action==='withdraw'?next.receipt:null);operation.current=null;setPending(null);void gold.refresh()}}
  catch(e){if(alive.current){setError(savingsError(e));if(isSavingsRejection(e)){operation.current=null;setPending(null);shouldReload=true}}}
  finally{locked.current=false;if(alive.current){setBusy(false);if(shouldReload)void reload()}}
 }
 function retry(){if(!operation.current)return;const {p_operation_id:_,...args}=operation.current;void run(args)}
 const disabled=busy||pending!==null
 const payout=account?(status==='matured'?account.expectedPayout:account.principal):0
 return <section className="flex min-h-0 w-full flex-1 flex-col">
  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
   {loadError&&<div role="alert" className="flex items-center gap-3 rounded-xl bg-destructive/5 p-3 text-xs leading-5"><p className="flex-1">{loadError}</p><Button variant="ghost" size="icon" aria-label="적금 새로고침" onClick={()=>void reload()}><RotateCw className="size-4"/></Button></div>}
   {!data&&!loadError?<Loading/>:data&&<>
    {receipt&&<div role="status" className="savings-received space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center"><Shell className="mx-auto size-12 text-primary"/><p className="text-sm">{receipt.closeKind==='matured'?'조개가 모아둔 선물이에요!':'맡긴 원금을 돌려받았어요.'}</p><Money value={receipt.payout} large/>{receipt.bonus>0&&<p className="text-xs text-primary">만기 보너스 {number(receipt.bonus)}골드 포함</p>}<Button variant="ghost" className="min-h-11 w-full" onClick={()=>setReceipt(null)}>확인</Button></div>}
    {!account?<>
     <fieldset disabled={disabled} className="space-y-3"><legend className="mb-3 text-xs font-medium">얼마 동안 모을까요?</legend><div className="grid grid-cols-3 gap-2">{plans.map(item=><button key={item.days} type="button" aria-pressed={term===item.days} onClick={()=>setTerm(item.days)} className={`flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${term===item.days?'border-primary/60 bg-primary/5 text-primary':'border-border/70 bg-card hover:bg-secondary/30'}`}><span className="text-lg font-medium">{item.days}일</span><span className="text-xs">보너스 <strong className="font-semibold">{item.bonus}%</strong></span></button>)}</div></fieldset>
     <div className="space-y-3"><label htmlFor="savings-amount" className="text-xs font-medium">매일 넣을 골드</label><div className="relative"><Input id="savings-amount" type="text" inputMode="numeric" pattern="[0-9]*" disabled={disabled} value={amount} onChange={event=>{if(/^\d*$/.test(event.target.value))setAmount(event.target.value)}} aria-describedby="savings-amount-help" className="h-14 rounded-xl pr-16 text-lg tabular-nums"/><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"><GoldIcon className="size-5"/></span></div><p id="savings-amount-help" className="text-[11px] text-muted-foreground">하루 10~5,000골드 · 가입 후 금액 변경 불가</p></div>
     <div className="space-y-3 rounded-2xl bg-secondary/45 p-4"><div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>총 납입 원금 · {term}회</span><span className="tabular-nums"><Money value={principal}/></span></div><div className="flex justify-between gap-3 text-xs"><span className="flex items-center gap-1 text-primary">만기 보너스 {plan.bonus}%</span><span className="tabular-nums text-primary">+<Money value={bonus}/></span></div><div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3"><span className="text-xs">만기에 받는 골드</span><Money value={principal+bonus} large/></div></div>
     <Button className="min-h-13 w-full rounded-xl" disabled={disabled||!valid||data.gold<daily} onClick={()=>{setError('');setConfirm('open')}}>적금 시작하기<ChevronRight className="size-4"/></Button>
     {valid&&data.gold<daily&&<p className="text-center text-xs text-muted-foreground">첫 납입에 필요한 골드가 부족해요.</p>}

    </>:<>
     <div className="savings-shell-panel relative overflow-hidden rounded-3xl border border-primary/10 px-4 py-6 text-center"><span className="inline-flex rounded-full bg-background/80 px-3 py-1 text-[11px] text-primary">{account.term_days}일 적금 · 보너스 {account.bonusPercent}%</span><Shell aria-hidden="true" className={`relative mx-auto my-4 size-24 text-primary/75 ${status==='matured'?'savings-ready':''}`}/><h2 className="text-lg font-medium">{status==='matured'?'조개를 열 시간이 됐어요':status==='missed'?'원금을 돌려받을 수 있어요':full?'마지막 하루를 기다려요':'조개 속 골드가 모이고 있어요'}</h2><p className="mt-2 text-xs text-muted-foreground">{status==='missed'?'납입 기한이 지나 보너스 없이 종료됐어요.':`${account.paid_count} / ${account.term_days}회 납입 완료`}</p></div>
     <ol aria-label="납입 현황" className="flex justify-between gap-1">{Array.from({length:account.term_days},(_,i)=><li key={i} aria-label={`${i+1}회차 ${i<account.paid_count?'완료':i===account.paid_count&&status==='due'?'납입 가능':'대기'}`} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className={`grid size-8 place-items-center rounded-full text-xs ${i<account.paid_count?'bg-primary text-primary-foreground':i===account.paid_count&&status==='due'?'border-2 border-primary bg-primary/5 text-primary':'bg-secondary text-muted-foreground'}`}>{i<account.paid_count?<Check className="size-4"/>:i+1}</span><span className="text-[10px] text-muted-foreground">{i+1}회차</span></li>)}</ol>
     <dl className="space-y-3 rounded-2xl bg-secondary/35 p-4 text-xs"><div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">모은 원금</dt><dd><Money value={account.principal}/></dd></div><div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">매일 납입</dt><dd className="tabular-nums"><Money value={account.daily_amount}/></dd></div><div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">만기</dt><dd>{date(account.maturesAt)}</dd></div>{status!=='missed'&&<div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3"><dt>만기에 받는 골드</dt><dd className="text-primary"><Money value={account.expectedPayout}/></dd></div>}</dl>
     {target&&status!=='missed'&&status!=='matured'&&<div className={`rounded-xl px-4 py-3 text-center ${urgent?'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200':'bg-secondary/25'}`}><p className="flex items-center justify-center gap-1.5 text-xs"><Clock3 className="size-3.5"/>{status==='due'?'이번 납입 마감까지':full?'만기까지':'다음 납입까지'}</p><p className="mt-2 text-xl font-medium tabular-nums tracking-wider">{remainingTime(target,now)}</p>{urgent&&<p className="mt-2 text-[11px]">마감까지 1시간 이내예요. 이번 회차를 납입해주세요.</p>}</div>}
     {status==='due'?<><Button className="min-h-13 w-full rounded-xl" disabled={disabled||data.gold<account.daily_amount} onClick={()=>void run({p_action:'deposit',p_account_id:account.id})}>납입하기 · <Money value={account.daily_amount}/></Button>{data.gold<account.daily_amount&&<p className="text-center text-xs text-muted-foreground">납입할 골드가 부족해요.</p>}</>:status==='matured'||status==='missed'?<Button className="min-h-13 w-full gap-2 rounded-xl" disabled={disabled} onClick={()=>void run({p_action:'withdraw',p_account_id:account.id})}><ArrowDownToLine className="size-4"/>{status==='matured'?'저금통 열기':'원금 돌려받기'} · {number(payout)}</Button>:<p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">납입 완료 · {full?'만기를 기다려주세요.':'다음 회차가 열리면 넣을 수 있어요.'}</p>}
     {status!=='matured'&&status!=='missed'&&<Button variant="ghost" className="min-h-11 w-full text-xs text-muted-foreground" disabled={disabled} onClick={()=>{setError('');setConfirm('withdraw')}}>중도 해지</Button>}
    </>}
    {error&&<div role="alert" className="space-y-3 rounded-xl bg-destructive/5 p-3 text-xs leading-5 text-destructive"><p>{error}</p>{pending&&<Button variant="outline" className="min-h-11 w-full" disabled={busy} onClick={retry}>이전 요청 결과 다시 확인</Button>}</div>}
    {data.history.length>0&&<section className="border-t pt-4"><h2 className="mb-3 text-xs font-medium text-muted-foreground">최근 저금 기록</h2><ul className="divide-y divide-border/50">{data.history.map(item=><li key={item.id} className="flex items-center gap-3 py-3"><Shell className="size-5 shrink-0 text-primary/60"/><div className="min-w-0 flex-1"><p className="text-xs">{item.term_days}일 적금 · {item.close_kind==='matured'?'만기 수령':item.close_kind==='missed'?'미납 종료':'중도 해지'}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.closed_at&&date(item.closed_at)}</p></div><span className="shrink-0 text-xs tabular-nums">+{number(item.payout??0)}</span></li>)}</ul></section>}
   </>}
  </div>
  <ConfirmDialog illustration="savings" open={confirm!==null} onOpenChange={open=>{if(!open&&!busy)setConfirm(null)}} title={confirm==='open'?'조개 적금을 시작할까요?':'지금 조개를 열까요?'} description={confirm==='open'?`매일 ${number(daily)}골드씩 ${term}회 납입해요. 지금 첫 ${number(daily)}골드를 넣고, 가입 ${term}일 후 만기에 ${number(principal+bonus)}골드를 받아요.`:`지금 열면 보너스 없이 넣은 원금 ${number(account?.principal??0)}골드만 돌려받아요.`} busy={busy} error={error} onConfirm={()=>confirm==='open'?void run({p_action:'open',p_term_days:term,p_daily_amount:daily}):account&&void run({p_action:'withdraw',p_account_id:account.id})}/>
 </section>
}
