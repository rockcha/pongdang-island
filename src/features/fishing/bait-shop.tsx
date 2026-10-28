import {BaitEffectDetails,baitPercent} from './bait-effect-details'
import {ProductSkeleton} from '@/components/product-skeleton'
import {LandscapeImage} from '@/components/landscape-image'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {useEffect,useRef,useState} from 'react'
import {Minus,Plus} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {loadFishing,type FishingBait} from './api'
import {BaitTarget} from './bait-info'
import {BaitShopFilters,filterBaitShop,initialBaitShopFilter} from './bait-shop-filters'

export function BaitShop(){
 const {wallet,transact,loading,busy,error:goldError}=useGold()
 const [detail,setDetail]=useState<FishingBait|null>(null),[purchasing,setPurchasing]=useState(false)
 const [quantity,setQuantity]=useState<number|''>(1)
 const count=quantity===''?0:quantity
 const detailChance=detail?.successChanceBp??detail?.success_chance_bp??detail?.baseSuccessChanceBp
 const [purchaseError,setPurchaseError]=useState('')
 const lock=useRef(false)
 const quotes=useRef(new Map<string,{item:FishingBait;quantity:number}>())
 const maxQuantity=detail?.price?Math.min(99,Math.floor(wallet.gold/detail.price)):0
 const [items,setItems]=useState<FishingBait[]|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 const [filter,setFilter]=useState(initialBaitShopFilter)
 useEffect(()=>{
  let active=true,revision=0
  const refresh=async()=>{if(lock.current||document.hidden)return;const request=++revision;try{const data=await loadFishing();if(active&&request===revision){setItems([...data.baits].sort((a,b)=>(a.price??Number.MAX_SAFE_INTEGER)-(b.price??Number.MAX_SAFE_INTEGER)));setError('')}}catch{if(active&&request===revision)setError('미끼를 불러오지 못했어요.')}}
  const sync=()=>{void refresh()};sync();window.addEventListener('focus',sync);window.addEventListener('online',sync);window.addEventListener('relic-loadout-changed',sync)
  return()=>{active=false;revision++;window.removeEventListener('focus',sync);window.removeEventListener('online',sync);window.removeEventListener('relic-loadout-changed',sync)}
 },[attempt])
 async function buy(item:FishingBait){
  if(lock.current||busy||loading||goldError||item.price===null||!Number.isInteger(count)||count<1||count>99||wallet.gold<item.price*count)return
  lock.current=true;quotes.current.set(item.id,{item,quantity:count});setPurchasing(true);setPurchaseError('')
  try{
   await transact({type:'buy',id:'fishing:'+item.id,name:item.name,expectedPrice:item.price!,quantity:count})
   quotes.current.delete(item.id)
   setQuantity(1)
  }catch(cause){
   setPurchaseError(cause instanceof Error?cause.message:'구매하지 못했어요.')
   if(cause instanceof Error&&cause.message.includes('미끼 구매 가격이 바뀌었어요')){
    quotes.current.delete(item.id)
    try{const latest=await loadFishing();setItems([...latest.baits].sort((a,b)=>(a.price??Number.MAX_SAFE_INTEGER)-(b.price??Number.MAX_SAFE_INTEGER)));setDetail(latest.baits.find(b=>b.id===item.id)??null)}catch{/* Keep the confirmed quote until prices can be reloaded. */}
   }
  }
  finally{lock.current=false;setPurchasing(false)}
 }
 if(error)return <div role="alert" className="space-y-2 text-sm"><p>{error}</p><Button variant="outline" onClick={()=>setAttempt(a=>a+1)}>다시 불러오기</Button></div>
 if(!items)return <ProductSkeleton/>
 const visibleItems=filterBaitShop(items,filter)
 return <><BaitShopFilters value={filter} onChange={setFilter}/>{visibleItems.length===0&&<div className="space-y-3 px-4 py-10 text-center"><p className="text-xs text-muted-foreground">조건에 맞는 미끼가 없어요.</p><Button variant="outline" className="min-h-11 text-xs" onClick={()=>setFilter(initialBaitShopFilter)}>검색·필터 초기화</Button></div>}<ul className="grid grid-cols-3 border-border/60">{visibleItems.map(item=><li key={item.id} className="min-w-0 overflow-hidden border-r border-b border-border/60 bg-card"><button type="button" aria-label={item.name+' 상세 보기'} disabled={purchasing} onClick={()=>{setDetail(quotes.current.get(item.id)?.item??item);setQuantity(quotes.current.get(item.id)?.quantity??1);setPurchaseError('')}} className="flex w-full flex-col items-center px-1 pt-2 pb-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="relative aspect-square w-full"><LandscapeImage src={item.image_path} alt="" className="absolute inset-0 size-full object-contain"/></div><h2 className="mt-1 h-10 text-xs leading-5 line-clamp-2">{item.name}</h2><span className="flex items-center gap-1 text-xs text-primary">{item.price===null?'구매 불가':<><GoldIcon className="size-3"/>{item.price.toLocaleString('ko-KR')}</>}</span></button></li>)}</ul>
 <Dialog open={!!detail} onOpenChange={value=>{if(!value&&!purchasing)setDetail(null)}}>
  <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] min-w-0 max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 [--bait-detail-inset:max(1rem,env(safe-area-inset-left,0px),env(safe-area-inset-right,0px))] sm:max-w-md">
   <DialogHeader className="min-w-0 shrink-0 px-[var(--bait-detail-inset)] pt-5 pb-3">
    <DialogTitle className="flex min-w-0 items-start gap-2 pr-8"><img src="/branding/pongi-starfish.png" alt="" aria-hidden="true" className="mt-0.5 size-5 shrink-0 object-contain"/><span className="min-w-0 flex-1 break-keep leading-6 [overflow-wrap:anywhere]">{detail?.name}</span></DialogTitle>
    <DialogDescription className="sr-only">미끼 효과를 확인하고 구매 수량을 선택하세요.</DialogDescription>
   </DialogHeader>
   {detail&&<>
    <div data-bait-detail-body className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto overscroll-contain px-[var(--bait-detail-inset)] pb-3 [overflow-wrap:anywhere]">
     <div className="mb-3 flex min-w-0 items-center gap-3">
      <div className="relative size-[72px] shrink-0"><LandscapeImage src={detail.image_path} alt={detail.name} className="absolute inset-0 size-full object-contain"/></div>
      <div className="min-w-0 flex-1">{detail.mechanicsVersion===2?<div className="space-y-1.5"><BaitTarget bait={detail}/></div>:<><p className="text-xs text-muted-foreground">낚시 성공률</p><p className="mt-1 text-2xl font-semibold tabular-nums text-primary">{detailChance===undefined?'—':baitPercent(detailChance)}</p></>}</div>
     </div>
     <BaitEffectDetails bait={detail} compact/>
     {purchaseError&&<p role="alert" className="mt-3 text-xs leading-5 text-destructive">{purchaseError}</p>}
    </div>
    <div aria-label="미끼 구매" className="w-full min-w-0 shrink-0 border-t border-border/60 bg-background px-[var(--bait-detail-inset)] pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
     <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>보유 {(wallet.inventory[detail.id]??0).toLocaleString('ko-KR')}개</span>
      {(detail.priceDiscountGold??0)>0&&<span className="flex items-center gap-1 text-primary">유물 할인 <GoldIcon className="size-3"/>−{detail.priceDiscountGold}</span>}{detail.price!==null&&<span className="flex items-center gap-1">개당 <GoldIcon className="size-3"/>{detail.price.toLocaleString('ko-KR')}</span>}
     </div>
     {detail.price===null?<p className="py-3 text-center text-sm text-muted-foreground">획득 전용 · 구매 불가</p>:
      <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] items-stretch gap-2">
       <div className="grid h-12 min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center overflow-hidden rounded-lg border border-border bg-background">
        <label htmlFor="bait-purchase-quantity" className="sr-only">구매 수량</label>
        <Button variant="ghost" size="icon" className="h-12 w-full min-w-0 rounded-none" aria-label="구매 수량 줄이기" disabled={purchasing||count<=1} onClick={()=>setQuantity(value=>Math.max(1,Number(value)-1))}><Minus className="size-4"/></Button>
        <input id="bait-purchase-quantity" type="number" inputMode="numeric" min={1} max={Math.max(1,maxQuantity)} value={quantity} disabled={purchasing} onBlur={()=>{if(quantity==='')setQuantity(1)}} onChange={event=>{if(event.target.value===''){setQuantity('');return}const value=Number(event.target.value);setQuantity(Number.isFinite(value)?Math.max(1,Math.min(Math.max(1,maxQuantity),Math.floor(value))):1)}} className="h-12 w-full min-w-0 appearance-none border-0 bg-transparent px-0 text-center text-base tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"/>
        <Button variant="ghost" size="icon" className="h-12 w-full min-w-0 rounded-none" aria-label="구매 수량 늘리기" disabled={purchasing||count>=maxQuantity} onClick={()=>setQuantity(value=>Math.min(Math.max(1,maxQuantity),Number(value)+1))}><Plus className="size-4"/></Button>
       </div>
       <Button className="min-h-12 w-full min-w-0 gap-1.5 rounded-lg px-2 py-2 text-sm font-medium whitespace-normal" disabled={loading||busy||purchasing||!!goldError||count<1||count>maxQuantity||wallet.gold<detail.price*count} aria-label={detail.name+' '+count+'개 구매'} onClick={()=>void buy(detail)}>{purchasing?'구매 중…':<><GoldIcon className="size-4"/><span className="min-w-0 tabular-nums [overflow-wrap:anywhere]">{(detail.price*count).toLocaleString('ko-KR')}</span><span className="shrink-0">구매</span></>}</Button>
      </div>}
    </div>
   </>}
  </DialogContent>
 </Dialog>
 </>
}
