import {Button} from '@/components/ui/button'
import {GoldIcon} from '@/features/gold/gold-provider'
import {PlayerAvatar} from '@/features/profile/player-avatar'
import {AssetView} from './asset-view'
import type {ExchangeListing} from './api'

export function SaleListingRow({listing,owner,busy,onAction}:{listing:ExchangeListing;owner:string;busy:boolean;onAction:(action:'accept'|'cancel')=>void}){
 const mine=listing.owner_id===owner
 return <li className="min-w-0 space-y-2.5 px-4 py-4">
   <h2 className="break-words text-sm font-medium leading-5">{listing.title||`${listing.offer.name} 판매합니다`}</h2>
   <div className="flex min-w-0 items-center gap-1.5" aria-label="판매자"><PlayerAvatar nickname={listing.owner_name} path={listing.owner_avatar_path} className="size-6 shrink-0"/><span className="truncate text-[11px] text-muted-foreground">{listing.owner_name}</span></div>
  <div className="flex min-w-0 items-center justify-between gap-3">
   <div className="min-w-0 flex-1"><AssetView asset={listing.offer} compact/></div>
   <div className="flex shrink-0 flex-col items-end gap-1">
    {mine&&<p className="flex items-center gap-1 text-xs tabular-nums text-primary"><GoldIcon className="size-4"/>{listing.wanted.quantity.toLocaleString('ko-KR')}</p>}
    {listing.status==='active'?<Button className="min-h-11 min-w-20 gap-1.5 rounded-lg px-3 tabular-nums" variant={mine?'ghost':'default'} aria-label={mine?'등록 취소':`${listing.wanted.quantity.toLocaleString('ko-KR')} 골드에 구매하기`} disabled={busy} onClick={()=>onAction(mine?'cancel':'accept')}>{mine?'등록 취소':<><GoldIcon className="size-5"/>{listing.wanted.quantity.toLocaleString('ko-KR')}</>}</Button>:<span className="flex min-h-9 items-center text-xs text-muted-foreground">{listing.status==='completed'?'판매 완료':'취소 · 우편 반환'}</span>}
   </div>
  </div>
 </li>
}
