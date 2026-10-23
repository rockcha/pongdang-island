import {PlayerIdentityLink} from '@/features/profile/player-identity-link'
import {BoardTime} from '@/features/board/board-time'
import {Heart,MessageCircle} from 'lucide-react'
import {GoldIcon} from '@/features/gold/gold-provider'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {LandscapeImage} from '@/components/landscape-image'
import {exchangeOfferItems,type ExchangeListing} from './api'

export function SaleListingRow({listing,owner}:{listing:ExchangeListing;owner:string}){
 const mine=listing.owner_id===owner
 const items=exchangeOfferItems(listing.offer),bundle=items.length>1
 return <li className="min-w-0">
  <PlayerIdentityLink to={'/exchange/'+listing.id} label={(listing.title||listing.offer.name)+' 상세 보기'} className="block space-y-4 px-5 py-5 outline-none transition-colors hover:bg-secondary/20 focus-visible:bg-secondary/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
   <div className="flex min-w-0 gap-4">
    <div className={bundle?'grid size-16 shrink-0 grid-cols-2 items-center justify-items-center self-center':'flex size-16 shrink-0 items-center justify-center self-center'}>
     {items.slice(0,4).map(item=>item.kind==='collectible'?<CollectibleThumbnail key={item.kind+item.id} path={item.thumbnail_path??''} name={item.name} className={bundle?'size-8':'size-16'}/>:<LandscapeImage key={item.kind+item.id} src={item.thumbnail_path??''} alt={item.name} className={bundle?'size-8 object-contain':'size-14 object-contain'}/>)}
    </div>
    <div className="min-w-0 flex-1 space-y-1.5">
     <div className="flex items-start gap-2"><h2 className="line-clamp-2 min-w-0 break-words text-sm font-medium leading-6">{listing.title||listing.offer.name+' 판매합니다'}</h2>{mine&&<span className="mt-1 shrink-0 rounded bg-secondary/70 px-1.5 py-0.5 text-[9px] text-primary">내 글</span>}</div>
     <p className="truncate text-[11px] text-muted-foreground">{bundle?`${items.length}종 묶음`:listing.offer.name}<span className="mx-1.5 opacity-50">·</span>{bundle?'총 ':''}{listing.offer.quantity.toLocaleString('ko-KR')}개</p>
     <p className="flex items-center gap-1 text-base tabular-nums text-primary"><GoldIcon className="size-4"/>{listing.wanted.quantity.toLocaleString('ko-KR')}{listing.status!=='active'&&<span className="ml-1.5 text-[10px] text-muted-foreground">{listing.status==='completed'?'판매 완료':'판매 취소'}</span>}</p>
    </div>
   </div>
   <div className="flex min-w-0 items-center justify-between gap-3 text-[10px] text-muted-foreground">
    <div className="flex min-w-0 items-center gap-1.5" aria-label="판매자"><PlayerAvatar userId={listing.owner_id} nickname={listing.owner_name} path={listing.owner_avatar_path} className="size-5 shrink-0"/><span className="inline-flex max-w-full min-w-0 items-center gap-1 align-middle"><span className="truncate">{listing.owner_name}</span></span><span aria-hidden="true" className="opacity-50">·</span><BoardTime value={listing.created_at} className="shrink-0"/></div>
    <div className="flex shrink-0 items-center gap-3 tabular-nums"><span aria-label={'좋아요 '+(listing.like_count??0)+'개'} className="inline-flex items-center gap-1"><Heart aria-hidden="true" className="size-3"/>{listing.like_count??0}</span><span aria-label={'댓글 '+(listing.comment_count??0)+'개'} className="inline-flex items-center gap-1"><MessageCircle aria-hidden="true" className="size-3"/>{listing.comment_count??0}</span></div>
   </div>
  </PlayerIdentityLink>
 </li>
}
