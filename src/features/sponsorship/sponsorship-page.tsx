import {useEffect,useRef,useState} from 'react'
import type {FormEvent} from 'react'
import {Check,ChevronRight,HandCoins,Plus,Users} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {VisitableAvatar as PlayerAvatar} from '@/features/profile/visitable-avatar'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import * as api from './api'
import type {Sponsorship,SponsorshipDraft,SponsorshipFeed,SponsorshipTab} from './api'

const number=(value:number)=>value.toLocaleString('ko-KR')
const tabs:[SponsorshipTab,string][]=[['active','진행 중'],['completed','종료된 후원'],['mine','내 후원·수령']]
export type SponsorshipService=Pick<typeof api,'loadSponsorships'|'loadSponsorship'|'createSponsorship'|'claimSponsorship'|'cancelSponsorship'>

export function SponsorshipPage(){
 const {session}=useAuth(),{wallet}=useGold()
 return <SponsorshipScreen key={session?.user.id} owner={session?.user.id??''} gold={wallet.gold}/>
}

export function SponsorshipScreen({owner,gold,service=api}:{owner:string;gold:number;service?:SponsorshipService}){
 const [tab,setTab]=useState<SponsorshipTab>('active'),[page,setPage]=useState(0),[revision,setRevision]=useState(0)
 const [feed,setFeed]=useState<SponsorshipFeed|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState<string|null>(null)
 const [creating,setCreating]=useState(false),[cancelling,setCancelling]=useState<Sponsorship|null>(null)
 const [detailId,setDetailId]=useState<string|null>(null),[detail,setDetail]=useState<Sponsorship|null>(null),[detailError,setDetailError]=useState(''),[detailRevision,setDetailRevision]=useState(0)
 const active=useRef(true),locked=useRef(false),mutationVersion=useRef(0)
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 useEffect(()=>{
  if(!owner)return
  let live=true,running=false,paused=false
  setFeed(null);setError('')
  const load=async()=>{
   if(!live||running||locked.current||document.hidden||paused)return
   running=true
   const version=mutationVersion.current
   try{const value=await service.loadSponsorships(tab,page*10);if(live&&version===mutationVersion.current){setFeed(value);setError('')}}
   catch(cause){if(live){setError(api.sponsorshipError(cause));paused=(cause as {status?:number;code?:string})?.status===401||(cause as {code?:string})?.code==='42501'}}
   finally{running=false}
  }
  void load()
  const resume=()=>{paused=false;void load()}
  const timer=setInterval(()=>void load(),15000)
  window.addEventListener('focus',resume);window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume)
  return()=>{live=false;clearInterval(timer);window.removeEventListener('focus',resume);window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume)}
 },[owner,tab,page,revision,service])
 useEffect(()=>{
  if(!detailId)return
  let live=true;setDetail(null);setDetailError('')
  service.loadSponsorship(detailId).then(value=>{if(live)setDetail(value)}).catch(cause=>{if(live)setDetailError(api.sponsorshipError(cause))})
  return()=>{live=false}
 },[detailId,detailRevision,service])
 function replace(post:Sponsorship){mutationVersion.current++;setFeed(value=>value?{...value,items:value.items.map(item=>item.id===post.id?post:item)}:value);if(detailId===post.id)setDetail(post)}
 async function receive(post:Sponsorship){
  if(locked.current)return
  locked.current=true;setBusy(post.id)
  try{const value=await service.claimSponsorship(post.id);if(active.current){replace(value)}}
  catch(cause){if(active.current){toast.error(api.sponsorshipError(cause));setRevision(value=>value+1)}}
  finally{locked.current=false;if(active.current)setBusy(null)}
 }
 async function cancel(){
  if(!cancelling||locked.current)return
  locked.current=true;setBusy(cancelling.id)
  try{const value=await service.cancelSponsorship(cancelling.id);if(active.current){replace(value);setCancelling(null);toast.success('후원을 취소했어요.')}}
  catch(cause){if(active.current)toast.error(api.sponsorshipError(cause))}
  finally{locked.current=false;if(active.current)setBusy(null)}
 }
 async function create(draft:SponsorshipDraft){
  if(locked.current)throw new Error('REQUEST_RUNNING')
  locked.current=true
  try{await service.createSponsorship(draft);if(active.current){setCreating(false);setTab('active');setPage(0);setRevision(value=>value+1);toast.success('후원소에 따뜻한 마음을 남겼어요.')}}
  finally{locked.current=false}
 }
 return <section aria-label="후원소" className="flex min-h-0 flex-1 flex-col">
  <div role="group" aria-label="후원 목록 분류" className="grid shrink-0 grid-cols-3 border-b border-border/60">{tabs.map(([key,label])=><button key={key} type="button" aria-pressed={tab===key} onClick={()=>{setTab(key);setPage(0)}} className={`min-h-12 border-b-2 px-1 text-xs ${tab===key?'border-primary font-medium text-primary':'border-transparent text-muted-foreground'}`}>{label}</button>)}</div>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-secondary/15 px-3 pb-6 pt-3">
   {error&&<div role="alert" className="mb-3 rounded-xl border border-destructive/20 bg-background p-4 text-xs leading-5"><p>{error}</p><Button variant="ghost" size="sm" onClick={()=>setRevision(value=>value+1)}>다시 불러오기</Button></div>}
   {!feed&&!error?<div role="status" className="space-y-3" aria-label="후원을 불러오는 중">{[0,1].map(i=><div key={i} className="h-64 rounded-2xl border bg-background motion-safe:animate-pulse"/>)}</div>:
    feed?.items.length?<div className="space-y-3">{feed.items.map(post=><SponsorshipCard key={post.id} post={post} busy={busy!==null} receiving={busy===post.id} onReceive={()=>void receive(post)} onPeople={()=>setDetailId(post.id)} onCancel={()=>setCancelling(post)}/>)}</div>:
    !error&&<div className="flex flex-col items-center px-5 py-14 text-center"><span className="mb-4 grid size-16 place-items-center rounded-full bg-primary/5"><HandCoins className="size-8 text-primary/65" strokeWidth={1.4}/></span><p className="text-sm">{tab==='active'?'아직 진행 중인 후원이 없어요.':tab==='mine'?'아직 열거나 받은 후원이 없어요.':'아직 종료된 후원이 없어요.'}</p><p className="mt-2 text-xs leading-6 text-muted-foreground">{tab==='active'?'첫 번째 후원으로 마음을 나눠보세요.':'함께 나눈 마음이 여기에 남아요.'}</p>{tab==='active'&&<Button variant="outline" className="mt-5 min-h-11 rounded-xl text-xs" onClick={()=>setCreating(true)}>첫 후원 열기</Button>}</div>}
   {feed&&(page>0||feed.hasMore)&&<div className="mt-4 flex items-center justify-between"><Button variant="ghost" disabled={page===0} onClick={()=>setPage(value=>value-1)}>이전</Button><span className="text-xs text-muted-foreground">{page+1}페이지</span><Button variant="ghost" disabled={!feed.hasMore} onClick={()=>setPage(value=>value+1)}>다음</Button></div>}
  </div>
  <footer className="shrink-0 border-t border-border/60 bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
   <Button className="min-h-12 w-full gap-2 rounded-xl text-sm shadow-sm" disabled={busy!==null} onClick={()=>setCreating(true)}><Plus className="size-4"/>후원하기</Button>
  </footer>
  <SponsorshipCreateDialog open={creating} onOpenChange={setCreating} gold={gold} onCreate={create}/>
  <ConfirmDialog open={!!cancelling} onOpenChange={open=>{if(!open)setCancelling(null)}} title="후원을 취소할까요?" description={`아직 받은 사람이 없어요. 맡긴 ${number(cancelling?.totalGold??0)}골드를 전액 돌려받아요.`} confirmLabel="취소하고 돌려받기" cancelLabel="유지하기" busy={busy!==null} onConfirm={()=>void cancel()} compact/>
  <Dialog open={detailId!==null} onOpenChange={open=>{if(!open)setDetailId(null)}}><DialogContent className="max-h-[80dvh] max-w-sm overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>받은 사람</DialogTitle><DialogDescription>{detail?`${detail.claimedCount}명이 각각 ${number(detail.goldEach)}골드를 받았어요.`:'따뜻한 마음을 받은 퐁이들을 확인해요.'}</DialogDescription></DialogHeader>
   {detailError?<div role="alert" className="text-xs"><p>{detailError}</p><Button variant="outline" onClick={()=>setDetailRevision(value=>value+1)}>다시 불러오기</Button></div>:!detail?<p role="status" className="py-8 text-center text-xs text-muted-foreground">받은 사람을 불러오는 중…</p>:detail.recipients.length?<ol className="grid grid-cols-3 gap-x-3 gap-y-5 py-3">{detail.recipients.map(person=><li key={person.slot} className="flex min-w-0 flex-col items-center gap-2"><PlayerAvatar userId={person.id} nickname={person.nickname} path={person.avatarPath} className="size-12"/><span className="w-full truncate text-center text-xs" title={person.nickname}>{person.nickname}</span><span className="text-[10px] tabular-nums text-muted-foreground">{person.slot}번째 수령</span></li>)}</ol>:<p className="py-8 text-center text-xs text-muted-foreground">첫 번째 퐁이를 기다리고 있어요.</p>}
  </DialogContent></Dialog>
 </section>
}

export function SponsorshipCard({post,busy=false,receiving=false,onReceive,onPeople,onCancel}:{post:Sponsorship;busy?:boolean;receiving?:boolean;onReceive:()=>void;onPeople:()=>void;onCancel:()=>void}){
 const completed=post.status==='completed',cancelled=post.status==='cancelled'
 const remaining=post.slots-post.claimedCount
 const label=cancelled?'취소됨':completed?'후원 완료':'진행 중'
 const count=Math.min(8,post.slots),empty=Math.max(0,count-post.recipients.length)
 return <article aria-label={`${post.owner.nickname}님의 후원`} className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm shadow-black/[0.02]">
  <div className="p-4">
   <div className="flex min-w-0 items-center gap-2.5"><PlayerAvatar userId={post.owner.id} nickname={post.owner.nickname} path={post.owner.avatarPath} className="size-9"/><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium" title={post.owner.nickname}>{post.owner.nickname}<span className="font-normal text-muted-foreground">님의 후원</span></p><p className="mt-0.5 text-[10px] text-muted-foreground">{new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(post.createdAt))}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${completed?'bg-primary/10 text-primary':cancelled?'bg-secondary text-muted-foreground':'bg-amber-100/70 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'}`}>{completed&&<Check className="mr-0.5 inline size-3"/>}{label}</span></div>
   {post.message&&<p className="mt-4 whitespace-pre-wrap break-words text-xs leading-6 text-foreground/85">{post.message}</p>}
   <div className="my-4 flex items-center justify-between gap-2 rounded-xl bg-secondary/50 px-3 py-3"><div><p className="text-[10px] text-muted-foreground">한 사람당</p><p className="mt-1 flex items-center gap-1 text-xl font-medium tabular-nums"><GoldIcon className="size-6"/>{number(post.goldEach)}<span className="ml-0.5 text-[11px] font-normal text-muted-foreground">골드</span></p></div><div className="text-right"><p className="text-xs tabular-nums"><span className="font-medium text-primary">{post.claimedCount}</span><span className="text-muted-foreground"> / {post.slots}명 수령</span></p><p className="mt-1 text-[10px] text-muted-foreground">{cancelled?'전액 반환됐어요':completed?'모두에게 전달됐어요':`${remaining}자리가 남았어요`}</p></div></div>
   <div role="progressbar" aria-label="후원 수령 진행" aria-valuenow={post.claimedCount} aria-valuemin={0} aria-valuemax={post.slots} className="mb-4 h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary/60 transition-[width] motion-reduce:transition-none" style={{width:`${post.claimedCount/post.slots*100}%`}}/></div>
   <div className="flex items-center justify-between"><p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Users className="size-3"/>마음을 받은 퐁이들</p><button type="button" onClick={onPeople} className="inline-flex min-h-9 items-center gap-0.5 text-[10px] text-primary">전체 보기<ChevronRight className="size-3"/></button></div>
   <div className="mt-1 grid grid-cols-4 gap-x-2 gap-y-3">{post.recipients.slice(0,8).map(person=><div key={person.slot} className="flex min-w-0 flex-col items-center gap-1.5"><PlayerAvatar userId={person.id} nickname={person.nickname} path={person.avatarPath} className="size-9"/><span className="w-full truncate text-center text-[10px]" title={person.nickname}>{person.nickname}</span></div>)}{!cancelled&&Array.from({length:empty},(_,index)=><div key={`empty-${index}`} className="flex min-w-0 flex-col items-center gap-1.5"><span aria-hidden="true" className="grid size-9 place-items-center rounded-full border border-dashed border-border bg-secondary/20"><span className="size-1 rounded-full bg-muted-foreground/30"/></span><span className="text-[10px] text-muted-foreground/65">기다리는 중</span></div>)}</div>
   {post.claimedCount>8&&<button type="button" onClick={onPeople} className="mt-3 min-h-9 w-full text-center text-[10px] text-muted-foreground">외 {post.claimedCount-8}명의 퐁이가 받았어요</button>}
  </div>
  <div className="border-t border-border/50 px-4 py-3">
   {post.received?<p role="status" className="flex min-h-11 items-center justify-center gap-1.5 text-xs text-primary"><Check className="size-4"/>{number(post.goldEach)}골드 받았어요</p>:
    post.status!=='active'?<p className="flex min-h-11 items-center justify-center text-xs text-muted-foreground">{completed?'모든 골드가 전달되어 종료됐어요.':'후원자가 취소한 후원이에요.'}</p>:
    post.mine?<div className="flex min-h-11 items-center justify-between gap-2"><p className="text-[11px] text-muted-foreground">내가 연 후원이에요.</p>{post.claimedCount===0?<Button variant="ghost" size="sm" disabled={busy} onClick={onCancel} className="min-h-11 text-[11px]">후원 취소</Button>:<p className="text-[10px] text-primary">마음을 나누는 중</p>}</div>:
    <Button className="min-h-11 w-full gap-1.5 rounded-xl text-xs" disabled={busy} aria-busy={receiving} onClick={onReceive}>{receiving?'받는 중…':<><GoldIcon className="size-4"/>{number(post.goldEach)}골드 받기</>}</Button>}
  </div>
 </article>
}

export function SponsorshipCreateDialog({open,onOpenChange,gold,onCreate}:{open:boolean;onOpenChange:(open:boolean)=>void;gold:number;onCreate:(draft:SponsorshipDraft)=>Promise<void>}){
 const [amount,setAmount]=useState('500'),[slots,setSlots]=useState('10'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const pending=useRef<{signature:string;draft:SponsorshipDraft}|null>(null),locked=useRef(false)
 const each=Number(amount),people=Number(slots),total=each*people
 const valid=Number.isInteger(each)&&each>=1&&each<=1000000000&&Number.isInteger(people)&&people>=1&&people<=100&&total<=1000000000&&total<=gold
 async function submit(event:FormEvent){
  event.preventDefault();if(!valid||locked.current)return
  locked.current=true;setBusy(true);setError('')
  const body={goldEach:each,slots:people,message:message.trim()},signature=JSON.stringify(body)
  if(!pending.current||pending.current.signature!==signature)pending.current={signature,draft:{operationId:crypto.randomUUID(),...body}}
  try{await onCreate(pending.current.draft);pending.current=null;setMessage('');onOpenChange(false)}
  catch(cause){setError(api.sponsorshipError(cause))}
  finally{locked.current=false;setBusy(false)}
 }
 return <Dialog open={open} onOpenChange={value=>{if(!busy){setError('');onOpenChange(value)}}}><DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle>후원하기</DialogTitle><DialogDescription>같은 금액을 정한 인원에게 선착순으로 나눠요.</DialogDescription></DialogHeader><form onSubmit={event=>void submit(event)} className="space-y-5">
  <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="sponsorship-amount" className="text-xs">1인당 골드</Label><Input id="sponsorship-amount" type="number" inputMode="numeric" min={1} max={1000000000} step={1} value={amount} onChange={event=>setAmount(event.target.value)} disabled={busy} required className="min-h-11"/></div><div className="space-y-2"><Label htmlFor="sponsorship-slots" className="text-xs">받을 인원</Label><Input id="sponsorship-slots" type="number" inputMode="numeric" min={1} max={100} step={1} value={slots} onChange={event=>setSlots(event.target.value)} disabled={busy} required className="min-h-11"/></div></div>
  <div className="space-y-2"><Label htmlFor="sponsorship-message" className="text-xs">함께 남길 한마디 <span className="text-muted-foreground">(선택)</span></Label><textarea id="sponsorship-message" value={message} onChange={event=>setMessage(event.target.value)} maxLength={120} rows={3} disabled={busy} placeholder="오늘의 행운을 함께 나눠요!" className="w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"/><p className="text-right text-[10px] tabular-nums text-muted-foreground">{message.length} / 120</p></div>
  <div className="rounded-xl bg-secondary/60 p-4"><p className="text-[11px] text-muted-foreground">총 후원 골드</p><p className="mt-2 flex items-center gap-1.5 text-2xl font-medium tabular-nums"><GoldIcon className="size-7"/>{Number.isSafeInteger(total)&&total>=0?number(total):'—'}<span className="text-xs font-normal">골드</span></p><p className={`mt-2 text-[11px] ${total>gold?'text-destructive':'text-muted-foreground'}`}>보유 골드 {number(gold)}{total>gold?' · 골드가 부족해요.':''}</p></div>
  <ul className="space-y-1 text-[11px] leading-5 text-muted-foreground"><li>등록할 때 총 후원 골드를 맡겨요.</li><li>누구나 한 후원에서 한 번씩 받을 수 있어요.</li><li>내 후원은 받을 수 없고, 진행 중인 후원은 하나만 열어요.</li><li>첫 수령 전에는 취소할 수 있어요. 수령이 시작되면 전원 수령 시 종료돼요.</li></ul>
  {error&&<p role="alert" className="text-xs leading-5 text-destructive">{error}</p>}
  <Button type="submit" disabled={!valid||busy} aria-busy={busy} className="min-h-12 w-full rounded-xl text-xs">{busy?'후원을 여는 중…':`${valid?number(total)+'골드로 ':''}후원 열기`}</Button>
 </form></DialogContent></Dialog>
}
