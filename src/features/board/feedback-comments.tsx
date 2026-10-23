import {useEffect,useRef,useState} from 'react'
import {MessageCircle,Pencil,Trash2,X} from 'lucide-react'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {randomId} from '@/lib/random-id'
import {BoardTime} from './board-time'
import type {FeedbackKind} from './feedback-reactions'
import {feedbackCommentAction,loadFeedbackComments,type FeedbackComment,type FeedbackCommentPage} from './feedback-comments-api'

export function FeedbackComments({kind,id,operator=false}:{kind:FeedbackKind;id:string;operator?:boolean}){
 const {session}=useAuth()
 return <Comments key={`${session?.user.id}:${kind}:${id}`} kind={kind} id={id} operator={operator} owner={session?.user.id}/>
}
function Comments({kind,id,operator,owner}:{kind:FeedbackKind;id:string;operator:boolean;owner?:string}){
 const [data,setData]=useState<FeedbackCommentPage|null>(null),[page,setPage]=useState(0),[retry,setRetry]=useState(0)
 const [body,setBody]=useState(''),[editing,setEditing]=useState<FeedbackComment|null>(null),[confirm,setConfirm]=useState<FeedbackComment|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[loadError,setLoadError]=useState(false)
 const lock=useRef(false),pending=useRef<{id:string;body:string}|null>(null),alive=useRef(true)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 useEffect(()=>{
  let active=true;setData(null);setLoadError(false)
  void loadFeedbackComments(kind,id,page*20).then(value=>{if(active){if(page>0&&!value.items.length){setPage(p=>p-1);return}setData(value)}}).catch(()=>{if(active)setLoadError(true)})
  return()=>{active=false}
 },[kind,id,page,retry])
 async function save(event:React.FormEvent){
  event.preventDefault();if(lock.current||!body.trim()||body.trim().length>500)return
  lock.current=true;setBusy(true);setError('')
  try{
   if(!editing&&pending.current&&pending.current.body!==body.trim())throw new Error('RETRY_ORIGINAL')
   if(!editing)pending.current??={id:randomId(),body:body.trim()}
   await feedbackCommentAction(kind,id,editing?'edit':'add',editing?.id??pending.current!.id,editing?body.trim():pending.current!.body)
   if(!alive.current)return
   pending.current=null;setBody('');setEditing(null);setRetry(n=>n+1)
  }catch(cause){if(alive.current)setError(cause instanceof Error&&cause.message==='RETRY_ORIGINAL'?'전송 결과를 확인하려면 이전 내용으로 다시 등록해주세요.':'댓글을 저장하지 못했어요. 내용을 유지한 채 다시 시도해주세요.')}
  finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 async function remove(){
  if(lock.current||!confirm)return
  lock.current=true;setBusy(true);setError('')
  try{await feedbackCommentAction(kind,id,'delete',confirm.id);if(alive.current){if(editing?.id===confirm.id){setEditing(null);setBody('')}setConfirm(null);setRetry(n=>n+1)}}
  catch{if(alive.current)setError('댓글을 삭제하지 못했어요. 다시 시도해주세요.')}
  finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 return <section aria-label="댓글" className="border-t border-border/70 pt-5">
  <h2 className="mb-3 flex items-center gap-2 text-sm"><MessageCircle className="size-4"/>댓글 <span className="tabular-nums text-muted-foreground">{data?.total??'–'}</span></h2>
  {loadError?<div role="alert" className="py-4 text-xs text-muted-foreground">댓글을 불러오지 못했어요.<Button variant="ghost" className="min-h-11 text-xs" onClick={()=>setRetry(n=>n+1)}>다시 불러오기</Button></div>:!data?<p role="status" className="py-4 text-xs text-muted-foreground">댓글을 불러오는 중…</p>:!data.items.length?<p className="py-5 text-center text-xs text-muted-foreground">첫 댓글을 남겨주세요.</p>:<ul className="divide-y divide-border/60">{data.items.map(comment=><li key={comment.id} className="flex gap-2.5 py-4">
   <PlayerAvatar userId={comment.author_id} nickname={comment.author_name} path={comment.avatar_path} className="size-8 shrink-0 bg-secondary ring-1 ring-border"/>
   <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]"><span className="inline-flex max-w-full min-w-0 items-center gap-1 align-middle"><span>{comment.author_name}</span></span><BoardTime value={comment.created_at} className="text-muted-foreground"/>{comment.updated_at!==comment.created_at&&<span className="text-muted-foreground">수정됨</span>}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">{comment.body}</p></div>
   {(owner===comment.author_id||operator)&&<div className="flex shrink-0">{owner===comment.author_id&&<Button variant="ghost" size="icon" aria-label="댓글 수정" disabled={busy||!!pending.current} onClick={()=>{setEditing(comment);setBody(comment.body);setError('')}}><Pencil className="size-3.5"/></Button>}<Button variant="ghost" size="icon" aria-label="댓글 삭제" disabled={busy} onClick={()=>{setError('');setConfirm(comment)}}><Trash2 className="size-3.5"/></Button></div>}
  </li>)}</ul>}
  {data&&data.total>20&&<div className="flex items-center justify-between py-3"><Button variant="ghost" disabled={page===0||busy} onClick={()=>setPage(p=>p-1)}>이전</Button><span className="text-xs">{page+1} / {Math.ceil(data.total/20)}</span><Button variant="ghost" disabled={(page+1)*20>=data.total||busy} onClick={()=>setPage(p=>p+1)}>다음</Button></div>}
  {owner&&<form onSubmit={event=>void save(event)} className="mt-3 space-y-2 border-t border-border/60 pt-3">
   {editing&&<div className="flex items-center justify-between text-xs text-primary">댓글 수정 중<Button variant="ghost" size="icon" aria-label="댓글 수정 취소" disabled={busy} onClick={()=>{setEditing(null);setBody('')}}><X className="size-3.5"/></Button></div>}
   <div className="flex items-end gap-2"><textarea aria-label="댓글 내용" placeholder="댓글을 남겨주세요." maxLength={500} rows={2} disabled={busy} value={body} onChange={event=>setBody(event.target.value)} className="min-h-11 max-h-32 min-w-0 flex-1 resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm leading-5 text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"/><Button type="submit" className="min-h-11 shrink-0 text-xs" disabled={busy||!body.trim()}>{busy?'저장 중…':editing?'저장':'등록'}</Button></div>
  </form>}
  {error&&!confirm&&<p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
  <ConfirmDialog open={!!confirm} onOpenChange={open=>{if(!open&&!busy)setConfirm(null)}} title="댓글을 삭제할까요?" description="삭제한 댓글은 복구할 수 없어요." busy={busy} error={error} onConfirm={()=>void remove()}/>
 </section>
}
