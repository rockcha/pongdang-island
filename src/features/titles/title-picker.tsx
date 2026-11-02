import {EquippedTitleText} from '@/features/titles/equipped-title-text'
import {titleTiers,TitleTierDot,TitleTierLegend} from './title-tier'
import {useEffect,useRef,useState} from 'react'
import {useSearchParams} from 'react-router'
import {Check,ChevronRight,RefreshCw,Search,X} from 'lucide-react'
import {appArt} from '@/components/app-art'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog'
import {useSocial} from '@/features/social/social-provider'
import {equipTitle,readTitles} from './api'
import {useAuth} from '@/components/auth-provider'
import {useAccountResource} from '@/lib/account-query'
import {matchesTitleSearch} from './title-search'

const categories=[['all','전체'],['growth','성장'],['moment','특별한 순간'],['collection','수집·꾸미기'],['arcade','미니게임'],['social','소셜']] as const
export function TitlePicker({page=false}:{page?:boolean}){
 const {session}=useAuth()
 return <TitlePickerContent page={page} key={session?.user.id??'guest'}/>
}
function TitlePickerContent({page=false}:{page?:boolean}){
 const {profile,refresh}=useSocial();const [params,setParams]=useSearchParams()
 const [open,setOpen]=useState(page),[category,setCategory]=useState('all'),[owned,setOwned]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[search,setSearch]=useState(''),[tier,setTier]=useState('all')
 const query=useAccountResource('titles',readTitles,{enabled:open}),data=query.data,loading=query.isFetching
 const locked=useRef(false),alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 useEffect(()=>{if(params.get('titles')==='1')setOpen(true)},[params])
 useEffect(()=>{if(query.error)setError('칭호를 불러오지 못했어요. 다시 확인해주세요.')},[query.error])
 function changeOpen(value:boolean){setOpen(value);if(!value&&params.has('titles')){const next=new URLSearchParams(params);next.delete('titles');setParams(next,{replace:true})}}
 async function equip(id:string|null){if(locked.current)return;locked.current=true;setBusy(true);setError('');try{await equipTitle(id);if(alive.current)await refresh()}catch{if(alive.current)setError('칭호를 변경하지 못했어요. 획득 여부와 연결을 확인해주세요.')}finally{locked.current=false;if(alive.current)setBusy(false)}}
 const entries=data?.titles.filter(t=>(category==='all'||t.category===category)&&(!owned||t.earnedAt)&&(tier==='all'||t.tier===Number(tier))&&matchesTitleSearch(t.name,search))??[]
 const equipped=data?.titles.find(t=>t.id===data.equipped)
 const ContentHeader=page?'header':DialogHeader,ContentTitle=page?'h1':DialogTitle,ContentDescription=page?'p':DialogDescription
 const content=<>
   {!page&&<div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"/>}
   <ContentHeader className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">{page?<p className="text-xs text-muted-foreground">나의 바다 이야기를 모아보세요.</p>:<div><ContentTitle className="flex items-center gap-2 text-lg font-normal"><appArt.title className="size-7"/>칭호</ContentTitle><ContentDescription className="sr-only">칭호를 확인하고 장착해요.</ContentDescription></div>}<p className="shrink-0 text-xs tabular-nums text-muted-foreground">획득 <span className="text-primary">{data?.titles.filter(t=>t.earnedAt).length??'…'}</span> / {data?.titles.length??'…'}</p></ContentHeader>
   <div role="group" aria-label="칭호 분류" className="segmented-control grid shrink-0 grid-cols-6 border-b">{categories.map(([key,label])=><button key={key} aria-pressed={category===key} onClick={()=>setCategory(key)} className={`min-h-11 px-1 text-[11px] ${category===key?'bg-secondary text-primary':'text-muted-foreground'}`}>{label}</button>)}</div>
   <div className="flex shrink-0 gap-2 border-b px-4 py-3"><div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input role="searchbox" aria-label="칭호 검색" placeholder="칭호 이름 검색 · 초성도 가능해요" value={search} onChange={e=>setSearch(e.target.value)} className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-10 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"/>{search&&<Button variant="ghost" size="icon" aria-label="칭호 검색 지우기" className="absolute right-1 top-1/2 size-9 -translate-y-1/2" onClick={()=>setSearch('')}><X className="size-4"/></Button>}</div><select aria-label="칭호 등급" value={tier} onChange={e=>setTier(e.target.value)} className="h-11 shrink-0 rounded-xl border border-border bg-background px-2 text-xs"><option value="all">전체 등급</option><option value="1">일반</option><option value="2">희귀</option><option value="3">특급</option><option value="4">신화</option></select></div>
   <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2"><div className="min-w-0"><p className="text-[10px] text-muted-foreground">현재 칭호</p><p className={`mt-1 flex min-w-0 items-center gap-1.5 text-xs ${equipped?titleTiers[equipped.tier].text:'text-muted-foreground'}`} title={data?.titles.find(t=>t.id===data.equipped)?.name??'장착한 칭호 없음'}><span className="truncate">{data?equipped?.name??'장착한 칭호 없음':'불러오는 중…'}</span>{equipped&&<TitleTierDot tier={equipped.tier}/>}</p></div><label className="flex min-h-10 shrink-0 items-center gap-2 text-[11px] text-muted-foreground"><input type="checkbox" checked={owned} onChange={e=>setOwned(e.target.checked)} className="size-4 accent-primary"/>획득한 칭호만</label></div>
   <TitleTierLegend/>
   <p aria-live="polite" className="shrink-0 px-4 py-2 text-[10px] tabular-nums text-muted-foreground">{data?`검색 결과 ${entries.length}개`:'칭호를 불러오는 중…'}</p>
   {error&&<div role="alert" className="flex items-center justify-between border-b px-4 py-2 text-xs text-destructive"><p>{error}</p><Button variant="ghost" size="icon" aria-label="칭호 다시 확인" disabled={busy||loading} onClick={()=>{setError('');void query.refetch()}}><RefreshCw className="size-4"/></Button></div>}
   <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-busy={loading}>
    {loading&&!data?<div role="status" aria-label="칭호를 불러오는 중" className="space-y-4 p-4">{[0,1,2,3].map(i=><div key={i} className="h-20 rounded-lg bg-secondary motion-safe:animate-pulse"/>)}</div>:entries.map(t=><article key={t.id} className={`flex gap-3 border-b px-4 py-4 ${data?.equipped===t.id?'bg-secondary/40':''}`}><appArt.title className={`mt-1 size-10 ${t.earnedAt?'':'grayscale opacity-40'}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={`flex min-w-0 items-center gap-1.5 text-sm ${titleTiers[t.tier]?.text??titleTiers[1].text}`}><span className="min-w-0 break-words">{t.name}</span><TitleTierDot tier={t.tier}/></h3></div><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{t.earnedAt?t.description:'획득하면 조건이 공개돼요.'}</p></div><Button variant={data?.equipped===t.id?'secondary':'outline'} size="sm" className="min-h-10 shrink-0 self-center px-2 text-[11px]" disabled={!t.earnedAt||busy} onClick={()=>void equip(t.id)} aria-label={`${t.name} ${data?.equipped===t.id?'장착 중':'장착'}`}>{data?.equipped===t.id?<><Check className="size-3"/>장착 중</>:t.earnedAt?'장착':'미획득'}</Button></article>)}
    {!loading&&data&&!entries.length&&<div className="py-10 text-center text-xs text-muted-foreground"><appArt.empty className="mx-auto mb-2 size-14"/>조건에 맞는 칭호가 없어요.</div>}
   </div>
   <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-background px-4 py-2"><p className="text-[10px] text-muted-foreground">한 번 획득한 칭호는 계속 보유해요.</p><Button variant="ghost" size="sm" className="min-h-11 text-xs" disabled={!data?.equipped||busy} onClick={()=>void equip(null)}>칭호 해제</Button></div>
 </>
 if(page)return <section className="flex min-h-0 min-w-0 flex-1 flex-col">{content}</section>
 return <Dialog open={open} onOpenChange={changeOpen}>
  <DialogTrigger className="mx-auto mt-1 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg px-3 text-xs text-primary outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring" aria-label="칭호 변경"><appArt.title className="size-6"/><span><EquippedTitleText name={profile?.equipped_title||'칭호 선택하기'}/></span><ChevronRight className="size-3.5"/></DialogTrigger>
  <DialogContent className="notification-sheet inset-x-0 bottom-0 top-auto left-0 flex h-[84dvh] max-h-[46rem] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
   {content}
  </DialogContent>
 </Dialog>
}
