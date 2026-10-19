import {useEffect,useRef,useState} from 'react'
import {useSearchParams} from 'react-router'
import {Check,ChevronRight,RefreshCw} from 'lucide-react'
import {appArt} from '@/components/app-art'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog'
import {useSocial} from '@/features/social/social-provider'
import {equipTitle,loadTitles,type TitleState} from './api'

const categories=[['all','전체'],['growth','성장'],['moment','특별한 순간'],['collection','수집·꾸미기'],['social','친구']] as const
export function TitlePicker({page=false}:{page?:boolean}){
 const {profile,refresh}=useSocial();const [params,setParams]=useSearchParams()
 const [open,setOpen]=useState(page),[data,setData]=useState<TitleState|null>(null),[category,setCategory]=useState('all'),[owned,setOwned]=useState(false),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 const locked=useRef(false),version=useRef(0),alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;version.current++}},[])
 useEffect(()=>{if(params.get('titles')==='1')setOpen(true)},[params])
 useEffect(()=>{if(!open)return;const v=++version.current;setLoading(true);setError('');loadTitles().then(s=>{if(alive.current&&v===version.current)setData(s)}).catch(()=>{if(alive.current&&v===version.current)setError('칭호를 불러오지 못했어요. 다시 확인해주세요.')}).finally(()=>{if(alive.current&&v===version.current)setLoading(false)})},[open,retry])
 function changeOpen(value:boolean){setOpen(value);if(!value){version.current++;if(params.has('titles')){const next=new URLSearchParams(params);next.delete('titles');setParams(next,{replace:true})}}}
 async function equip(id:string|null){if(locked.current)return;locked.current=true;setBusy(true);setError('');try{const s=await equipTitle(id);if(alive.current)setData(s);await refresh()}catch{if(alive.current)setError('칭호를 변경하지 못했어요. 획득 여부와 연결을 확인해주세요.')}finally{locked.current=false;if(alive.current)setBusy(false)}}
 const entries=data?.titles.filter(t=>(category==='all'||t.category===category)&&(!owned||t.earnedAt))??[]
 const ContentHeader=page?'header':DialogHeader,ContentTitle=page?'h1':DialogTitle,ContentDescription=page?'p':DialogDescription
 const content=<>
   {!page&&<div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"/>}
   <ContentHeader className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">{page?<p className="text-xs text-muted-foreground">나의 바다 이야기를 모아보세요.</p>:<div><ContentTitle className="flex items-center gap-2 text-lg font-normal"><appArt.title className="size-7"/>칭호</ContentTitle><ContentDescription className="sr-only">칭호를 확인하고 장착해요.</ContentDescription></div>}<p className="shrink-0 text-xs tabular-nums text-muted-foreground">획득 <span className="text-primary">{data?.titles.filter(t=>t.earnedAt).length??'…'}</span> / {data?.titles.length??'…'}</p></ContentHeader>
   <div role="group" aria-label="칭호 분류" className="segmented-control grid shrink-0 grid-cols-5 border-b">{categories.map(([key,label])=><button key={key} aria-pressed={category===key} onClick={()=>setCategory(key)} className={`min-h-11 px-1 text-[11px] ${category===key?'bg-secondary text-primary':'text-muted-foreground'}`}>{label}</button>)}</div>
   <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2"><div className="min-w-0"><p className="text-[10px] text-muted-foreground">현재 칭호</p><p className="mt-1 truncate text-xs text-primary" title={data?.titles.find(t=>t.id===data.equipped)?.name??'장착한 칭호 없음'}>{data?data.titles.find(t=>t.id===data.equipped)?.name??'장착한 칭호 없음':'불러오는 중…'}</p></div><label className="flex min-h-10 shrink-0 items-center gap-2 text-[11px] text-muted-foreground"><input type="checkbox" checked={owned} onChange={e=>setOwned(e.target.checked)} className="size-4 accent-primary"/>획득한 칭호만</label></div>
   {error&&<div role="alert" className="flex items-center justify-between border-b px-4 py-2 text-xs text-destructive"><p>{error}</p><Button variant="ghost" size="icon" aria-label="칭호 다시 확인" disabled={busy||loading} onClick={()=>setRetry(v=>v+1)}><RefreshCw className="size-4"/></Button></div>}
   <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-busy={loading}>
    {loading&&!data?<div role="status" aria-label="칭호를 불러오는 중" className="space-y-4 p-4">{[0,1,2,3].map(i=><div key={i} className="h-20 rounded-lg bg-secondary motion-safe:animate-pulse"/>)}</div>:entries.map(t=><article key={t.id} className={`flex gap-3 border-b px-4 py-4 ${data?.equipped===t.id?'bg-secondary/40':''}`}><appArt.title className={`mt-1 size-10 ${t.earnedAt?'':'grayscale opacity-40'}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm">{t.name}</h3></div><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{t.description}</p>{!t.earnedAt&&<><div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary/60" style={{width:`${Math.min(100,t.progress/t.target*100)}%`}}/></div><p className="mt-1 text-[10px] tabular-nums text-muted-foreground">{t.progress} / {t.target}{t.extra_target?` · 추가 조건 ${t.extraProgress??0} / ${t.extra_target}`:''}</p></>}</div><Button variant={data?.equipped===t.id?'secondary':'outline'} size="sm" className="min-h-10 shrink-0 self-center px-2 text-[11px]" disabled={!t.earnedAt||busy} onClick={()=>void equip(t.id)} aria-label={`${t.name} ${data?.equipped===t.id?'장착 중':'장착'}`}>{data?.equipped===t.id?<><Check className="size-3"/>장착 중</>:t.earnedAt?'장착':'미획득'}</Button></article>)}
    {!loading&&data&&!entries.length&&<div className="py-10 text-center text-xs text-muted-foreground"><appArt.empty className="mx-auto mb-2 size-14"/>조건에 맞는 칭호가 없어요.</div>}
   </div>
   <div className="flex shrink-0 items-center justify-between gap-2 border-t bg-background px-4 py-2"><p className="text-[10px] text-muted-foreground">한 번 획득한 칭호는 계속 보유해요.</p><Button variant="ghost" size="sm" className="min-h-11 text-xs" disabled={!data?.equipped||busy} onClick={()=>void equip(null)}>칭호 해제</Button></div>
 </>
 if(page)return <section className="flex min-h-0 flex-1 flex-col">{content}</section>
 return <Dialog open={open} onOpenChange={changeOpen}>
  <DialogTrigger className="mx-auto mt-1 inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-lg px-3 text-xs text-primary outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring" aria-label="칭호 변경"><appArt.title className="size-6"/><span>{profile?.equipped_title||'칭호 선택하기'}</span><ChevronRight className="size-3.5"/></DialogTrigger>
  <DialogContent className="notification-sheet inset-x-0 bottom-0 top-auto left-0 flex h-[84dvh] max-h-[46rem] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
   {content}
  </DialogContent>
 </Dialog>
}
