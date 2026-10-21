import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {Link} from 'react-router'
import {useAuth} from '@/components/auth-provider'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {createClient} from '@/lib/client'
import {BoardTime} from './board-time'
import type {FeedbackKind} from './feedback-reactions'

export type FeedbackAuthorAvatar={id:string;avatar_path:string|null}
type Post={id:string;author_name:string;created_at:string;title:string;body:string}
const AuthorAvatars=createContext<Record<string,string|null>>({})

export function FeedbackAuthors({kind,ids,children}:{kind:FeedbackKind;ids:string[];children:ReactNode}){
 const {session}=useAuth()
 return <Authors key={`${session?.user.id}:${kind}:${ids.join(',')}`} kind={kind} ids={ids}>{children}</Authors>
}
function Authors({kind,ids,children}:{kind:FeedbackKind;ids:string[];children:ReactNode}){
 const [avatars,setAvatars]=useState<Record<string,string|null>>({})
 const idKey=ids.join(',')
 useEffect(()=>{
  let active=true
  if(idKey)void Promise.resolve().then(()=>createClient().rpc('feedback_authors',{p_kind:kind,p_ids:idKey.split(',')})).then(({data,error})=>{
   if(active&&!error)setAvatars(Object.fromEntries((data??[]).map(author=>[author.id,author.avatar_path])))
  }).catch(()=>{/* Keep the standard Pongi avatar if author images are unavailable. */})
  return()=>{active=false}
 },[kind,idKey])
 return <AuthorAvatars value={avatars}>{children}</AuthorAvatars>
}
export function FeedbackPostAuthor({post}:{post:Pick<Post,'id'|'author_name'|'created_at'>}){
 const avatars=useContext(AuthorAvatars)
 return <div className="flex min-w-0 items-center gap-2.5">
  <PlayerAvatar nickname={post.author_name} path={avatars[post.id]} className="size-9 shrink-0 bg-secondary ring-1 ring-border"/>
  <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
   <span className="min-w-0 truncate font-medium text-foreground/80">{post.author_name}</span>
   <span aria-hidden="true" className="opacity-50">·</span>
   <BoardTime value={post.created_at} className="shrink-0"/>
  </div>
 </div>
}
export function FeedbackPostRow({post,to,status,visibility}:{post:Post;to:string;status?:ReactNode;visibility?:ReactNode}){
 const avatars=useContext(AuthorAvatars)
 return <li className="py-5">
  <Link to={to} className="group flex gap-3 rounded-lg outline-none transition-colors hover:bg-secondary/20 focus-visible:ring-2 focus-visible:ring-ring">
   <PlayerAvatar nickname={post.author_name} path={avatars[post.id]} className="size-8 shrink-0 bg-secondary ring-1 ring-border"/>
   <div className="min-w-0 flex-1">
    <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
     <span className="min-w-0 truncate font-medium text-foreground/80">{post.author_name}</span>
     <span aria-hidden="true" className="opacity-50">·</span>
     <BoardTime value={post.created_at} className="shrink-0"/>
    </div>
    <h2 className="line-clamp-2 break-words text-sm font-semibold leading-6 [overflow-wrap:anywhere] group-hover:text-primary">{post.title}</h2>
    <p className="mt-1 line-clamp-1 break-words text-xs leading-5 text-muted-foreground">{post.body}</p>
    {(status||visibility)&&<div className="mt-2 flex flex-wrap items-center gap-2 empty:hidden">{status}{visibility}</div>}
   </div>
  </Link>
 </li>
}
