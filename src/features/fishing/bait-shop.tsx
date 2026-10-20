import {BaitEffectDetails} from './bait-effect-details'
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
 <Dialog open={!!detail} onOpenChange={value=>{if(!value&&!purchasing)setDetail(null)}}><DialogContent className="notification-sheet bottom-0 top-auto left-0 flex max-h-[85dvh] max-w-full translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-2xl rounded-b-none pb-0 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"><DialogHeader className="shrink-0"><DialogTitle className="flex items-center gap-2 pr-6"><img src="/branding/pongi-starfish.png" alt="" aria-hidden="true" className="size-6 shrink-0 object-contain"/>{detail?.name}</DialogTitle><DialogDescription>{detail?.description}</DialogDescription></DialogHeader>{detail&&<><div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain pb-4"><div className="relative mx-auto size-32"><LandscapeImage src={detail.image_path} alt={detail.name} className="absolute inset-0 size-full object-contain"/></div><BaitEffectDetails bait={detail}/><p className="text-xs text-muted-foreground">보유 {wallet.inventory[detail.id]??0}개</p>{detail.price===null?<p className="text-center text-sm text-muted-foreground">구매 불가</p>:<><div className="flex items-center justify-between gap-3"><label htmlFor="bait-purchase-quantity" className="text-sm">구매 수량</label><div className="flex items-center gap-1"><Button variant="outline" size="icon" aria-label="구매 수량 줄이기" disabled={purchasing||count<=1} onClick={()=>setQuantity(value=>Math.max(1,Number(value)-1))}><Minus className="size-4"/></Button><input id="bait-purchase-quantity" type="number" inputMode="numeric" min={1} max={Math.max(1,maxQuantity)} value={quantity} disabled={purchasing} onBlur={()=>{if(quantity==='')setQuantity(1)}} onChange={event=>{if(event.target.value===''){setQuantity('');return}const value=Number(event.target.value);setQuantity(Number.isFinite(value)?Math.max(1,Math.min(Math.max(1,maxQuantity),Math.floor(value))):1)}} className="h-11 w-16 rounded-lg border bg-background text-center text-sm tabular-nums"/><Button variant="outline" size="icon" aria-label="구매 수량 늘리기" disabled={purchasing||count>=maxQuantity} onClick={()=>setQuantity(value=>Math.min(Math.max(1,maxQuantity),Number(value)+1))}><Plus className="size-4"/></Button></div></div>{purchaseError&&<p role="alert" className="text-sm text-destructive">{purchaseError}</p>}</>}</div>{detail.price!==null&&<div className="-mx-4 shrink-0 border-t bg-primary pb-[env(safe-area-inset-bottom)]"><Button className="h-16 w-full gap-2 rounded-none px-4 text-base font-medium" disabled={loading||busy||purchasing||!!goldError||count<1||count>maxQuantity||wallet.gold<detail.price*count} aria-label={detail.name+' '+count+'개 구매'} onClick={()=>void buy(detail)}>{purchasing?'구매 중…':<><GoldIcon className="size-4"/>{(detail.price*count).toLocaleString('ko-KR')}</>}</Button></div>}</>}</DialogContent></Dialog>
 </>
}
