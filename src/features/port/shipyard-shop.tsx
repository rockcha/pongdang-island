import {useState,type ReactNode} from 'react'
import {Search,Target,Minus,Plus} from 'lucide-react'
import {appArt} from '@/components/app-art'
import {IslandSelect} from '@/components/island-select'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {GoldIcon} from '@/features/gold/gold-provider'
import type {HarborVessel} from './api'
import {BoatSprite} from './boat-sprite'
import {voyageDuration} from './voyage-duration'

const sorts=[{value:'price',label:'낮은 가격순'},{value:'price-desc',label:'높은 가격순'},{value:'catch',label:'최대 낚시 횟수순'},{value:'duration',label:'짧은 항해순'}] as const
const ownerships=[{value:'all',label:'전체 배'},{value:'owned',label:'보유한 배'},{value:'unowned',label:'미보유 배'}] as const
type Sort=typeof sorts[number]['value']
type Ownership=typeof ownerships[number]['value']
const maximum=(v:HarborVessel)=>v.fishing_count_max??v.fishing_count
export function filterShipyard(vessels:HarborVessel[],search:string,ownership:Ownership,sort:Sort){
 return vessels.filter(v=>v.name.includes(search.trim())&&(ownership==='all'||(ownership==='owned'?v.ownedCount>0:v.ownedCount===0))).toSorted((a,b)=>{
  const difference=sort==='price-desc'?b.price-a.price:sort==='catch'?maximum(b)-maximum(a):sort==='duration'?a.duration_minutes-b.duration_minutes:a.price-b.price
  return difference||a.price-b.price||a.name.localeCompare(b.name,'ko')
 })
}
export function ShipyardShop({vessels,gold,disabled,purchaseLimit=1,onBuy,stats}:{vessels:HarborVessel[];gold:number;disabled:boolean;purchaseLimit?:number;onBuy:(id:string,quantity:number)=>void;stats:(v:HarborVessel)=>ReactNode}){
 const [search,setSearch]=useState(''),[ownership,setOwnership]=useState<Ownership>('all'),[sort,setSort]=useState<Sort>('price')
 const [detailId,setDetailId]=useState<string|null>(null),[open,setOpen]=useState(false)
 const [quantity,setQuantity]=useState<number|''>(1)
 const detail=vessels.find(v=>v.id===detailId)
 const limit=Math.max(1,Math.min(100,Math.floor(purchaseLimit)))
 const affordable=detail&&detail.price>0?Math.max(0,Math.floor(gold/detail.price)):limit
 const maxQuantity=Math.min(limit,affordable)
 const count=Math.max(1,Math.min(Math.max(1,maxQuantity),Number(quantity)||1))
 const total=(detail?.price??0)*count
 const visible=filterShipyard(vessels,search,ownership,sort)
 return <>
  <div className="shrink-0 space-y-2 border-b border-border/60 bg-background p-3">
   <label className="flex min-h-11 items-center gap-2 rounded-xl border border-primary/15 px-3 text-muted-foreground"><Search aria-hidden className="size-4 shrink-0"/><input aria-label="배 이름 검색" placeholder="배 이름 검색" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none"/></label>
   <div className="grid grid-cols-2 gap-2"><IslandSelect label="조선소 보유 필터" value={ownership} onChange={setOwnership} options={ownerships}/><IslandSelect label="조선소 정렬" value={sort} onChange={setSort} options={sorts}/></div>
   <p className="text-[11px] text-muted-foreground">{visible.length}종</p>
  </div>
  <div aria-label="조선소 배 목록" className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
   <ul className="grid grid-cols-3">{visible.map(v=><li key={v.id} className="@container min-w-0 overflow-hidden border-r border-b border-border/60 bg-card"><button type="button" aria-label={v.name+' 상세 보기'} disabled={disabled} onClick={()=>{setDetailId(v.id);setQuantity(1);setOpen(true)}} className="flex h-full w-full min-w-0 flex-col items-center px-1 pt-2 pb-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <div className="relative aspect-square w-full shrink-0"><BoatSprite src={v.sprite_path} name={v.name} animate={false} className="absolute inset-0 size-full"/>{v.ownedCount>0&&<span className="absolute right-1 top-1 rounded-full bg-background/95 px-1.5 py-0.5 text-[10px] text-primary">{v.ownedCount}척</span>}</div>
    <h2 className="mt-1 mb-2 h-10 w-full shrink-0 px-1 text-xs leading-5 line-clamp-2 [overflow-wrap:anywhere]">{v.name}</h2>
    <span className="mb-2 grid h-20 w-full shrink-0 grid-cols-2 grid-rows-2 gap-x-0 gap-y-1 px-0.5 text-[9px] leading-4 tabular-nums text-muted-foreground @[100px]:h-12 @[120px]:text-[10px]">
     <span aria-label={`항해 시간 ${voyageDuration(v.duration_minutes)}`} title={voyageDuration(v.duration_minutes)} className="flex min-w-0 flex-col items-center justify-center gap-0.5 whitespace-nowrap @[100px]:flex-row"><img src="/app-icons/voyage-clock.png" alt="" className="size-3.5 shrink-0 object-contain"/><span>{v.duration_minutes>0&&v.duration_minutes%30===0?`${v.duration_minutes/60}시간`:v.duration_minutes.toLocaleString('ko-KR',{maximumFractionDigits:2})+'분'}</span></span>
     <span aria-label={`낚시 횟수 ${v.fishing_count}${maximum(v)>v.fishing_count?'~'+maximum(v):''}회`} className="flex min-w-0 flex-col items-center justify-center gap-0.5 whitespace-nowrap @[100px]:flex-row"><img src="/app-icons/voyage-fishing.png" alt="" className="size-3.5 shrink-0 object-contain"/><span>{v.fishing_count}{maximum(v)>v.fishing_count?'~'+maximum(v):''}회</span></span>
     <span aria-label={`연료 ${v.fuel_cost}개`} className="flex min-w-0 flex-col items-center justify-center gap-0.5 whitespace-nowrap @[100px]:flex-row"><appArt.fuel className="size-3.5 shrink-0"/>{v.fuel_cost}</span>
     <span aria-label={`낚시 성공률 ${v.catch_rule?v.catch_rule.success_bp/100+'%':'정보 없음'}`} className="flex min-w-0 flex-col items-center justify-center gap-0.5 whitespace-nowrap @[100px]:flex-row"><Target aria-hidden className="size-3.5 shrink-0 text-primary"/>{v.catch_rule?v.catch_rule.success_bp/100+'%':'—'}</span>
    </span><span className="mt-auto flex h-5 shrink-0 items-center gap-1 whitespace-nowrap text-xs text-primary"><GoldIcon className="size-3"/>{v.price.toLocaleString('ko-KR')}</span>
   </button></li>)}</ul>
   {!visible.length&&<div className="space-y-3 px-4 py-10 text-center"><p className="text-xs text-muted-foreground">조건에 맞는 배가 없어요.</p><Button variant="outline" onClick={()=>{setSearch('');setOwnership('all');setSort('price')}}>검색·필터 초기화</Button></div>}
  </div>
  <Dialog open={open} onOpenChange={setOpen} onOpenChangeComplete={value=>{if(!value&&!open)setDetailId(null)}}><DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] min-w-0 max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
   <DialogHeader className="shrink-0 px-4 pt-4 pb-3 pr-12"><div className="flex items-center gap-3">{detail&&<BoatSprite src={detail.sprite_path} name={detail.name} animate={false} className="size-16 shrink-0"/>}<div className="min-w-0 space-y-1.5"><DialogTitle className="text-base leading-6">{detail?.name}</DialogTitle><DialogDescription className="text-xs">항해 성능을 비교하고 배를 구매하세요.</DialogDescription></div></div></DialogHeader>
   {detail&&<><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{stats(detail)}</div>
   <div className="shrink-0 border-t border-border/60 bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
    <p className="mb-3 text-xs text-muted-foreground">보유 {detail.ownedCount}척</p>
    <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>구매 수량</span><span className="flex items-center gap-1">척당 <GoldIcon className="size-3"/>{detail.price.toLocaleString('ko-KR')}</span></div>
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
     <div className="grid min-h-12 min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center rounded-lg border">
      <Button variant="ghost" size="icon" className="size-10" aria-label="구매 수량 줄이기" disabled={disabled||count<=1} onClick={()=>setQuantity(count-1)}><Minus className="size-4"/></Button>
      <input aria-label="배 구매 수량" type="number" inputMode="numeric" min={1} max={Math.max(1,maxQuantity)} value={quantity===''?'':count} disabled={disabled} onBlur={()=>{if(quantity==='')setQuantity(1)}} onChange={e=>{const next=e.target.valueAsNumber;setQuantity(e.target.value===''?'':Number.isFinite(next)?Math.max(1,Math.min(Math.max(1,maxQuantity),Math.floor(next))):1)}} className="h-12 w-full min-w-0 bg-transparent text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"/>
      <Button variant="ghost" size="icon" className="size-10" aria-label="구매 수량 늘리기" disabled={disabled||count>=maxQuantity} onClick={()=>setQuantity(count+1)}><Plus className="size-4"/></Button>
     </div>
     <Button className="min-h-12 min-w-0 gap-1 rounded-lg px-2 text-xs" disabled={disabled||quantity===''||maxQuantity<1} aria-label={`${detail.name} 구매 ${total} 골드`} onClick={()=>{setOpen(false);onBuy(detail.id,count)}}><GoldIcon className="size-4 shrink-0"/><span className="tabular-nums">{total.toLocaleString('ko-KR')}</span> 구매</Button>
    </div>
    {gold<detail.price&&<p className="mt-2 text-center text-xs text-muted-foreground">골드가 부족해요.</p>}
   </div></>}
  </DialogContent></Dialog>
 </>
}
