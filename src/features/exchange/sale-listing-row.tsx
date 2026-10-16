import {Button} from '@/components/ui/button'
import {GoldIcon} from '@/features/gold/gold-provider'
import {AssetView} from './asset-view'
import type {ExchangeListing} from './api'

export function SaleListingRow({listing,owner,busy,onAction}:{listing:ExchangeListing;owner:string;busy:boolean;onAction:(action:'accept'|'cancel')=>void}){
 const mine=listing.owner_id===owner
 return <li className="flex items-center gap-3 py-4">
  <div className="min-w-0 flex-1 space-y-1"><AssetView asset={listing.offer}/><p className="truncate pl-16 text-[11px] text-muted-foreground">{listing.owner_name}</p></div>
  <div className="flex shrink-0 flex-col items-end gap-2"><p className="flex items-center gap-1 text-sm tabular-nums text-primary"><GoldIcon className="size-4"/>{listing.wanted.quantity.toLocaleString('ko-KR')}</p>
   {listing.status==='active'?<Button className="min-h-9 min-w-16" variant={mine?'ghost':'outline'} disabled={busy} onClick={()=>onAction(mine?'cancel':'accept')}>{mine?'등록 취소':'구매하기'}</Button>:<span className="flex min-h-9 items-center text-xs text-muted-foreground">{listing.status==='completed'?'판매 완료':'취소 · 우편 반환'}</span>}
  </div>
 </li>
}
