import {PlayerIdentityLink} from '@/features/profile/player-identity-link'
import {BoardTime} from '@/features/board/board-time'
import {Heart,MessageCircle,ChevronRight} from 'lucide-react'
import {VisitableAvatar as PlayerAvatar} from '@/features/profile/visitable-avatar'
import type {ExchangeListing} from './api'
import {SaleOffer} from './sale-offer'

export function SaleListingRow({listing,owner}:{listing:ExchangeListing;owner:string}){
 const mine=listing.owner_id===owner
 return <li className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card">
  <PlayerIdentityLink to={'/exchange/'+listing.id} label={(listing.title||listing.offer.name)+' 상세 보기'} className="block space-y-4 p-3 outline-none transition-colors hover:bg-secondary/20 focus-visible:bg-secondary/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
   <div className="flex min-w-0 items-center gap-2">
    <PlayerAvatar userId={listing.owner_id} nickname={listing.owner_name} path={listing.owner_avatar_path} className="size-8 shrink-0"/>
    <div className="min-w-0 max-w-[34%] shrink-0"><p className="truncate text-xs font-medium">{listing.owner_name}{mine&&<span className="ml-1 text-[10px] font-normal text-muted-foreground">내 글</span>}</p><BoardTime value={listing.created_at} className="mt-0.5 block text-[10px] text-muted-foreground"/></div>
    <h2 className="min-w-0 flex-1 truncate border-l border-border/60 pl-3 text-xs leading-5" title={listing.title??undefined}>{listing.title||listing.offer.name+' 판매합니다'}</h2>
   </div>
   <SaleOffer listing={listing} preview/>
   <div className="flex items-center justify-between gap-2 pt-2 text-[10px] text-muted-foreground">
    <span>{listing.status!=='active'?(listing.status==='completed'?'판매 완료':'판매 취소'):''}</span>
    <div className="flex shrink-0 items-center gap-3 tabular-nums"><span aria-label={'좋아요 '+(listing.like_count??0)+'개'} className="inline-flex items-center gap-1"><Heart aria-hidden="true" className="size-3"/>{listing.like_count??0}</span><span aria-label={'댓글 '+(listing.comment_count??0)+'개'} className="inline-flex items-center gap-1"><MessageCircle aria-hidden="true" className="size-3"/>{listing.comment_count??0}</span><ChevronRight aria-hidden className="size-3.5"/></div>
   </div>
  </PlayerIdentityLink>
 </li>
}
