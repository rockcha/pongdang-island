import {Trash2} from 'lucide-react'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {BoardTime} from '@/features/board/board-time'
import {CatchMoment} from './catch-moment'
import {showcaseReactions,type ShowcasePost,type ShowcaseReaction} from './api'

export function ShowcaseCard({post,busy=false,onReact,onDelete}:{post:ShowcasePost;busy?:boolean;onReact:(reaction:ShowcaseReaction|null)=>void;onDelete?:()=>void}){
 return <article className="overflow-hidden border-b border-border/70 bg-background py-4">
  <div className="mb-3 flex items-center gap-2 px-4"><PlayerAvatar nickname={post.author_name} path={post.avatar_path} className="size-8 shrink-0"/><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{post.author_name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{post.region_name}</p></div><BoardTime value={post.created_at} className="text-[10px] text-muted-foreground"/>{onDelete&&<button type="button" aria-label="자랑 삭제" disabled={busy} onClick={onDelete} className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="size-3.5"/></button>}</div>
  <CatchMoment species={post.species} firstDiscovery={post.first_discovery} renderVersion={post.render_version} regionName={post.region_name} caughtAt={post.caught_at} preview={post.id==='preview'} lazy/>
  {post.caption&&<p className="whitespace-pre-wrap break-words px-4 pt-3 text-sm leading-6 [overflow-wrap:anywhere]">{post.caption}</p>}
  <div role="group" aria-label="이모지 반응" className="flex gap-1.5 px-4 pt-3">{showcaseReactions.map(reaction=><button key={reaction.id} type="button" aria-label={reaction.label} aria-pressed={post.my_reaction===reaction.id} disabled={busy} onClick={()=>onReact(post.my_reaction===reaction.id?null:reaction.id)} className={`flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border px-1 text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${post.my_reaction===reaction.id?'border-primary/35 bg-primary/10 text-primary':'border-border/60 bg-background text-muted-foreground hover:bg-secondary/40'}`}><span aria-hidden="true" className="text-base">{reaction.emoji}</span>{post.reactions[reaction.id]??0}</button>)}</div>
 </article>
}
