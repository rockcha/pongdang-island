import {GoldIcon} from '@/features/gold/gold-provider'
import type {ExchangeAsset} from './api'

export function ShopSalePrice({asset,compact=false}:{asset:ExchangeAsset;compact?:boolean}){
 const price=asset.sell_price
 if(asset.kind!=='collectible'||asset.items?.length||price==null||!Number.isFinite(price)||price<0)return null
 return <span title="상점에 개당 판매할 때 받는 골드" aria-label={`상점 판매가 개당 ${price.toLocaleString('ko-KR')}골드`} className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[10px] font-normal leading-4 text-muted-foreground">
  <span>{compact?'상점가':'상점 판매가'}</span><span className="inline-flex items-center gap-0.5 whitespace-nowrap tabular-nums"><GoldIcon className="size-3"/>{price.toLocaleString('ko-KR')}{!compact&&<span className="opacity-70">/ 개</span>}</span>
 </span>
}
