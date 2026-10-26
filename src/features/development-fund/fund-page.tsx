import {useCallback,useEffect,useRef,useState} from 'react'
import {Check,ChevronDown,Copy,Heart,History,MessageCircle,RefreshCw,ShieldCheck,UsersRound} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/components/auth-provider'
import {invalidateAccountResource} from '@/lib/account-cache'
import {Button} from '@/components/ui/button'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import * as api from './api'
import {bankAccount,fundError} from './api'
import type {FundDraft,FundState} from './api'
import {FundReportsDialog,FundSubmitDialog} from './fund-dialogs'
import {FundCheerWall} from './fund-cheers'
import {FundStory} from './fund-story'
const emptyCheers={items:[],hasMore:false}
const supporterHonors=[
 {emoji:'👑',title:'퐁당섬 대주주'},
 {emoji:'💎',title:'퐁당섬 명예이사'},
 {emoji:'🏛️',title:'퐁당섬 수석고문'},
 {emoji:'⚓',title:'퐁당섬 운영위원'},
 {emoji:'🧭',title:'퐁당섬 개척단장'},
 {emoji:'🌟',title:'퐁당섬 특별고문'},
 {emoji:'🐚',title:'퐁당섬 명예위원'},
 {emoji:'🦀',title:'퐁당섬 발전위원'},
 {emoji:'🐟',title:'퐁당섬 협력위원'},
 {emoji:'🪙',title:'퐁당섬 명예주주'},
] as const
export type FundService=Pick<typeof api,'loadFund'|'loadFundReports'|'submitFund'|'reviewFund'|'loadCheers'|'writeCheer'>

export function DevelopmentFund(){const {session}=useAuth();return <DevelopmentFundScreen key={session?.user.id??'guest'} owner={session?.user.id??''}/>}

export function DevelopmentFundScreen({owner,service=api}:{owner:string;service?:FundService}){
 const [tab,setTab]=useState('donate')
 const scroll=useRef<HTMLDivElement>(null)
 const [state,setState]=useState<FundState|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[submitting,setSubmitting]=useState(false),[reports,setReports]=useState<'mine'|'manage'|null>(null),[copied,setCopied]=useState(false)
 const alive=useRef(true),request=useRef(0),busy=useRef(false),copyTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 const reload=useCallback(async()=>{const version=++request.current;setLoading(true);try{const data=await service.loadFund();if(alive.current&&version===request.current){setState(data);setError('')}}catch(e){if(alive.current&&version===request.current)setError(fundError(e))}finally{if(alive.current&&version===request.current)setLoading(false)}},[service])
 useEffect(()=>{alive.current=true;if(owner)void reload();const resume=()=>{if(owner&&!document.hidden)void reload()};window.addEventListener('focus',resume);window.addEventListener('online',resume);return()=>{alive.current=false;request.current++;clearTimeout(copyTimer.current);window.removeEventListener('focus',resume);window.removeEventListener('online',resume)}},[owner,reload])
 async function copyAccount(){try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(bankAccount.copy);else{const node=document.createElement('textarea');node.value=bankAccount.copy;node.style.position='fixed';node.style.opacity='0';document.body.append(node);node.select();const success=document.execCommand('copy');node.remove();if(!success)throw Error('clipboard')}setCopied(true);clearTimeout(copyTimer.current);copyTimer.current=setTimeout(()=>setCopied(false),2000);toast.success('계좌번호를 복사했어요.')}catch{toast.error('계좌번호를 길게 눌러 복사해주세요.')}}
 async function loadMore(){if(!state||busy.current)return;busy.current=true;const v=request.current;setLoading(true);try{const next=await service.loadFund(state.supporters.length);if(alive.current&&v===request.current)setState(current=>current?{...next,supporters:[...current.supporters,...next.supporters]}:next)}catch(e){if(alive.current&&v===request.current)setError(fundError(e))}finally{busy.current=false;if(alive.current&&v===request.current)setLoading(false)}}
 async function submit(draft:FundDraft){await service.submitFund(draft);if(alive.current)void reload()}
 const supporters=state?.supporters??[]
 return <Tabs value={tab} onValueChange={value=>{setTab(String(value));scroll.current?.scrollTo?.({top:0})}} className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col">
  <TabsList aria-label="발전기금 페이지" className="grid shrink-0 grid-cols-3 rounded-none border-b border-border/60 bg-background p-0">
   <TabsTrigger value="donate" className="min-h-12 min-w-0 gap-1 rounded-none px-1 text-[11px] data-active:shadow-[inset_0_-2px_0_var(--color-primary)]"><Heart className="size-3.5 shrink-0"/>후원하기</TabsTrigger>
   <TabsTrigger value="supporters" className="min-h-12 min-w-0 gap-1 rounded-none px-1 text-[11px] data-active:shadow-[inset_0_-2px_0_var(--color-primary)]"><UsersRound className="size-3.5 shrink-0"/>후원자 명단</TabsTrigger>
   <TabsTrigger value="cheers" className="min-h-12 min-w-0 gap-1 rounded-none px-1 text-[11px] data-active:shadow-[inset_0_-2px_0_var(--color-primary)]"><MessageCircle className="size-3.5 shrink-0"/>응원의 한마디</TabsTrigger>
  </TabsList>
  <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
  <TabsContent value="donate" className="mt-0 pt-6">
  <FundStory active={tab==='donate'&&!submitting&&!reports}/>
  <div aria-label="확인된 후원 현황" className="my-5 flex items-center justify-center gap-4 text-center">
   <div><p className="text-[10px] text-muted-foreground">함께 모은 마음</p><p className="mt-1 text-lg font-medium tabular-nums text-primary">{state?state.summary.donationCount.toLocaleString('ko-KR'):'—'}<span className="ml-1 text-[11px] font-normal">회</span></p></div>
   <span aria-hidden="true" className="h-7 w-px bg-border/70"/>
   <div><p className="text-[10px] text-muted-foreground">함께해주신 분</p><p className="mt-1 text-lg font-medium tabular-nums text-primary">{state?state.summary.supporterCount.toLocaleString('ko-KR'):'—'}<span className="ml-1 text-[11px] font-normal">명</span></p></div>
  </div>
  <section aria-label="발전기금 후원 계좌" className="rounded-2xl border border-primary/12 bg-secondary/25 p-3.5">
   <div className="flex items-center justify-between gap-1"><div className="min-w-0"><p className="text-[10px] text-muted-foreground">{bankAccount.bank}</p><p className="mt-1 select-all text-[15px] font-medium tabular-nums tracking-wide">{bankAccount.display}</p></div><Button variant="ghost" size="sm" onClick={()=>void copyAccount()} aria-label="계좌번호 복사" className="shrink-0 gap-1 rounded-lg px-2 text-[11px] text-primary">{copied?<Check className="size-3.5"/>:<Copy className="size-3.5"/>}{copied?'복사 완료':'복사'}</Button></div>
   <Button type="button" onClick={()=>setSubmitting(true)} disabled={!owner} className="mt-3 min-h-11 w-full gap-2 rounded-xl text-xs"><Heart className="size-3.5"/>후원했어요</Button>
   <p className="mt-2 text-center text-[10px] leading-5 text-muted-foreground">계좌이체 후 알려주시면 운영자가 확인해요.</p>
  </section>
  <div className="mb-4 mt-1 flex flex-wrap items-center justify-between gap-1"><button onClick={()=>setReports('mine')} disabled={!owner} className="flex min-h-10 items-center gap-1 text-[10px] text-muted-foreground hover:text-primary disabled:opacity-50"><History className="size-3"/>내 후원 내역{state&&state.myPendingCount>0&&<span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-primary">대기 {state.myPendingCount}</span>}</button>{state?.operator&&<Button variant="ghost" size="sm" className="gap-1 px-1 text-[10px] text-muted-foreground" onClick={()=>setReports('manage')}><ShieldCheck className="size-3"/>후원 확인</Button>}</div>
  </TabsContent>
  <TabsContent value="supporters" className="mt-0 pt-5">
  <section aria-label="후원자 명단" className="pb-5">
   <div className="mb-4 flex items-center justify-between gap-2"><p className="text-[11px] leading-6 text-muted-foreground">보내주신 마음, 소중히 간직할게요 💛</p><Button variant="ghost" size="icon" aria-label="후원 내역 새로고침" disabled={loading} onClick={()=>{if(service===api)invalidateAccountResource('development-fund',owner);void reload()}} className="size-7 shrink-0 text-muted-foreground"><RefreshCw className={`size-3 ${loading?'animate-spin':''}`}/></Button></div>
   {supporters.length>0?<ul aria-label="후원자" className="space-y-2">{supporters.map(s=>{
    const border=s.rank===1?'border-amber-300/45':s.rank===2?'border-slate-300/55':s.rank===3?'border-orange-300/40':'border-primary/10'
    const honor=supporterHonors[s.rank-1]??{emoji:'💛',title:'퐁당섬 숨은 공신'}
    return <li key={s.userId} aria-label={s.nickname} className={`flex min-w-0 items-center gap-3 rounded-xl border ${border} bg-secondary/15 px-3.5 py-3`}>
     <span aria-label={`${s.rank}번째 후원자`} className="w-4 shrink-0 text-center text-[11px] tabular-nums text-muted-foreground">{s.rank}</span>
     <PlayerAvatar userId={s.userId} nickname={s.nickname} path={s.avatarPath} className="size-11 shrink-0"/>
     <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{s.nickname}</p><p className="mt-1 flex items-center gap-1.5 text-[10px] leading-5 text-primary/75"><span aria-hidden="true">{honor.emoji}</span><span className="truncate">{honor.title}</span></p></div>
    </li>
   })}</ul>:!loading&&<p className="py-5 text-center text-[11px] leading-6 text-muted-foreground">아직 공개된 후원이 없어요.<br/>함께해주신 마음이 이곳에 남아요.</p>}
   {loading&&!state&&<p role="status" className="py-5 text-center text-xs text-muted-foreground">후원 소식을 불러오고 있어요.</p>}
   {state?.hasMore&&<Button variant="ghost" disabled={loading} onClick={()=>void loadMore()} className="mt-3 w-full text-xs">더 보기<ChevronDown className="size-3"/></Button>}
  </section>
  </TabsContent>
  <TabsContent value="cheers" keepMounted className="mt-0 pt-5">
  {state?<FundCheerWall initial={state.cheers??emptyCheers} service={service} onChanged={reload}/>:loading&&<p role="status" className="py-5 text-center text-xs text-muted-foreground">응원을 불러오고 있어요.</p>}
  </TabsContent>
  {error&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  </div>
  <FundSubmitDialog open={submitting} onOpenChange={setSubmitting} onSubmit={submit}/>
  <FundReportsDialog mode={reports} onClose={()=>setReports(null)} service={service} onChanged={()=>void reload()}/>
 </Tabs>
}
