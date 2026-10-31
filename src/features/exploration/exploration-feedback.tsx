import {useEffect,useRef,useState} from 'react'
import {MessageCircle,Pencil,RefreshCw,Send,Trash2,X} from 'lucide-react'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {BoardTime} from '@/features/board/board-time'
import {useAccountResource} from '@/lib/account-query'
import {randomId} from '@/lib/random-id'
import {explorationFeedbackError,readExplorationFeedback,writeExplorationFeedback,type ExplorationComment,type FeedbackWrite} from './feedback-api'
import './exploration-feedback.css'

export function ExplorationFeedback({owner}:{owner?:string}){
 const [page,setPage]=useState(0),[body,setBody]=useState(''),[editing,setEditing]=useState<ExplorationComment|null>(null),[removing,setRemoving]=useState<string|null>(null)
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false)
 const alive=useRef(true),lock=useRef(false),pending=useRef<FeedbackWrite|null>(null)
 const query=useAccountResource(['exploration-feedback',page*20],signal=>readExplorationFeedback(signal,page*20),{enabled:!!owner})
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 useEffect(()=>{if(page>0&&query.data&&!query.data.items.length)setPage(value=>value-1)},[page,query.data])
 async function send(write:FeedbackWrite){
  if(lock.current||!owner)return
  lock.current=true;setBusy(true);setError('')
  pending.current??=write
  try{
   await writeExplorationFeedback(pending.current)
   if(!alive.current)return
   pending.current=null;setUncertain(false);setRemoving(null)
   if(write.action!=='delete'||editing?.id===write.id){setEditing(null);setBody('')}
   if(write.action==='add')setPage(0)
  }catch(cause){if(alive.current){setError(explorationFeedbackError(cause));const message=String((cause as {message?:string})?.message??'');const rejected=/FEEDBACK_RATE_LIMIT|INVALID_FEEDBACK|FEEDBACK_PROFILE_REQUIRED|FEEDBACK_FORBIDDEN|FEEDBACK_NOT_FOUND/.test(message);if(rejected)pending.current=null;setUncertain(!rejected)}}
  finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 function save(event:React.FormEvent){event.preventDefault();if(!body.trim()||body.trim().length>500)return;void send(pending.current??{action:editing?'edit':'add',id:editing?.id??randomId(),body:body.trim()})}
 const locked=busy||uncertain
 return <section className="exploration-feedback" aria-label="탐험 피드백">
  <header><div><h2><MessageCircle size={17}/>탐험 피드백</h2><p>어려웠던 전투나 좋았던 순간을 들려주세요.</p></div><button className="feedback-icon" type="button" aria-label="피드백 새로고침" disabled={!owner||busy||query.isFetching} onClick={()=>void query.refetch()}><RefreshCw size={15}/></button></header>
  {owner?<form onSubmit={save}>
   {editing&&<div className="feedback-editing">내 댓글 수정 중<button type="button" aria-label="수정 취소" disabled={locked} onClick={()=>{setEditing(null);setBody('');setError('')}}><X size={14}/></button></div>}
   <textarea aria-label="탐험 피드백 내용" placeholder="탐험해 보니 어땠나요?" value={body} maxLength={500} rows={3} disabled={locked} onChange={event=>setBody(event.target.value)}/>
   <div className="feedback-compose-footer"><span>{body.length}/500 · 모든 유저에게 공개돼요</span><button type="submit" disabled={busy||!body.trim()}><Send size={13}/>{busy?'저장 중…':uncertain?'같은 요청 다시 확인':editing?'수정 저장':'댓글 남기기'}</button></div>
  </form>:<p className="feedback-empty">로그인하면 피드백을 남길 수 있어요.</p>}
  {error&&<div className="feedback-error" role="alert"><p>{error}</p>{uncertain&&pending.current?.action==='delete'&&<button type="button" disabled={busy} onClick={()=>void send(pending.current!)}>삭제 결과 다시 확인</button>}</div>}
  {owner&&(query.isError?<div className="feedback-empty" role="alert">피드백을 불러오지 못했어요.<button type="button" onClick={()=>void query.refetch()}>다시 불러오기</button></div>:!query.data?<p className="feedback-empty" role="status">피드백을 불러오는 중…</p>:!query.data.items.length?<p className="feedback-empty">첫 탐험 피드백을 남겨주세요.</p>:<ul>{query.data.items.map(comment=><li key={comment.id}>
   <PlayerAvatar nickname={comment.nickname} path={comment.avatarPath} className="feedback-avatar"/>
   <div className="feedback-comment"><div className="feedback-author"><strong>{comment.nickname}</strong>{comment.authorId===owner&&<span>내 댓글</span>}<BoardTime value={comment.createdAt}/>{comment.updatedAt!==comment.createdAt&&<span>수정됨</span>}</div><p>{comment.body}</p>
    {removing===comment.id&&<div className="feedback-delete-confirm"><span>이 댓글을 삭제할까요?</span><button type="button" disabled={locked} onClick={()=>void send({action:'delete',id:comment.id})}>삭제</button><button type="button" disabled={locked} onClick={()=>setRemoving(null)}>취소</button></div>}
   </div>
   {(comment.canEdit||comment.canDelete)&&<div className="feedback-comment-actions">{comment.canEdit&&<button className="feedback-icon" type="button" aria-label={`${comment.nickname} 댓글 수정`} disabled={locked} onClick={()=>{setEditing(comment);setBody(comment.body);setRemoving(null);setError('')}}><Pencil size={13}/></button>}{comment.canDelete&&<button className="feedback-icon" type="button" aria-label={`${comment.nickname} 댓글 삭제`} disabled={locked} onClick={()=>{setRemoving(comment.id);setError('')}}><Trash2 size={13}/></button>}</div>}
  </li>)}</ul>)}
  {owner&&query.data&&(page>0||query.data.hasMore)&&<nav aria-label="피드백 페이지"><button type="button" disabled={page===0||locked} onClick={()=>setPage(value=>value-1)}>이전</button><span>{page+1}</span><button type="button" disabled={!query.data.hasMore||locked} onClick={()=>setPage(value=>value+1)}>다음</button></nav>}
 </section>
}
