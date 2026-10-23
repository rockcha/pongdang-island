import {FeedbackComments} from '@/features/board/feedback-comments'
import {FeedbackAuthors,FeedbackPostRow,FeedbackPostAuthor} from '@/features/board/feedback-post-row'
import {FeedbackReactions,FeedbackVoteButtons} from '@/features/board/feedback-reactions'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CheckCheck, Gift, Globe, Lightbulb, Pencil, Trash2, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { isNoticeOperator } from '@/features/notices/api'
import { useGold } from '@/features/gold/gold-provider'
import { useSocial } from '@/features/social/social-provider'
import { randomId } from '@/lib/random-id'
import { adoptSuggestion, deleteSuggestion, loadSuggestion, loadSuggestions, saveSuggestion, suggestionError } from './api'
import type { Suggestion } from './api'

function Visibility({friendsOnly}:{friendsOnly:boolean}){const Icon=friendsOnly?UsersRound:Globe;return <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Icon aria-hidden="true" className="size-3"/>{friendsOnly?'친구만':'전체 공개'}</span>}
function Adoption({post}:{post:Suggestion}){return post.adopted_at?<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"><CheckCheck className="size-3"/>채택</span>:null}
function RewardInfo(){return <p className="flex items-start gap-2 rounded-xl bg-secondary/60 px-3 py-3 text-xs leading-5 text-muted-foreground"><Gift aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary"/><span>아이디어가 채택되면 <strong className="font-medium text-primary">달빛 진주새우 2개</strong>를 드려요.</span></p>}
function Skeleton(){return <div role="status" aria-label="건의함 불러오는 중" className="space-y-3 py-4">{[0,1,2,3].map(i=><div key={i} aria-hidden="true" className="space-y-3 rounded-xl border p-4 motion-safe:animate-pulse"><div className="h-4 w-2/3 rounded bg-muted"/><div className="h-3 w-full rounded bg-muted"/><div className="h-3 w-1/3 rounded bg-muted"/></div>)}</div>}

export function SuggestionsPage(){
 const {session}=useAuth(),userId=session?.user.id??''
 const [friendsOnly,setFriendsOnly]=useState(false)
 const [mine,setMine]=useState(false),[page,setPage]=useState(0),[retry,setRetry]=useState(0)
 const [feed,setFeed]=useState<{items:Suggestion[];total:number}|null>(null),[error,setError]=useState(''),[editor,setEditor]=useState(false)
 useEffect(()=>{let active=true;setFeed(null);setError('');void loadSuggestions(page,mine?userId:null,friendsOnly?userId:null).then(data=>{if(active)setFeed(data)}).catch(e=>{if(active)setError(suggestionError(e))});return()=>{active=false}},[page,mine,friendsOnly,userId,retry])
 return <section className="flex min-h-0 w-full flex-1 flex-col">
  <header className="flex shrink-0 items-center justify-between border-b px-3">
   <div role="group" aria-label="건의 분류" className="flex gap-1">
    {([{id:'all',label:'전체'},{id:'friends',label:'친구 글'},{id:'mine',label:'내 글'}] as const).map(tab=>{
     const selected=tab.id==='mine'?mine:tab.id==='friends'?friendsOnly:!mine&&!friendsOnly
     return <Button key={tab.id} variant="ghost" aria-pressed={selected} className={`min-h-12 rounded-none px-3 text-xs ${selected?'border-b-2 border-b-primary text-primary':'text-muted-foreground'}`} onClick={()=>{setMine(tab.id==='mine');setFriendsOnly(tab.id==='friends');setPage(0)}}>{tab.label}</Button>
    })}
   </div>
   <Button variant="ghost" className="min-h-11 shrink-0 gap-1.5 px-2 text-xs" onClick={()=>setEditor(true)}><Pencil className="size-3.5"/>글쓰기</Button>
  </header>
  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
   {error?<div role="alert" className="space-y-3 py-10 text-center text-sm"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</Button></div>:!feed?<Skeleton/>:feed.items.length?<FeedbackAuthors kind="suggestion" ids={feed.items.map(post=>post.id)}><ul className="divide-y divide-border/70">{feed.items.map(post=><FeedbackPostRow key={post.id} post={post} to={`/square/suggestions/${post.id}`} status={<Adoption post={post}/>} visibility={post.friends_only?<Visibility friendsOnly/>:undefined}/>)}</ul></FeedbackAuthors>:<div className="flex flex-col items-center gap-3 py-12 text-muted-foreground"><Lightbulb className="size-8 opacity-40"/><p className="text-sm">{friendsOnly?'친구가 작성한 건의가 없어요.':mine?'아직 작성한 건의가 없어요.':'첫 번째 아이디어를 남겨주세요.'}</p></div>}
   {feed&&feed.total>20&&<div className="flex items-center justify-between gap-3 py-4"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>이전</Button><span className="text-xs tabular-nums">{page+1} / {Math.ceil(feed.total/20)}</span><Button variant="outline" disabled={(page+1)*20>=feed.total} onClick={()=>setPage(p=>p+1)}>다음</Button></div>}
  </div>
  {editor&&<SuggestionEditor onClose={()=>setEditor(false)} onSaved={()=>{setEditor(false);setPage(0);setRetry(v=>v+1)}}/>}
 </section>
}

export function SuggestionDetail(){
 const {suggestionId}=useParams()
 return <Detail key={suggestionId} id={suggestionId??''}/>
}
function Detail({id}:{id:string}){
 const {session}=useAuth(),navigate=useNavigate(),gold=useGold(),social=useSocial()
 const [post,setPost]=useState<Suggestion|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[operator,setOperator]=useState(false),[retry,setRetry]=useState(0)
 const [editor,setEditor]=useState(false),[confirm,setConfirm]=useState<'delete'|'adopt'|null>(null),[busy,setBusy]=useState(false),[actionError,setActionError]=useState('')
 const lock=useRef(false)
 useEffect(()=>{let active=true;setLoading(true);setError('');void Promise.all([loadSuggestion(id),isNoticeOperator()]).then(([data,admin])=>{if(active){setPost(data);setOperator(admin)}}).catch(e=>{if(active)setError(suggestionError(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[id,retry])
 async function act(){if(lock.current||!post||!confirm)return;lock.current=true;setBusy(true);setActionError('');try{if(confirm==='delete'){await deleteSuggestion(post.id);toast.success('건의를 삭제했어요.');navigate('/square/suggestions',{replace:true})}else{setPost(await adoptSuggestion(post.id));toast.success('채택 알림과 달빛 진주새우 2개를 지급했어요.');void gold.refresh();void social.refresh()}setConfirm(null)}catch(e){setActionError(suggestionError(e))}finally{lock.current=false;setBusy(false)}}
 return <article className="flex min-h-0 w-full flex-1 flex-col"><div className="flex shrink-0 items-center justify-end px-2 [&:not(:has(button))]:hidden">{post&&post.author_id===session?.user.id&&!post.adopted_at&&<div className="flex"><Button variant="ghost" className="min-h-11 gap-1.5 px-3" aria-label="건의 수정" disabled={busy} onClick={()=>setEditor(true)}><Pencil className="size-4"/>수정</Button><Button variant="ghost" className="min-h-11 gap-1.5 px-3 text-muted-foreground" aria-label="건의 삭제" disabled={busy} onClick={()=>{setActionError('');setConfirm('delete')}}><Trash2 className="size-4"/>삭제</Button></div>}</div><div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5">{loading?<Skeleton/>:error?<div role="alert" className="space-y-3 text-sm"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</Button></div>:!post?<p className="py-10 text-center text-sm text-muted-foreground">글이 삭제되었거나 볼 수 없는 건의예요.</p>:<><header className="space-y-3 border-b pb-5"><div className="flex items-start gap-2"><h1 className="min-w-0 flex-1 break-words text-xl leading-8 [overflow-wrap:anywhere]">{post.title}</h1><Adoption post={post}/></div><FeedbackAuthors kind="suggestion" ids={[post.id]}><FeedbackPostAuthor post={post}/></FeedbackAuthors>{post.friends_only&&<Visibility friendsOnly/>}</header><p className="whitespace-pre-wrap break-words text-sm leading-7 [overflow-wrap:anywhere]">{post.body}</p><FeedbackReactions kind="suggestion" ids={[post.id]}><FeedbackVoteButtons id={post.id}/></FeedbackReactions>{post.friends_only&&<p className="rounded-xl bg-secondary/40 p-3 text-xs leading-5 text-muted-foreground">작성자와 현재 친구, 운영팀만 볼 수 있어요.</p>}{post.adopted_at?<div className="rounded-xl bg-primary/5 p-4 text-sm leading-6"><p className="flex items-center gap-2 font-medium text-primary"><CheckCheck className="size-4"/>운영팀이 채택한 아이디어예요.</p><p className="mt-1 text-xs text-muted-foreground">작성자에게 보상 미끼 2개와 채택 알림을 보냈어요.</p></div>:<RewardInfo/>}{operator&&!post.adopted_at&&<Button className="min-h-12 w-full rounded-xl" disabled={busy} onClick={()=>{setActionError('');setConfirm('adopt')}}><CheckCheck className="size-4"/>아이디어 채택하기</Button>}<FeedbackComments kind="suggestion" id={post.id} operator={operator}/></>}</div>
 {editor&&post&&<SuggestionEditor post={post} onClose={()=>setEditor(false)} onSaved={saved=>{setPost(saved);setEditor(false)}}/>}
 <ConfirmDialog illustration={confirm==='adopt'?'publish':'caution'} open={confirm!==null} onOpenChange={value=>{if(!value&&!busy)setConfirm(null)}} title={confirm==='adopt'?'이 아이디어를 채택할까요?':'건의를 삭제할까요?'} description={confirm==='adopt'?'작성자에게 운영팀의 채택 알림과 달빛 진주새우 2개를 즉시 지급해요. 채택은 되돌릴 수 없어요.':'삭제한 건의는 복구할 수 없어요.'} busy={busy} error={actionError} onConfirm={()=>void act()}/>
 </article>
}

function SuggestionEditor({post,onClose,onSaved}:{post?:Suggestion;onClose:()=>void;onSaved:(post:Suggestion)=>void}){
 const [id]=useState(()=>post?.id??randomId()),[title,setTitle]=useState(post?.title??''),[body,setBody]=useState(post?.body??''),[friendsOnly]=useState(post?.friends_only??false)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[discard,setDiscard]=useState(false),lock=useRef(false)
 const dirty=title!==(post?.title??'')||body!==(post?.body??'')
 function close(){if(busy)return;if(dirty)setDiscard(true);else onClose()}
 async function submit(event:React.FormEvent){event.preventDefault();if(lock.current||!title.trim()||!body.trim())return;lock.current=true;setBusy(true);setError('');try{const saved=await saveSuggestion({id,title,body,friends_only:friendsOnly},!!post);toast.success(post?'건의를 수정했어요.':'아이디어를 남겼어요.');onSaved(saved)}catch(e){setError(suggestionError(e))}finally{lock.current=false;setBusy(false)}}
 return <><Dialog open onOpenChange={open=>{if(!open)close()}}><DialogContent className="bottom-0 top-auto left-0 flex max-h-[min(92dvh,52rem)] max-w-full translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-2xl rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"><DialogHeader className="shrink-0 pr-7"><DialogTitle className="flex items-center gap-2"><img src="/branding/pongi-starfish.png" alt="" className="size-7 shrink-0 object-contain"/>{post?'건의 수정':'아이디어 남기기'}</DialogTitle><DialogDescription>작은 아이디어도 좋아요. 함께 섬을 바꿔봐요.</DialogDescription></DialogHeader><form onSubmit={event=>void submit(event)} className="flex min-h-0 flex-col gap-4"><div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-0.5"><div className="space-y-2"><label htmlFor="suggestion-title" className="text-xs font-medium">제목</label><Input id="suggestion-title" maxLength={80} required disabled={busy} value={title} onChange={e=>setTitle(e.target.value)} placeholder="어떤 아이디어인가요?" className="min-h-12 text-base"/></div><div className="space-y-2"><label htmlFor="suggestion-body" className="text-xs font-medium">내용</label><textarea id="suggestion-body" maxLength={3000} required disabled={busy} value={body} onChange={e=>setBody(e.target.value)} placeholder="바라는 점과 이유를 자유롭게 적어주세요." className="min-h-40 w-full resize-y rounded-xl border bg-transparent px-3 py-3 text-base leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring"/><p className="text-right text-[11px] tabular-nums text-muted-foreground">{body.length.toLocaleString()} / 3,000</p></div><RewardInfo/>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</div><Button type="submit" disabled={busy||!title.trim()||!body.trim()} className="min-h-12 w-full shrink-0 rounded-xl">{busy?'저장하는 중…':post?'수정하기':'건의 올리기'}</Button></form></DialogContent></Dialog><ConfirmDialog illustration="caution" open={discard} onOpenChange={setDiscard} title="작성을 그만둘까요?" description="저장하지 않은 내용은 사라져요." onConfirm={onClose}/></>
}
