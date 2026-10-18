import {useEffect,useRef,useState} from 'react'
import {Plus,RefreshCw,Store,ClipboardList,Search} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {useGold} from '@/features/gold/gold-provider'
import {useSocial} from '@/features/social/social-provider'
import {AssetView} from './asset-view'
import {SaleItemPicker} from './sale-item-picker'
import {SaleListingRow} from './sale-listing-row'
import {actExchange,exchangeChanged,exchangeError,loadExchange,loadExchangeInventory,postExchange} from './api'
import type {ExchangeAsset,ExchangeInventory,ExchangeListing,ExchangePage as PageData,ExchangePost} from './api'

const gold:ExchangeAsset={kind:'gold',id:'gold',name:'골드',quantity:1,thumbnail_path:null}
const field='min-h-11 min-w-0 w-full rounded-lg border bg-background px-3 text-sm'
export function ExchangePage(){const {session}=useAuth();return <AccountExchange key={session?.user.id??'guest'} owner={session?.user.id??''}/>}
function AccountExchange({owner}:{owner:string}){
 const wallet=useGold(),social=useSocial()
 const [tab,setTab]=useState('all'),[query,setQuery]=useState(''),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0)
 const [page,setPage]=useState<PageData|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const [open,setOpen]=useState(false),[inventory,setInventory]=useState<ExchangeInventory|null>(null)
 const empty:ExchangeAsset={kind:'collectible',id:'',name:'',quantity:1,thumbnail_path:null}
 const [offer,setOffer]=useState<ExchangeAsset>(empty),[wanted,setWanted]=useState<ExchangeAsset>({...gold,quantity:300})
 const [busy,setBusy]=useState(false),[formError,setFormError]=useState(''),[inventoryLoading,setInventoryLoading]=useState(false)
 const [confirm,setConfirm]=useState<{listing:ExchangeListing;action:'accept'|'cancel'}|null>(null),[postConfirm,setPostConfirm]=useState(false)
 const pending=useRef<ExchangePost|null>(null),lock=useRef(false),alive=useRef(true),inventoryVersion=useRef(0)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;inventoryVersion.current++}},[])
 useEffect(()=>{let current=true;setLoading(true);setPage(null);setError('');const timer=setTimeout(()=>{void loadExchange(tab,query,offset).then(data=>{if(current)setPage(data)}).catch(cause=>{if(current)setError(exchangeError(cause))}).finally(()=>{if(current)setLoading(false)})},200);return()=>{current=false;clearTimeout(timer)}},[tab,query,offset,retry])
 useEffect(()=>{const reload=()=>setRetry(v=>v+1);window.addEventListener('focus',reload);window.addEventListener('online',reload);return()=>{window.removeEventListener('focus',reload);window.removeEventListener('online',reload)}},[])
 async function loadInventory(){const version=++inventoryVersion.current;setInventoryLoading(true);setFormError('');try{const data=await loadExchangeInventory();if(alive.current&&version===inventoryVersion.current)setInventory(data)}catch(cause){if(alive.current&&version===inventoryVersion.current)setFormError(exchangeError(cause))}finally{if(alive.current&&version===inventoryVersion.current)setInventoryLoading(false)}}
 function beginPost(){setOpen(true);void loadInventory()}
 function validAsset(a:ExchangeAsset){return !!a.id&&Number.isSafeInteger(a.quantity)&&a.quantity>=1&&a.quantity<=(a.kind==='gold'?1000000000:a.kind==='bait'?9999:20)}
 const available=inventory?.assets.find(a=>a.kind===offer.kind&&a.id===offer.id)?.available
 const valid=!!inventory&&!inventoryLoading&&offer.kind!=='gold'&&validAsset(offer)&&validAsset(wanted)&&(available??0)>=offer.quantity&&!(offer.kind===wanted.kind&&offer.id===wanted.id)
 async function mutate(post=false){
  if(lock.current||(!post&&!confirm))return
  if(post&&!pending.current&&!valid)return
  lock.current=true;setBusy(true);setFormError('')
  try{
   if(post){if(offer.kind==='gold')return;pending.current??={p_side:'sell',p_offer_kind:offer.kind,p_offer_id:offer.id,p_offer_quantity:offer.quantity,p_wanted_kind:'gold',p_wanted_id:'gold',p_wanted_quantity:wanted.quantity,p_operation_id:crypto.randomUUID()};await postExchange(pending.current)}
   else await actExchange(confirm!.listing.id,confirm!.action)
   exchangeChanged();void wallet.refresh();void social.refresh()
   if(alive.current){if(post){pending.current=null;setOpen(false);setPostConfirm(false);setOffer(empty);setWanted({...gold,quantity:300});setTab('mine');setQuery('');setOffset(0)}setConfirm(null);setRetry(v=>v+1);toast.success(post?'물품을 맡기고 판매 글을 등록했어요.':'처리했어요. 우편함의 선물 탭에서 물품을 받아주세요.')}
  }catch(cause){if(alive.current){if(post&&cause&&typeof cause==='object'&&'code'in cause&&/^[0-9A-Z]{5}$/.test(String(cause.code)))pending.current=null;setFormError(exchangeError(cause));if(!post)setRetry(v=>v+1)}}finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const visibleListings=page?.items.filter(listing=>listing.status!=='completed')??[]
 return <section className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
  <div role="group" aria-label="거래 분류" className="grid shrink-0 grid-cols-2 border-b border-border">{[{key:'all',label:'판매 목록',icon:Store},{key:'mine',label:'내 판매',icon:ClipboardList}].map(({key,label,icon:Icon})=><Button key={key} variant="ghost" className={`min-h-12 min-w-0 gap-2 rounded-none border-r border-border ${tab===key?'bg-secondary text-primary hover:bg-secondary':'text-muted-foreground'}`} aria-pressed={tab===key} onClick={()=>{setTab(key);setOffset(0)}}><Icon className="size-4"/>{label}</Button>)}</div>
  <div className="flex shrink-0 items-center gap-2 px-4 py-3"><div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input className={field+' pl-9'} aria-label="거래 물품 검색" placeholder="물품 이름으로 검색" maxLength={80} value={query} onChange={e=>{setQuery(e.target.value);setOffset(0)}}/></div><Button variant="outline" size="icon" className="min-h-11 min-w-11 shrink-0" aria-label="거래 목록 새로고침" onClick={()=>setRetry(v=>v+1)} disabled={loading}><RefreshCw className="size-4"/></Button></div>
  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4">
  {loading&&<div role="status" aria-label="거래를 불러오는 중"><span className="sr-only">거래를 불러오는 중…</span><div aria-hidden="true" className="divide-y divide-border/70">{Array.from({length:4},(_,i)=><div key={i} className="flex items-center gap-3 border-b border-border px-4 py-4 motion-safe:animate-pulse"><div className="size-14 shrink-0 rounded-lg bg-secondary"/><div className="flex-1 space-y-2"><div className="h-4 w-24 rounded bg-secondary"/><div className="h-3 w-16 rounded bg-secondary/60"/></div><div className="h-10 w-16 rounded-lg bg-secondary"/></div>)}</div></div>}
  {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</Button></div>}
  <ul className="divide-y divide-border/70">{visibleListings.map(listing=><SaleListingRow key={listing.id} listing={listing} owner={owner} busy={busy} onAction={action=>{setFormError('');setConfirm({listing,action})}}/>)}</ul>
  {page&&!visibleListings.length&&<p className="py-10 text-center text-sm text-muted-foreground">{tab==='mine'?'등록한 거래가 없어요.':'조건에 맞는 거래가 없어요.'}</p>}
  {page&&page.total>20&&<div className="flex items-center justify-between px-4"><Button variant="outline" disabled={!offset||loading} onClick={()=>setOffset(v=>Math.max(0,v-20))}>이전</Button><span className="text-xs">{offset+1}–{Math.min(offset+20,page.total)} / {page.total}</span><Button variant="outline" disabled={offset+20>=page.total||loading} onClick={()=>setOffset(v=>v+20)}>다음</Button></div>}
  </div>
  <Button className="min-h-14 w-full shrink-0 gap-2 rounded-none border-t border-border pb-[env(safe-area-inset-bottom)] text-base" onClick={beginPost} disabled={busy}><Plus className="size-5"/>판매 등록</Button>
  <Dialog open={open} onOpenChange={next=>{if(!busy){setOpen(next);if(!next)setPostConfirm(false)}}}><DialogContent className="flex h-[min(640px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden rounded-[10px] p-0 sm:max-w-[420px]">
   <DialogHeader className="shrink-0 px-5 pb-4 pt-5"><DialogTitle className="font-normal">판매 등록</DialogTitle><DialogDescription className="text-xs">창고의 개체와 보유 미끼를 판매할 수 있어요.</DialogDescription></DialogHeader>
   <div className="flex min-h-0 flex-1 flex-col px-5"><SaleItemPicker value={offer} onChange={setOffer} inventory={inventory??{gold:0,assets:[]}} loading={inventoryLoading} disabled={busy||!!pending.current||inventoryLoading}/></div>
   <div className="shrink-0 space-y-3 border-t bg-secondary/20 px-5 pb-5 pt-3">
    <div className="flex h-14 items-center">{offer.id?<AssetView asset={offer} compact/>:<p className="text-xs text-muted-foreground">검색 결과에서 판매할 물품을 선택해주세요.</p>}</div>
    <div className="grid grid-cols-2 gap-3">
     <label className="space-y-1.5 text-xs text-muted-foreground"><span>판매 수량</span><input aria-label="판매 수량" type="number" inputMode="numeric" min={1} max={Math.min(offer.kind==='bait'?9999:20,available??0)} value={offer.quantity||''} disabled={!offer.id||busy||!!pending.current||inventoryLoading} className={field} onChange={e=>setOffer({...offer,quantity:Number(e.target.value)})}/></label>
     <label className="space-y-1.5 text-xs text-muted-foreground"><span>전체 가격 · 골드</span><input aria-label="판매 가격" type="number" inputMode="numeric" min={1} max={1000000000} value={wanted.quantity||''} disabled={busy||!!pending.current} className={field} onChange={e=>setWanted({...gold,quantity:Number(e.target.value)})}/></label>
    </div>
    <div className="flex h-9 items-center overflow-y-auto">{formError?<p role="alert" className="text-xs text-destructive">{formError}</p>:<p className="text-[11px] text-muted-foreground">수수료 없음 · 묶음 판매</p>}</div>
    {!inventory&&!inventoryLoading?<Button className="min-h-11 w-full" variant="outline" onClick={()=>void loadInventory()}>보유 물품 다시 확인</Button>:<Button className="min-h-11 w-full" disabled={busy||(!pending.current&&!valid)} onClick={()=>{if(pending.current)void mutate(true);else setPostConfirm(true)}}>{pending.current?'이전 등록 결과 다시 확인':'맡기고 판매 등록'}</Button>}
   </div>
  </DialogContent></Dialog>
  <ConfirmDialog open={postConfirm} onOpenChange={setPostConfirm} title="이 가격으로 판매 등록할까요?" description="맡긴 물품은 거래 중 사용할 수 없어요. 취소하면 우편함으로 돌려받아요." busy={busy} error={formError} onConfirm={()=>void mutate(true)}><div className="space-y-3"><p className="text-xs text-muted-foreground">내가 맡겨요</p><AssetView asset={offer}/><p className="text-xs text-muted-foreground">내가 받아요</p><AssetView asset={wanted}/></div></ConfirmDialog>
  <ConfirmDialog open={!!confirm} onOpenChange={next=>{if(!next)setConfirm(null)}} title={confirm?.action==='cancel'?'판매 등록을 취소할까요?':'이 가격에 구매할까요?'} description={confirm?.action==='cancel'?'맡긴 물품을 우편함으로 돌려보내요.':'골드를 지불하면 구매가 완료돼요. 상품과 판매 대금은 각각 우편함으로 배송되며 성사 알림이 도착해요.'} busy={busy} error={formError} onConfirm={()=>void mutate()}>{confirm&&<div className="space-y-3">{confirm.action==='accept'&&<><p className="text-xs text-muted-foreground">내가 보내요</p><AssetView asset={confirm.listing.wanted}/></>}<p className="text-xs text-muted-foreground">내가 받아요</p><AssetView asset={confirm.listing.offer}/></div>}</ConfirmDialog>
 </section>
}
