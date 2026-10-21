import {EmptyState} from '@/components/empty-state'
import {useEffect,useRef,useState} from 'react'
import {Plus,RefreshCw,Store,ClipboardList,Search,X} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {useGold} from '@/features/gold/gold-provider'
import {useSocial} from '@/features/social/social-provider'
import {AssetView} from './asset-view'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {LandscapeImage} from '@/components/landscape-image'
import {SaleItemPicker} from './sale-item-picker'
import {SaleListingRow} from './sale-listing-row'
import {exchangeChanged,exchangeError,loadExchange,loadExchangeInventory,postExchange} from './api'
import type {ExchangeAsset,ExchangeInventory,ExchangePage as PageData,ExchangeRequest} from './api'

const gold:ExchangeAsset={kind:'gold',id:'gold',name:'골드',quantity:1,thumbnail_path:null}
const field='min-h-11 min-w-0 w-full rounded-lg border bg-background px-3 text-sm'
export function ExchangePage(){const {session}=useAuth();return <AccountExchange key={session?.user.id??'guest'} owner={session?.user.id??''}/>}
function AccountExchange({owner}:{owner:string}){
 const wallet=useGold(),social=useSocial()
 const [tab,setTab]=useState('all'),[query,setQuery]=useState(''),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0)
 const [page,setPage]=useState<PageData|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const [open,setOpen]=useState(false),[inventory,setInventory]=useState<ExchangeInventory|null>(null)
 const [title,setTitle]=useState('')
 const [offers,setOffers]=useState<ExchangeAsset[]>([]),[wanted,setWanted]=useState<ExchangeAsset>({...gold,quantity:300})
 const offer:ExchangeAsset=offers.length>1?{...offers[0],name:offers.map(a=>a.name).join(' + '),quantity:offers.reduce((sum,a)=>sum+a.quantity,0),items:offers}:offers[0]??{kind:'collectible',id:'',name:'',quantity:1,thumbnail_path:null}
 const defaultTitle=offers.length>1?`${offers[0].name} 외 ${offers.length-1}종 묶음 판매합니다`:offer.name?`${offer.name} 판매합니다`:''
 const [busy,setBusy]=useState(false),[formError,setFormError]=useState(''),[inventoryLoading,setInventoryLoading]=useState(false)
 const [postConfirm,setPostConfirm]=useState(false)
 const pending=useRef<ExchangeRequest|null>(null),lock=useRef(false),alive=useRef(true),inventoryVersion=useRef(0)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;inventoryVersion.current++}},[])
 useEffect(()=>{let current=true;setLoading(true);setPage(null);setError('');const timer=setTimeout(()=>{void loadExchange(tab,query,offset).then(data=>{if(current)setPage(data)}).catch(cause=>{if(current)setError(exchangeError(cause))}).finally(()=>{if(current)setLoading(false)})},200);return()=>{current=false;clearTimeout(timer)}},[tab,query,offset,retry])
 useEffect(()=>{const reload=()=>setRetry(v=>v+1);window.addEventListener('focus',reload);window.addEventListener('online',reload);return()=>{window.removeEventListener('focus',reload);window.removeEventListener('online',reload)}},[])
 async function loadInventory(){const version=++inventoryVersion.current;setInventoryLoading(true);setFormError('');try{const data=await loadExchangeInventory();if(alive.current&&version===inventoryVersion.current)setInventory(data)}catch(cause){if(alive.current&&version===inventoryVersion.current)setFormError(exchangeError(cause))}finally{if(alive.current&&version===inventoryVersion.current)setInventoryLoading(false)}}
 function beginPost(){setOpen(true);void loadInventory()}
 function validAsset(a:ExchangeAsset){return !!a.id&&Number.isSafeInteger(a.quantity)&&a.quantity>=1&&a.quantity<=(a.kind==='gold'?1000000000:a.kind==='collectible'?20:9999)}
 const stock=(asset:ExchangeAsset)=>inventory?.assets.find(a=>a.kind===asset.kind&&a.id===asset.id)?.available??0
 const valid=!!inventory&&!inventoryLoading&&offers.length>0&&offers.length<=10&&offers.every(a=>a.kind!=='gold'&&validAsset(a)&&stock(a)>=a.quantity)&&offers.filter(a=>a.kind==='collectible').reduce((n,a)=>n+a.quantity,0)<=20&&validAsset(wanted)
 async function mutate(){
  if(lock.current)return
  if(!pending.current&&!valid)return
  lock.current=true;setBusy(true);setFormError('')
  try{
   if(offer.kind==='gold')return
   pending.current??=offers.length>1?{p_title:title.trim()||defaultTitle,p_items:offers.map(a=>({kind:a.kind as 'bait'|'fuel'|'collectible',id:a.id,quantity:a.quantity})),p_price:wanted.quantity,p_operation_id:crypto.randomUUID()}:{p_title:title.trim()||defaultTitle,p_side:'sell',p_offer_kind:offer.kind,p_offer_id:offer.id,p_offer_quantity:offer.quantity,p_wanted_kind:'gold',p_wanted_id:'gold',p_wanted_quantity:wanted.quantity,p_operation_id:crypto.randomUUID()}
   await postExchange(pending.current)
   exchangeChanged();void wallet.refresh();void social.refresh()
   if(alive.current){pending.current=null;setOpen(false);setPostConfirm(false);setTitle('');setOffers([]);setWanted({...gold,quantity:300});setTab('mine');setQuery('');setOffset(0);setRetry(v=>v+1);toast.success('물품을 맡기고 판매 글을 등록했어요.')}
  }catch(cause){if(alive.current){if(cause&&typeof cause==='object'&&'code'in cause&&/^[0-9A-Z]{5}$/.test(String(cause.code)))pending.current=null;setFormError(exchangeError(cause))}}finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 const visibleListings=page?.items??[]
 return <section className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
  <div role="group" aria-label="거래 분류" className="segmented-control grid shrink-0 grid-cols-2 border-b border-border">{[{key:'all',label:'판매 목록',icon:Store},{key:'mine',label:'내 판매',icon:ClipboardList}].map(({key,label,icon:Icon})=><Button key={key} variant="ghost" className={`min-h-12 min-w-0 gap-2 rounded-none border-r border-border ${tab===key?'bg-secondary text-primary hover:bg-secondary':'text-muted-foreground'}`} aria-pressed={tab===key} onClick={()=>{setTab(key);setOffset(0)}}><Icon className="size-4"/>{label}</Button>)}</div>
  <div className="flex shrink-0 items-center gap-2 px-4 py-3"><div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input className={field+' pl-9'} aria-label="거래 물품 검색" placeholder="제목 또는 물품 이름으로 검색" maxLength={80} value={query} onChange={e=>{setQuery(e.target.value);setOffset(0)}}/></div><Button variant="outline" size="icon" className="min-h-11 min-w-11 shrink-0" aria-label="거래 목록 새로고침" onClick={()=>setRetry(v=>v+1)} disabled={loading}><RefreshCw className="size-4"/></Button></div>
  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4">
  {loading&&<div role="status" aria-label="거래를 불러오는 중"><span className="sr-only">거래를 불러오는 중…</span><div aria-hidden="true" className="divide-y divide-border/70">{Array.from({length:4},(_,i)=><div key={i} className="flex items-center gap-3 border-b border-border px-4 py-4 motion-safe:animate-pulse"><div className="size-14 shrink-0 rounded-lg bg-secondary"/><div className="flex-1 space-y-2"><div className="h-4 w-24 rounded bg-secondary"/><div className="h-3 w-16 rounded bg-secondary/60"/></div><div className="h-10 w-16 rounded-lg bg-secondary"/></div>)}</div></div>}
  {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>setRetry(v=>v+1)}>다시 불러오기</Button></div>}
  <ul className="divide-y divide-border/70">{visibleListings.map(listing=><SaleListingRow key={listing.id} listing={listing} owner={owner}/>)}</ul>
  {page&&!visibleListings.length&&<EmptyState>{tab==='mine'?'등록한 거래가 없어요.':'조건에 맞는 거래가 없어요.'}</EmptyState>}
  {page&&page.total>20&&<div className="flex items-center justify-between px-4"><Button variant="outline" disabled={!offset||loading} onClick={()=>setOffset(v=>Math.max(0,v-20))}>이전</Button><span className="text-xs">{offset+1}–{Math.min(offset+20,page.total)} / {page.total}</span><Button variant="outline" disabled={offset+20>=page.total||loading} onClick={()=>setOffset(v=>v+20)}>다음</Button></div>}
  </div>
  <Button className="min-h-14 w-full shrink-0 gap-2 rounded-none border-t border-border pb-[env(safe-area-inset-bottom)] text-base" onClick={beginPost} disabled={busy}><Plus className="size-5"/>판매 등록</Button>
  <Dialog open={open} onOpenChange={next=>{if(!busy){setOpen(next);if(!next)setPostConfirm(false)}}}><DialogContent className="notification-sheet bottom-0 top-auto left-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0 pt-[env(safe-area-inset-top)] sm:left-1/2 sm:max-w-[480px] sm:-translate-x-1/2">
   <div aria-hidden="true" className="mx-auto mb-1 mt-3 h-1 w-10 shrink-0 rounded-full bg-border"/><DialogHeader className="shrink-0 px-5 pb-4 pt-4"><DialogTitle className="font-normal">판매 등록</DialogTitle><DialogDescription className="text-[11px]">아쿠아리움에 있는 개체는 팔 수 없어요.</DialogDescription></DialogHeader>
   <div className="shrink-0 px-5 pb-4"><label className="flex items-center gap-3 text-xs"><span className="w-16 shrink-0 text-muted-foreground">제목 :</span><input aria-label="판매글 제목" maxLength={80} className={field} value={title} disabled={busy||!!pending.current} placeholder={defaultTitle||'판매글 제목'} onChange={e=>setTitle(e.target.value)}/></label></div>
   <div className="flex min-h-0 flex-1 flex-col px-5"><SaleItemPicker value={offers} onChange={setOffers} inventory={inventory??{gold:0,assets:[]}} loading={inventoryLoading} disabled={busy||!!pending.current||inventoryLoading}/></div>
   <div className="shrink-0 space-y-3 border-t bg-secondary/30 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
    {offers.length>0&&<ul aria-label="선택한 판매 물품" className="max-h-28 divide-y divide-border/40 overflow-y-auto overscroll-contain">{offers.map((asset,index)=><li key={`${asset.kind}:${asset.id}`} className="flex min-h-11 items-center gap-2">
     {asset.kind==='collectible'?<CollectibleThumbnail path={asset.thumbnail_path??''} name={asset.name} className="size-7 shrink-0"/>:<LandscapeImage src={asset.thumbnail_path??''} alt="" className="size-7 shrink-0 object-contain"/>}
     <span className="min-w-0 flex-1 truncate text-xs" title={asset.name}>{asset.name}</span>
     <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><span aria-hidden="true">×</span><input aria-label={offers.length===1?'판매 수량':`${asset.name} 판매 수량`} type="number" inputMode="numeric" min={1} max={Math.min(asset.kind==='collectible'?20:9999,stock(asset))} value={asset.quantity||''} disabled={busy||!!pending.current||inventoryLoading} className="h-9 w-14 rounded-md border border-border/60 bg-background px-1.5 text-center text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" onChange={e=>setOffers(items=>items.map((a,i)=>i===index?{...a,quantity:Number(e.target.value)}:a))}/></label>
     <Button variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground" disabled={busy||!!pending.current} aria-label={`${asset.name} 선택 해제`} onClick={()=>setOffers(items=>items.filter((_,i)=>i!==index))}><X aria-hidden="true" className="size-3.5"/></Button>
    </li>)}</ul>}
    <div>
     <label className="flex items-center gap-3 text-xs"><span className="w-16 shrink-0 text-muted-foreground">판매 가격 :</span><span className="relative min-w-0 flex-1"><input aria-label="판매 가격" type="number" inputMode="numeric" min={1} max={1000000000} value={wanted.quantity||''} disabled={busy||!!pending.current} className={field+' pr-12 tabular-nums'} onChange={e=>setWanted({...gold,quantity:Number(e.target.value)})}/><span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">골드</span></span></label>
    </div>
    {formError&&<p role="alert" className="text-xs text-destructive">{formError}</p>}
    {!inventory&&!inventoryLoading?<Button className="min-h-11 w-full" variant="outline" onClick={()=>void loadInventory()}>보유 물품 다시 확인</Button>:<Button className="min-h-11 w-full" disabled={busy||(!pending.current&&!valid)} onClick={()=>{if(pending.current)void mutate();else setPostConfirm(true)}}>{pending.current?'이전 등록 결과 다시 확인':'맡기고 판매 등록'}</Button>}
   </div>
  </DialogContent></Dialog>
  <ConfirmDialog illustration="sale" open={postConfirm} onOpenChange={setPostConfirm} title="이 가격으로 판매 등록할까요?" description="선택한 물품 전체를 한 번에 판매해요. 취소하면 모두 우편함으로 돌려받아요." busy={busy} error={formError} onConfirm={()=>void mutate()}><div className="max-h-[45dvh] space-y-3 overflow-y-auto"><p className="break-words text-sm font-medium">{title.trim()||defaultTitle}</p><p className="text-xs text-muted-foreground">내가 맡겨요</p><AssetView asset={offer}/><p className="text-xs text-muted-foreground">묶음 전체 가격</p><AssetView asset={wanted}/></div></ConfirmDialog>

 </section>
}
