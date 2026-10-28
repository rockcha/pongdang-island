import {useEffect,useState} from 'react'
import {PlayerIdentityLink} from '@/features/profile/player-identity-link'
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {VisitableAvatar as PlayerAvatar} from '@/features/profile/visitable-avatar'
import {loadShowcaseReactionPeople,showcaseReactions,type ShowcasePost,type ShowcaseReaction,type ShowcaseReactionPeople} from './api'

export function ShowcaseReactionPeopleDialog({post,initialReaction,onClose}:{post:ShowcasePost;initialReaction:ShowcaseReaction;onClose:()=>void}){
 const [filter,setFilter]=useState<ShowcaseReaction|null>(initialReaction),[page,setPage]=useState(0),[retry,setRetry]=useState(0)
 const [data,setData]=useState<ShowcaseReactionPeople|null>(null),[error,setError]=useState('')
 useEffect(()=>{
  let alive=true;setData(null);setError('')
  const request=post.id==='preview'?Promise.resolve({counts:post.reactions,total:post.my_reaction&&(!filter||filter===post.my_reaction)?1:0,items:post.my_reaction&&(!filter||filter===post.my_reaction)?[{user_id:post.author_id,nickname:post.author_name,avatar_path:post.avatar_path,reaction:post.my_reaction}]:[]}):loadShowcaseReactionPeople(post.id,filter,page*50)
  request.then(value=>{if(alive)setData(value)}).catch(cause=>{if(alive)setError(String(cause?.message??'').includes('SHOWCASE_NOT_FOUND')?'삭제되었거나 찾을 수 없는 자랑이에요.':'반응한 사람을 불러오지 못했어요. 다시 시도해주세요.')})
  return()=>{alive=false}
 },[post,filter,page,retry])
 const counts=data?.counts??post.reactions,total=Object.values(counts).reduce((n,v)=>n+(v??0),0)
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="bottom-0 top-auto max-h-[80dvh] max-w-lg translate-y-0 gap-0 rounded-b-none p-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-xl">
  <div className="px-5 pb-4 pt-5"><DialogTitle>반응한 사람</DialogTitle><DialogDescription className="mt-2 text-xs">닉네임을 누르면 수족관에 방문할 수 있어요.</DialogDescription></div>
  <div role="group" aria-label="반응 종류" className="flex shrink-0 gap-1 overflow-x-auto border-b px-4 pb-3">{[{id:null,emoji:'',label:'전체'},...showcaseReactions].map(r=><button key={r.id??'all'} type="button" aria-pressed={filter===r.id} aria-label={r.label+' 반응 보기'} onClick={()=>{setFilter(r.id);setPage(0)}} className={`min-h-11 shrink-0 rounded-lg px-2.5 text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring ${filter===r.id?'bg-primary/10 text-primary':'text-muted-foreground hover:bg-secondary'}`}>{r.emoji||r.label} <span>{r.id?counts[r.id]??0:total}</span></button>)}</div>
  <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-2" style={{maxHeight:'45dvh'}}>
   {error?<div role="alert" className="space-y-2 py-6 text-center text-xs"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(n=>n+1)}>다시 불러오기</Button></div>:!data?<p role="status" className="py-8 text-center text-xs text-muted-foreground">반응한 사람을 불러오는 중…</p>:!data.items.length?<p className="py-8 text-center text-xs text-muted-foreground">아직 이 반응을 남긴 사람이 없어요.</p>:<ul className="divide-y divide-border/50">{data.items.map(person=>{
    const reaction=showcaseReactions.find(r=>r.id===person.reaction)!
    return <li key={person.user_id}><PlayerIdentityLink label={person.nickname+' 아쿠아리움 방문'} to={`/friends/${person.user_id}/aquarium`} onClick={onClose} className="flex min-h-16 items-center gap-3 rounded-lg px-2 py-3 outline-none hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring"><PlayerAvatar userId={person.user_id} nickname={person.nickname} path={person.avatar_path} className="size-9 shrink-0"/><span className="min-w-0 flex-1 truncate text-sm">{person.nickname}</span><span role="img" aria-label={reaction.label} className="text-xl">{reaction.emoji}</span></PlayerIdentityLink></li>
   })}</ul>}
  </div>
  {data&&data.total>50&&<div className="flex items-center justify-between border-t px-4 py-2"><Button variant="ghost" disabled={!page} onClick={()=>setPage(n=>n-1)}>이전</Button><span className="text-xs tabular-nums">{page+1} / {Math.ceil(data.total/50)}</span><Button variant="ghost" disabled={(page+1)*50>=data.total} onClick={()=>setPage(n=>n+1)}>다음</Button></div>}
 </DialogContent></Dialog>
}
