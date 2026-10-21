import {BaitEffectDetails,baitPercent} from './bait-effect-details'
import {ProductSkeleton} from '@/components/product-skeleton'
import {LandscapeImage} from '@/components/landscape-image'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {useEffect,useRef,useState} from 'react'
import {Minus,Plus} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {loadFishing,type FishingBait} from './api'

export function BaitShop(){
 const {wallet,transact,batchEffects,loading,busy,error:goldError}=useGold()
 const [detail,setDetail]=useState<FishingBait|null>(null),[purchasing,setPurchasing]=useState(false)
 const [quantity,setQuantity]=useState<number|''>(1)
 const count=quantity===''?0:quantity
 const detailChance=detail?.successChanceBp??detail?.success_chance_bp??detail?.baseSuccessChanceBp
 const [purchaseError,setPurchaseError]=useState('')
 const lock=useRef(false)
 const maxQuantity=detail?.price?Math.min(99,Math.floor(wallet.gold/detail.price)):0
 const [items,setItems]=useState<FishingBait[]|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 useEffect(()=>{let active=true;setError('');loadFishing().then(data=>{if(active)setItems([...data.baits].sort((a,b)=>(a.price??Number.MAX_SAFE_INTEGER)-(b.price??Number.MAX_SAFE_INTEGER)))}).catch(()=>{if(active)setError('미끼를 불러오지 못했어요.')});return()=>{active=false}},[attempt])
 async function buy(item:FishingBait){
  if(lock.current||busy||loading||goldError||item.price===null||!Number.isInteger(count)||count<1||count>99||wallet.gold<item.price*count)return
  lock.current=true;setPurchasing(true);setPurchaseError('')
  let completed=0
  try{
   await batchEffects(async()=>{for(let i=0;i<count;i++){await transact({type:'buy',id:'fishing:'+item.id,name:item.name});completed++}})
   setQuantity(1)
  }catch(cause){setQuantity(Math.max(1,count-completed));setPurchaseError((completed?completed+'개 구매됐어요. 남은 수량을 다시 구매할 수 있어요. ':'')+(cause instanceof Error?cause.message:'구매하지 못했어요.'))}
  finally{lock.current=false;setPurchasing(false)}
 }
 if(error)return <div role="alert" className="space-y-2 text-sm"><p>{error}</p><Button variant="outline" onClick={()=>setAttempt(a=>a+1)}>다시 불러오기</Button></div>
 if(!items)return <ProductSkeleton/>
 return <><ul className="grid grid-cols-3 border-t border-border/60">{items.map(item=><li key={item.id} className="min-w-0 overflow-hidden border-r border-b border-border/60 bg-card"><button type="button" aria-label={item.name+' 상세 보기'} disabled={purchasing} onClick={()=>{setDetail(item);setQuantity(1);setPurchaseError('')}} className="flex w-full flex-col items-center px-1 pt-2 pb-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="relative aspect-square w-full"><LandscapeImage src={item.image_path} alt="" className="absolute inset-0 size-full object-contain"/></div><h2 className="mt-1 h-10 text-xs leading-5 line-clamp-2">{item.name}</h2><span className="flex items-center gap-1 text-xs text-primary">{item.price===null?'구매 불가':<><GoldIcon className="size-3"/>{item.price.toLocaleString('ko-KR')}</>}</span></button></li>)}</ul>
 <Dialog open={!!detail} onOpenChange={value=>{if(!value&&!purchasing)setDetail(null)}}>
  <DialogContent className="notification-sheet bottom-0 top-auto left-0 flex max-h-[85dvh] max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
   <DialogHeader className="shrink-0 px-4 pt-5 pb-3">
    <DialogTitle className="flex items-center gap-2 pr-7"><img src="/branding/pongi-starfish.png" alt="" aria-hidden="true" className="size-5 shrink-0 object-contain"/>{detail?.name}</DialogTitle>
    <DialogDescription className="sr-only">미끼 효과를 확인하고 구매 수량을 선택하세요.</DialogDescription>
   </DialogHeader>
   {detail&&<>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
     <div className="mb-3 flex items-center gap-4">
      <div className="relative size-[72px] shrink-0"><LandscapeImage src={detail.image_path} alt={detail.name} className="absolute inset-0 size-full object-contain"/></div>
      <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">낚시 성공률</p><p className="mt-1 text-2xl font-semibold tabular-nums text-primary">{detailChance===undefined?'—':baitPercent(detailChance)}</p></div>
     </div>
     <BaitEffectDetails bait={detail} compact/>
     {purchaseError&&<p role="alert" className="mt-3 text-xs leading-5 text-destructive">{purchaseError}</p>}
    </div>
    <div aria-label="미끼 구매" className="shrink-0 border-t border-border/60 bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
     <div className="mb-2 flex min-w-0 items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>보유 {(wallet.inventory[detail.id]??0).toLocaleString('ko-KR')}개</span>
      {detail.price!==null&&<span className="flex items-center gap-1">개당 <GoldIcon className="size-3"/>{detail.price.toLocaleString('ko-KR')}</span>}
     </div>
     {detail.price===null?<p className="py-3 text-center text-sm text-muted-foreground">획득 전용 · 구매 불가</p>:
      <div className="flex min-w-0 items-center gap-3">
       <div className="flex h-12 shrink-0 items-center overflow-hidden rounded-lg border border-border bg-background">
        <label htmlFor="bait-purchase-quantity" className="sr-only">구매 수량</label>
        <Button variant="ghost" size="icon" className="h-12 w-11 rounded-none" aria-label="구매 수량 줄이기" disabled={purchasing||count<=1} onClick={()=>setQuantity(value=>Math.max(1,Number(value)-1))}><Minus className="size-4"/></Button>
        <input id="bait-purchase-quantity" type="number" inputMode="numeric" min={1} max={Math.max(1,maxQuantity)} value={quantity} disabled={purchasing} onBlur={()=>{if(quantity==='')setQuantity(1)}} onChange={event=>{if(event.target.value===''){setQuantity('');return}const value=Number(event.target.value);setQuantity(Number.isFinite(value)?Math.max(1,Math.min(Math.max(1,maxQuantity),Math.floor(value))):1)}} className="h-12 w-10 appearance-none border-0 bg-transparent text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"/>
        <Button variant="ghost" size="icon" className="h-12 w-11 rounded-none" aria-label="구매 수량 늘리기" disabled={purchasing||count>=maxQuantity} onClick={()=>setQuantity(value=>Math.min(Math.max(1,maxQuantity),Number(value)+1))}><Plus className="size-4"/></Button>
       </div>
       <Button className="h-12 min-w-0 flex-1 gap-1.5 rounded-lg px-2 text-sm font-medium" disabled={loading||busy||purchasing||!!goldError||count<1||count>maxQuantity||wallet.gold<detail.price*count} aria-label={detail.name+' '+count+'개 구매'} onClick={()=>void buy(detail)}>{purchasing?'구매 중…':<><GoldIcon className="size-4"/><span className="tabular-nums">{(detail.price*count).toLocaleString('ko-KR')}</span><span>구매</span></>}</Button>
      </div>}
    </div>
   </>}
  </DialogContent>
 </Dialog>
 </>
}
