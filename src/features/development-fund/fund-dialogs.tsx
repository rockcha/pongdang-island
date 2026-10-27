import {useEffect,useRef,useState} from 'react'
import type {FormEvent} from 'react'
import {CheckCircle2,Clock3,EyeOff,Heart,LoaderCircle} from 'lucide-react'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {fundError,won} from './api'
import type {FundDraft,FundFilter,FundReport,FundReview} from './api'
import type {FundService} from './fund-page'
export const statusLabels={pending:'확인 대기',confirmed:'확인 완료',rejected:'반려'} as const
export const fundDate=(value:string)=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value))
const localKst=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()).replace(' ','T')
export function FundSubmitDialog({open,onOpenChange,onSubmit}:{open:boolean;onOpenChange:(open:boolean)=>void;onSubmit:(draft:FundDraft)=>Promise<void>}){
 const [message,setMessage]=useState('')
 const [name,setName]=useState(''),[amount,setAmount]=useState(''),[date,setDate]=useState(localKst),[busy,setBusy]=useState(false),[error,setError]=useState(''),[complete,setComplete]=useState(false)
 const pending=useRef<FundDraft|null>(null)
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setError('');const n=Number(amount)
  if(!pending.current&&(!name.trim()||!Number.isSafeInteger(n)||n<1||n>1000000000||!date)){setError('입금자명·금액·입금 일시를 확인해주세요.');return}
  if(!pending.current)pending.current={id:crypto.randomUUID(),depositorName:name.trim(),reportedWon:n,remittedAt:new Date(date+':00+09:00').toISOString(),message:message.trim(),publicProfile:true}
  setBusy(true)
  try{await onSubmit(pending.current);pending.current=null;setName('');setAmount('');setMessage('');setComplete(true)}catch(cause){setError(fundError(cause));if(/INVALID_|FUND_REPORT_LIMIT|AUTH_REQUIRED|FUND_PROFILE_REQUIRED/.test(String((cause as {message?:string})?.message)))pending.current=null}finally{setBusy(false)}
 }
 const locked=busy||!!pending.current
 const close=()=>{setComplete(false);onOpenChange(false)}
 return <Dialog open={open} onOpenChange={value=>{if(!busy){if(!value)setComplete(false);onOpenChange(value)}}}><DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl">{complete?<>
  <div className="pb-2 pt-5 text-center"><span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-100/60"><Heart aria-hidden="true" className="size-6 fill-amber-500/15 text-amber-700"/></span><DialogHeader className="items-center text-center"><DialogTitle>따뜻한 마음, 감사합니다.</DialogTitle><DialogDescription className="mt-2 text-center leading-7">입금 내역을 확인한 뒤<br/>후원자 명단에 반영할게요.</DialogDescription></DialogHeader></div>
  <Button autoFocus onClick={close} className="mt-3 min-h-12 w-full rounded-xl">확인</Button>
 </>:<><DialogHeader><DialogTitle>후원 내용 기록하기</DialogTitle><DialogDescription>입금 내역을 알려주시면 운영자가 직접 확인해요.</DialogDescription></DialogHeader>
  <form onSubmit={submit} className="space-y-4">
   <div className="space-y-1.5"><Label htmlFor="fund-payer">입금자명</Label><Input id="fund-payer" value={name} onChange={e=>setName(e.target.value)} maxLength={40} required disabled={locked} autoComplete="off"/></div>
   <div className="space-y-1.5"><Label htmlFor="fund-amount">입금한 금액 (원)</Label><Input id="fund-amount" type="number" inputMode="numeric" min={1} max={1000000000} step={1} value={amount} onChange={e=>setAmount(e.target.value)} required disabled={locked} placeholder="예: 5,000원 → 5000"/></div>
   <div className="space-y-1.5"><Label htmlFor="fund-date">입금 일시 (한국시간)</Label><Input id="fund-date" type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} required disabled={locked} className="min-w-0 w-full"/></div>
   <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-3"><Label htmlFor="fund-message">전달할 메시지 <span className="text-xs font-normal text-muted-foreground">(선택)</span></Label><span id="fund-message-count" className="text-[10px] tabular-nums text-muted-foreground">{message.length} / 200</span></div>
    <textarea id="fund-message" value={message} onChange={e=>setMessage(e.target.value)} maxLength={200} rows={3} disabled={locked} aria-describedby="fund-message-hint fund-message-count" placeholder="운영팀에 전하고 싶은 이야기를 남겨주세요." className="w-full resize-none rounded-xl border border-input bg-secondary/20 px-3 py-2.5 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground/65 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"/>
    <p id="fund-message-hint" className="text-[11px] text-muted-foreground">후원 내역과 함께 운영팀에 전달돼요.</p>
   </div>
   {error&&<p role="alert" className="text-xs leading-5 text-destructive">{error}</p>}
   <div className="mt-6 border-t border-border/50 pt-5"><Button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl text-sm">{busy?<LoaderCircle className="size-4 animate-spin"/>:<Heart className="size-4"/>}{pending.current?'신고 결과 다시 확인':'후원했어요'}</Button></div>
  </form>
 </>}
 </DialogContent></Dialog>
}

export function FundReportsDialog({mode,onClose,service,onChanged}:{mode:'mine'|'manage'|null;onClose:()=>void;service:FundService;onChanged:()=>void}){
 const [filter,setFilter]=useState<FundFilter>('pending'),[items,setItems]=useState<FundReport[]>([]),[more,setMore]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0),[selected,setSelected]=useState<{report:FundReport;action:FundReview['action']}|null>(null)
 const version=useRef(0),busyRef=useRef(false)
 const activeFilter=mode==='mine'?'mine':filter
 useEffect(()=>{if(!mode)return;const v=++version.current;setItems([]);setError('');setLoading(true);busyRef.current=true
  void service.loadFundReports(activeFilter,0).then(r=>{if(v===version.current){setItems(r.items);setMore(r.hasMore)}}).catch(e=>{if(v===version.current)setError(fundError(e))}).finally(()=>{if(v===version.current){setLoading(false);busyRef.current=false}})
  return()=>{version.current++;busyRef.current=false}
 },[mode,activeFilter,revision,service])
 async function loadMore(){if(busyRef.current)return;busyRef.current=true;setLoading(true);const v=version.current;try{const r=await service.loadFundReports(activeFilter,items.length);if(v===version.current){setItems(a=>[...a,...r.items]);setMore(r.hasMore)}}catch(e){if(v===version.current)setError(fundError(e))}finally{if(v===version.current){busyRef.current=false;setLoading(false)}}}
 return <><Dialog open={mode!==null} onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="flex max-h-[88dvh] flex-col gap-3 overflow-hidden rounded-2xl sm:max-w-xl"><DialogHeader><DialogTitle>{mode==='manage'?'발전기금 후원 확인':'내 후원 내역'}</DialogTitle><DialogDescription>{mode==='manage'?'실제 계좌 입금 내역과 대조한 뒤 확인해주세요. 확인된 금액만 명단과 누적 금액에 반영돼요.':'확인 대기 중인 후원은 운영자가 입금 내역을 확인한 뒤 확정해요.'}</DialogDescription></DialogHeader>
  {mode==='manage'&&<div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary/50 p-1">{(['pending','confirmed','rejected'] as const).map(s=><Button key={s} size="sm" variant={filter===s?'secondary':'ghost'} aria-pressed={filter===s} onClick={()=>setFilter(s)}>{statusLabels[s]}</Button>)}</div>}
  <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain pr-1">
   {items.map(r=><article key={r.id} className="space-y-2.5 rounded-xl border border-border/70 bg-secondary/15 p-3.5">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{r.nickname??'탈퇴한 유저'}</p><span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] ${r.status==='confirmed'?'bg-emerald-100/60 text-emerald-800':'bg-secondary text-primary'}`}>{r.status==='confirmed'?<CheckCircle2 className="size-3"/>:<Clock3 className="size-3"/>}{statusLabels[r.status]}</span></div>
    <p className="text-lg font-medium tabular-nums text-primary">{won(r.confirmedWon??r.reportedWon)}</p>
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] leading-5"><dt className="text-muted-foreground">입금자명</dt><dd className="break-all">{r.depositorName}</dd><dt className="text-muted-foreground">입금 일시</dt><dd>{fundDate(r.remittedAt)}</dd>{r.confirmedWon!==null&&r.confirmedWon!==r.reportedWon&&<><dt className="text-muted-foreground">신고 금액</dt><dd>{won(r.reportedWon)}</dd></>}</dl>
    {r.message&&<p className="whitespace-pre-wrap break-words rounded-lg bg-background/70 p-2 text-xs leading-5">{r.message}</p>}
    {!r.publicProfile&&<p className="flex items-center gap-1 text-[10px] text-muted-foreground"><EyeOff className="size-3"/>명단 비공개</p>}
    {r.reviewReason&&<p className="break-words text-xs text-muted-foreground">운영자 메모: {r.reviewReason}</p>}
    {mode==='manage'&&<div className="flex flex-wrap justify-end gap-2 border-t border-border/50 pt-2">{r.status!=='pending'&&<Button size="sm" variant="outline" onClick={()=>setSelected({report:r,action:'reopen'})}>확인 취소</Button>}{r.status!=='rejected'&&<Button size="sm" variant="ghost" onClick={()=>setSelected({report:r,action:'reject'})}>반려</Button>}{r.status!=='confirmed'&&<Button size="sm" onClick={()=>setSelected({report:r,action:'confirm'})}>입금 확인</Button>}</div>}
   </article>)}
   {loading&&<p role="status" className="p-5 text-center text-xs text-muted-foreground">후원 내역을 불러오고 있어요.</p>}
   {!loading&&!items.length&&!error&&<p className="p-8 text-center text-sm text-muted-foreground">표시할 후원 내역이 없어요.</p>}
   {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
   {more&&<Button variant="outline" disabled={loading} onClick={()=>void loadMore()} className="w-full">더 보기</Button>}
  </div>
 </DialogContent></Dialog>
 {selected&&<FundReviewDialog selection={selected} onClose={()=>setSelected(null)} onConfirm={async d=>{await service.reviewFund(d);setRevision(v=>v+1);onChanged()}}/>}</>
}

function FundReviewDialog({selection,onClose,onConfirm}:{selection:{report:FundReport;action:FundReview['action']};onClose:()=>void;onConfirm:(d:FundReview)=>Promise<void>}){
 const {report:r,action}=selection,[amount,setAmount]=useState(String(r.reportedWon)),[reason,setReason]=useState(''),[reference,setReference]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),pending=useRef<FundReview|null>(null)
 const title=action==='confirm'?'실제 입금을 확인했나요?':action==='reject'?'후원 신고를 반려할까요?':'확인 대기로 되돌릴까요?'
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setError('');if(!pending.current)pending.current={operationId:crypto.randomUUID(),id:r.id,action,revision:r.revision,confirmedWon:action==='confirm'?Number(amount):null,reason:reason.trim(),bankReference:reference.trim()||null};setBusy(true);try{await onConfirm(pending.current);onClose()}catch(e){setError(fundError(e));if(/FUND_REPORT_CHANGED|FUND_DUPLICATE_TRANSFER|INVALID_/.test(String((e as {message?:string})?.message)))pending.current=null}finally{setBusy(false)}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose()}}><DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{r.depositorName} · {fundDate(r.remittedAt)} · 신고 금액 {won(r.reportedWon)}{action==='confirm'?' — 계좌에서 확인한 금액으로 확정해주세요.':' — 명단과 누적 후원액에도 즉시 반영돼요.'}</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4">
  {action==='confirm'&&<><div className="space-y-1.5"><Label htmlFor="fund-confirmed">실제 확인 금액 (원)</Label><Input id="fund-confirmed" type="number" min={1} max={1000000000} step={1} required value={amount} disabled={busy||!!pending.current} onChange={e=>setAmount(e.target.value)}/></div><div className="space-y-1.5"><Label htmlFor="fund-reference">입금 식별번호 <span className="font-normal text-muted-foreground">선택</span></Label><Input id="fund-reference" maxLength={100} value={reference} disabled={busy||!!pending.current} onChange={e=>setReference(e.target.value)}/><p className="text-[11px] text-muted-foreground">은행 거래번호 등을 적으면 같은 입금의 중복 확인을 막을 수 있어요.</p></div></>}
  <div className="space-y-1.5"><Label htmlFor="fund-reason">확인 메모 <span className="font-normal text-muted-foreground">선택</span></Label><Input id="fund-reason" maxLength={200} value={reason} disabled={busy||!!pending.current} onChange={e=>setReason(e.target.value)}/></div>
  {error&&<p role="alert" className="text-xs leading-5 text-destructive">{error}</p>}
  <Button type="submit" disabled={busy} className="w-full">{busy&&<LoaderCircle className="size-4 animate-spin"/>}{pending.current?'같은 요청으로 다시 확인':action==='confirm'?'확인 완료':action==='reject'?'반려하기':'확인 대기로 변경'}</Button>
 </form></DialogContent></Dialog>
}
