import {useEffect,useRef,useState} from 'react'
import {Check} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {TradeQuestion} from '@/components/trade-question'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {loadMapShop,type MapProduct,type MapShopState} from './map-shop-api'
export function MapShop(){
 const {wallet,transact,loading:goldLoading,busy:goldBusy,error:goldError}=useGold()
 const [state,setState]=useState<MapShopState|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 const [pending,setPending]=useState<MapProduct|null>(null),[busy,setBusy]=useState(false),[tradeError,setTradeError]=useState('')
 const active=useRef(true),lock=useRef(false)
 useEffect(()=>{active.current=true;return()=>{active.current=false}},[])
 useEffect(()=>{let current=true;setError('');loadMapShop().then(data=>{if(current)setState(data)}).catch(()=>{if(current)setError('지도를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')});return()=>{current=false}},[attempt])
 async function buy(){
  if(!pending||lock.current)return
  lock.current=true;setBusy(true);setTradeError('')
  try{await transact({type:'buy',id:'map:'+pending.region_id,name:pending.name});if(active.current){setState(s=>s?{items:s.items.map(m=>m.region_id===pending.region_id?{...m,owned:true}:m)}:s);setPending(null)}}
  catch(cause){if(active.current)setTradeError(cause instanceof Error?cause.message:'구매하지 못했어요.')}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 const unavailable=goldLoading||goldBusy||busy||!!goldError
 return <div className="space-y-4"><p className="rounded-xl bg-muted/60 px-4 py-3 text-xs leading-5 text-muted-foreground">지도를 구매하면 새 해역이 바로 열려요. 지도는 등급 없이 해역별로 한 번만 구매해요.</p>
  {error?<div role="alert" className="space-y-2 text-sm"><p>{error}</p><Button variant="outline" onClick={()=>setAttempt(a=>a+1)}>다시 불러오기</Button></div>:!state?<p role="status" className="py-8 text-center text-sm text-muted-foreground">지도를 펼치는 중…</p>:<div className="grid gap-3 sm:grid-cols-2">{state.items.map(item=><article key={item.region_id} aria-label={item.name} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
   <div className="relative grid h-36 place-items-center bg-muted/30"><CollectibleThumbnail path={item.thumbnail_path} name={item.name} className="size-28"/>{item.owned&&<span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[11px] text-primary"><Check className="size-3"/>보유중</span>}</div>
   <div className="flex flex-1 flex-col gap-2 p-4"><h2 className="text-sm font-medium">{item.name}</h2><p className="text-xs leading-5 text-muted-foreground">{item.description}</p><Button className="mt-auto min-h-11 w-full" variant={item.owned?'secondary':'default'} disabled={unavailable||item.owned||wallet.gold<item.price} aria-label={`${item.name} 구매`} onClick={()=>{setTradeError('');setPending(item)}}>{item.owned?'보유중':<><GoldIcon className="size-4"/>{item.price.toLocaleString('ko-KR')} 구매</>}</Button></div>
  </article>)}</div>}
  <ConfirmDialog open={!!pending} onOpenChange={open=>{if(!open){setPending(null);setTradeError('')}}} title={pending?<TradeQuestion name={pending.name} price={pending.price}/>:''} description="구매 즉시 해당 해역이 해금됩니다." busy={busy} confirmDisabled={unavailable} error={tradeError} onConfirm={()=>void buy()}/>
 </div>
}
