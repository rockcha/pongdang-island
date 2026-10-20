import {useSearchParams} from 'react-router'
import {regionIcons} from './region-icons'
import {ProductSkeleton} from '@/components/product-skeleton'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {useEffect,useRef,useState} from 'react'
import {Check,LockKeyhole} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {TradeQuestion} from '@/components/trade-question'
import {collectibleUrl} from '@/features/collection/api'
import {LandscapeImage} from '@/components/landscape-image'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {loadMapShop,type MapProduct,type MapShopState} from './map-shop-api'
export function MapShop(){
 const [params]=useSearchParams()
 const selectedRegion=params.get('region')
 const openedRegion=useRef<string|null>(null)
 const {wallet,transact,loading:goldLoading,busy:goldBusy,error:goldError}=useGold()
 const [state,setState]=useState<MapShopState|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 const [pending,setPending]=useState<MapProduct|null>(null),[busy,setBusy]=useState(false),[tradeError,setTradeError]=useState('')
 const [detail,setDetail]=useState<MapProduct|null>(null)
 const active=useRef(true),lock=useRef(false)
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 useEffect(()=>{let current=true;setError('');loadMapShop().then(data=>{if(current)setState(data)}).catch(()=>{if(current)setError('지도를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')});return()=>{current=false}},[attempt])
 useEffect(()=>{if(!selectedRegion){openedRegion.current=null;return}if(!state||openedRegion.current===selectedRegion)return;const item=state.items.find(item=>item.region_id===selectedRegion);if(item){openedRegion.current=selectedRegion;setDetail(item)}},[state,selectedRegion])
 async function buy(){
  if(!pending||lock.current)return
  lock.current=true;setBusy(true);setTradeError('')
  try{await transact({type:'buy',id:'map:'+pending.region_id,name:pending.name});if(active.current){setState(s=>s?{items:s.items.map(m=>m.region_id===pending.region_id?{...m,owned:true}:m)}:s);setPending(null)}}
  catch(cause){if(active.current)setTradeError(cause instanceof Error?cause.message:'구매하지 못했어요.')}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 const unavailable=goldLoading||goldBusy||busy||!!goldError
 return <div className="space-y-4">
  <p className="px-3 pt-3 text-[11px] leading-5 text-muted-foreground">더 비싼 지도에서는 같은 등급의 고유 생물이 평균적으로 더 높은 가치를 가져요.</p>
  {error?<div role="alert" className="space-y-2 text-sm"><p>{error}</p><Button variant="outline" onClick={()=>setAttempt(a=>a+1)}>다시 불러오기</Button></div>:!state?<ProductSkeleton/>:<div className="grid grid-cols-3 border-t border-border/60">{state.items.map(item=><article key={item.region_id} aria-label={item.name} className={`min-w-0 overflow-hidden border-r border-b border-border/60 ${item.owned?'bg-[#F0F5ED]':'bg-card'}`}><button type="button" aria-label={item.name+' 상세 보기'} onClick={()=>setDetail(item)} className="flex w-full flex-col items-center px-1 pt-2 pb-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="relative aspect-square w-full"><span className={`absolute top-1 right-1 z-10 grid size-6 place-items-center rounded-full border shadow-sm ${item.owned?'border-[#C9D9C5] bg-[#EDF4E9] text-[#426342]':'border-border bg-background text-muted-foreground'}`}>{item.owned?<Check aria-hidden="true" className="size-3.5"/>:<LockKeyhole aria-hidden="true" className="size-3.5"/>}</span><LandscapeImage src={collectibleUrl(item.thumbnail_path)} alt={item.name} className="absolute inset-0 size-full object-contain"/></div><h2 className="mt-1 h-10 text-xs leading-5 line-clamp-2">{item.name}</h2><span className={`flex min-h-6 items-center gap-1 rounded-full px-2 text-xs font-medium ${item.owned?'bg-[#DFEBDD] text-[#426342]':'bg-secondary text-primary'}`}>{item.owned?<><Check className="size-3"/>보유중</>:<><GoldIcon className="size-3"/>{item.price.toLocaleString('ko-KR')}</>}</span></button></article>)}</div>}
  <Dialog open={!!detail} onOpenChange={value=>{if(!value)setDetail(null)}}><DialogContent className="notification-sheet bottom-0 top-auto left-0 flex max-h-[88dvh] max-w-full translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-2xl rounded-b-none pb-0 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"><DialogHeader className="shrink-0"><DialogTitle className="flex items-center gap-2 pr-6">{detail&&regionIcons[detail.region_id]&&<img src={regionIcons[detail.region_id].src} alt="" className="size-7 shrink-0 object-contain"/>}{detail?.name}</DialogTitle><DialogDescription>{detail?.description}</DialogDescription></DialogHeader>{detail&&<><div className="min-h-0 overflow-y-auto overscroll-contain pb-4"><div className="relative mx-auto size-36"><LandscapeImage src={collectibleUrl(detail.thumbnail_path)} alt={detail.name} className="absolute inset-0 size-full object-contain"/></div></div><div className="-mx-4 shrink-0 border-t bg-primary pb-[env(safe-area-inset-bottom)]"><Button className="h-16 w-full gap-2 rounded-none px-4 text-base font-medium" aria-label={detail.owned?detail.name+' 보유중':detail.name+' 구매'} disabled={unavailable||detail.owned||wallet.gold<detail.price} onClick={()=>{setTradeError('');setPending(detail);setDetail(null)}}>{detail.owned?'보유중':<><GoldIcon className="size-4"/>{detail.price.toLocaleString('ko-KR')}</>}</Button></div></>}</DialogContent></Dialog>
  <ConfirmDialog illustration="purchase" open={!!pending} onOpenChange={open=>{if(!open){setPending(null);setTradeError('')}}} title={pending?<TradeQuestion name={pending.name} price={pending.price}/>:''} description="구매 즉시 해당 해역이 해금됩니다." busy={busy} confirmDisabled={unavailable} error={tradeError} onConfirm={()=>void buy()}/>
 </div>
}
