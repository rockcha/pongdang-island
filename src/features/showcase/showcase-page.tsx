import {useEffect,useRef,useState} from 'react'
import {Link,useLocation} from 'react-router'
import {Camera} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth,getNickname} from '@/components/auth-provider'
import {useOperator} from '@/features/notices/use-operator'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {ShowcaseCard} from './showcase-card'
import {getPreviewShowcase} from './draft'
import {loadShowcase,reactToShowcase,deleteShowcase,showcaseError,type ShowcaseFeed,type ShowcasePost,type ShowcaseReaction} from './api'

export function ShowcasePage(){
 const {session}=useAuth(),owner=session?.user.id??'',{operator}=useOperator(),location=useLocation()
 const [mine,setMine]=useState(false),[page,setPage]=useState(0),[retry,setRetry]=useState(0),[feed,setFeed]=useState<ShowcaseFeed|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState<string|null>(null),[deleting,setDeleting]=useState<ShowcasePost|null>(null)
 const lock=useRef(false)
 const previewDraft=location.state?.showcasePreview?getPreviewShowcase(owner):null
 const nickname=getNickname(session)||'미리보기 낚시꾼'
 const [preview,setPreview]=useState<ShowcasePost|null>(null)
 useEffect(()=>{
  if(!previewDraft){setPreview(null);return}
  setPreview({id:'preview',author_id:owner,author_name:nickname,avatar_path:null,operation_id:previewDraft.operationId,caption:previewDraft.caption,species:previewDraft.species,rarity:previewDraft.species.rarity as 'epic'|'mythic',region_name:previewDraft.regionName,caught_at:previewDraft.caughtAt,created_at:previewDraft.caughtAt,first_discovery:previewDraft.firstDiscovery,render_version:previewDraft.renderVersion,reactions:{},my_reaction:null})
 },[previewDraft,owner,nickname])
 useEffect(()=>{
  let alive=true;setFeed(null);setError('')
  if(previewDraft)return
  loadShowcase(mine,page*20).then(value=>{if(alive)setFeed(value)}).catch(cause=>{if(alive)setError(showcaseError(cause))})
  return()=>{alive=false}
 },[mine,page,retry,previewDraft,owner])
 async function react(post:ShowcasePost,reaction:ShowcaseReaction|null){
  if(lock.current)return
  if(post.id==='preview'){setPreview(value=>value?{...value,my_reaction:reaction,reactions:reaction?{[reaction]:1}:{}}:value);return}
  lock.current=true;setBusy(post.id)
  try{const value=await reactToShowcase(post.id,reaction);setFeed(current=>current?{...current,items:current.items.map(p=>p.id===post.id?value:p)}:current)}
  catch(cause){toast.error(showcaseError(cause))}finally{lock.current=false;setBusy(null)}
 }
 async function remove(){
  if(!deleting||lock.current)return
  lock.current=true;setBusy(deleting.id)
  try{await deleteShowcase(deleting.id);setDeleting(null);setRetry(v=>v+1)}catch(cause){toast.error(showcaseError(cause))}finally{lock.current=false;setBusy(null)}
 }
 return <section className="flex min-h-0 flex-1 flex-col">
  <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4"><div className="flex">{[{mine:false,label:'모두의 순간'},{mine:true,label:'내 자랑'}].map(tab=><button key={tab.label} type="button" aria-pressed={mine===tab.mine} onClick={()=>{setMine(tab.mine);setPage(0)}} className={`min-h-12 border-b-2 px-3 text-xs ${mine===tab.mine?'border-primary text-primary':'border-transparent text-muted-foreground'}`}>{tab.label}</button>)}</div>{operator&&<Link to="/showcase/preview" className="inline-flex min-h-11 items-center text-[11px] text-primary">미리보기 테스트</Link>}</div>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
   {preview?<><p className="border-b bg-secondary/30 px-4 py-3 text-xs leading-5 text-primary">테스트 화면이에요. 사진·캡션·이모지 반응은 서버에 저장되지 않아요.</p><ShowcaseCard post={preview} onReact={r=>void react(preview,r)}/><Link to="/showcase" state={null} replace className="block p-4 text-center text-xs text-primary">실제 자랑 목록으로</Link></>:
    error?<div role="alert" className="space-y-3 p-8 text-center text-sm"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</Button></div>:
    !feed?<p role="status" className="p-10 text-center text-xs text-muted-foreground">바다의 특별한 순간을 불러오는 중…</p>:
    feed.items.length?<>{feed.items.map(post=><ShowcaseCard key={post.id} post={post} busy={busy===post.id} onReact={r=>void react(post,r)} onDelete={post.author_id===owner||operator?()=>setDeleting(post):undefined}/>)}{feed.total>20&&<div className="flex items-center justify-between p-4"><Button variant="ghost" disabled={!page} onClick={()=>setPage(v=>v-1)}>이전</Button><span className="text-xs text-muted-foreground">{page+1} / {Math.ceil(feed.total/20)}</span><Button variant="ghost" disabled={(page+1)*20>=feed.total} onClick={()=>setPage(v=>v+1)}>다음</Button></div>}</>:
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-muted-foreground"><Camera className="size-9 text-primary/50"/><p className="text-sm">아직 남겨진 순간이 없어요.</p><p className="text-xs leading-6">특급·신화를 낚으면 포획 화면에서<br/>사진과 함께 자랑할 수 있어요.</p></div>}
  </div>
  <ConfirmDialog open={!!deleting} onOpenChange={value=>{if(!value&&!busy)setDeleting(null)}} title="이 자랑을 삭제할까요?" description="사진과 캡션, 이모지 반응이 함께 삭제돼요." confirmLabel="삭제" busy={!!busy} onConfirm={()=>void remove()}/>
 </section>
}
