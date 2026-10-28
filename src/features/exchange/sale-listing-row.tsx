import {PlayerIdentityLink} from '@/features/profile/player-identity-link'
import {BoardTime} from '@/features/board/board-time'
import {Heart,MessageCircle,ChevronRight} from 'lucide-react'
import {GoldIcon} from '@/features/gold/gold-provider'
import {VisitableAvatar as PlayerAvatar} from '@/features/profile/visitable-avatar'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {LandscapeImage} from '@/components/landscape-image'
import {exchangeOfferItems,type ExchangeListing} from './api'
import {useReadPosts} from '@/lib/use-read-posts'

export function SaleListingRow({listing,owner}:{listing:ExchangeListing;owner:string}){
 const mine=listing.owner_id===owner
 const reads=useReadPosts(owner,'exchange')
 const items=exchangeOfferItems(listing.offer),bundle=items.length>1
 return <li className="min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-card">
  <PlayerIdentityLink to={'/exchange/'+listing.id} label={(listing.title||listing.offer.name)+' 상세 보기'} onClick={()=>reads.mark(listing.id)} className="block space-y-3 p-4 outline-none transition-colors hover:bg-secondary/20 focus-visible:bg-secondary/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
   <div className="flex min-w-0 gap-4">
    <div className="min-w-0 flex-1 space-y-2.5">{items.slice(0,2).map(item=><div key={item.kind+item.id} className="flex min-w-0 items-center gap-2.5">{item.kind==='collectible'?<CollectibleThumbnail path={item.thumbnail_path??''} name={item.name} className="size-10 shrink-0"/>:<LandscapeImage src={item.thumbnail_path??''} alt={item.name} className="size-10 shrink-0 object-contain"/>}<div className="min-w-0"><p className="truncate text-xs">{item.name}</p><p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">{item.quantity.toLocaleString('ko-KR')}개</p></div></div>)}{items.length>2&&<p className="text-[10px] text-muted-foreground">외 {items.length-2}종</p>}</div>
    <div className="shrink-0 pt-1 text-right"><p className="mb-1 text-[10px] text-muted-foreground">{bundle?'묶음 가격':'전체 가격'}</p><p className="flex items-center justify-end gap-1 whitespace-nowrap text-sm tabular-nums text-primary"><GoldIcon className="size-4"/>{listing.wanted.quantity.toLocaleString('ko-KR')}</p>{listing.status!=='active'&&<p className="mt-1 text-[10px] text-muted-foreground">{listing.status==='completed'?'판매 완료':'판매 취소'}</p>}</div>
   </div>
   <div className="flex items-start gap-2 border-t border-border/40 pt-3"><h2 className="line-clamp-2 min-w-0 flex-1 break-words text-xs leading-5">{listing.title||listing.offer.name+' 판매합니다'}</h2>{mine?<span className="shrink-0 text-[10px] text-primary">내 글</span>:reads.unread(listing.id)&&listing.status==='active'&&<span className="shrink-0 text-[10px] text-primary">NEW</span>}<ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground"/></div>
   <div className="flex min-w-0 items-center justify-between gap-3 text-[10px] text-muted-foreground">
    <div className="flex min-w-0 items-center gap-1.5" aria-label="판매자"><PlayerAvatar userId={listing.owner_id} nickname={listing.owner_name} path={listing.owner_avatar_path} className="size-5 shrink-0"/><span className="inline-flex max-w-full min-w-0 items-center gap-1 align-middle"><span className="truncate">{listing.owner_name}</span></span><span aria-hidden="true" className="opacity-50">·</span><BoardTime value={listing.created_at} className="shrink-0"/></div>
    <div className="flex shrink-0 items-center gap-3 tabular-nums"><span aria-label={'좋아요 '+(listing.like_count??0)+'개'} className="inline-flex items-center gap-1"><Heart aria-hidden="true" className="size-3"/>{listing.like_count??0}</span><span aria-label={'댓글 '+(listing.comment_count??0)+'개'} className="inline-flex items-center gap-1"><MessageCircle aria-hidden="true" className="size-3"/>{listing.comment_count??0}</span></div>
   </div>
  </PlayerIdentityLink>
 </li>
}
