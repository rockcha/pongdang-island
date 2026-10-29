import {GoldIcon} from '@/features/gold/gold-provider'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {LandscapeImage} from '@/components/landscape-image'
import {exchangeOfferItems,type ExchangeAsset,type ExchangeListing} from './api'

const number=(value:number)=>value.toLocaleString('ko-KR',{maximumFractionDigits:2})
function Gold({value}:{value:number}){return <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums"><GoldIcon className="size-4"/>{number(value)}</span>}
function shopValue(item:ExchangeAsset){return item.kind==='collectible'&&item.sell_price!=null&&Number.isFinite(item.sell_price)&&item.sell_price>=0?item.sell_price:null}
function Difference({value,unit}:{value:number;unit:boolean}){
 const label=value>0?'이익':value<0?'손해':'차이 없음'
 return <span title="구매 후 상점에 되팔 때의 차익" aria-label={`${unit?'개당':'묶음 전체'} ${number(Math.abs(value))}골드 ${label}`} className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] ${value>0?'text-emerald-700 dark:text-emerald-400':value<0?'text-destructive':'text-muted-foreground'}`}>{unit?'개당':'전체'}{!Number.isInteger(value)&&' 약'} <Gold value={Math.abs(value)}/>{label}</span>
}

/** A bundle has one agreed price; never invent a price for its individual goods. */
export function SaleOffer({listing,preview=false}:{listing:ExchangeListing;preview?:boolean}){
 const items=exchangeOfferItems(listing.offer),bundle=items.length>1,total=listing.wanted.quantity
 const comparable=items.every(item=>shopValue(item)!=null)
 const margin=comparable?items.reduce((sum,item)=>sum+shopValue(item)!*item.quantity,0)-total:null
 return <div className={`space-y-3 ${listing.status!=='active'?'opacity-40 grayscale':''}`}>
  {(preview?items.slice(0,2):items).map(item=>{
   const quantity=item.quantity,unit=quantity>0?total/quantity:null,reference=shopValue(item)
   return <div key={item.kind+item.id} className={`flex min-w-0 items-start gap-3 ${quantity<=0?'opacity-40 grayscale':''}`}>
    {item.kind==='collectible'?<CollectibleThumbnail path={item.thumbnail_path??''} name={item.name} className="size-12 shrink-0"/>:<LandscapeImage src={item.thumbnail_path??''} alt={item.name} className="size-12 shrink-0 object-contain"/>}
    <div className="min-w-0 flex-1"><p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-semibold leading-5"><span className="min-w-0 break-words">{item.name}</span><span className="whitespace-nowrap text-base font-bold tabular-nums text-primary">× {number(quantity)}</span></p>
     {!bundle&&unit!=null&&<div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><span className="text-[10px] font-normal text-muted-foreground">개당{!Number.isInteger(unit)&&' 약'}</span><Gold value={unit}/></span>{reference!=null&&<Difference value={reference-unit} unit/>}</div>}
    </div>
   </div>
  })}
  {preview&&items.length>2&&<p className="text-[10px] text-muted-foreground">외 {items.length-2}종</p>}
  {(bundle||items[0]?.quantity!==1)&&<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/40 pt-2"><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><span className="text-[10px] font-normal text-muted-foreground">{bundle?'묶음 전체 가격':'전체 가격'}</span><Gold value={total}/></span>{bundle&&margin!=null&&<Difference value={margin} unit={false}/>}</div>}
 </div>
}
