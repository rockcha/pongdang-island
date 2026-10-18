import {useEffect,useRef,useState} from 'react'
import {Plus,RefreshCw,Clock3} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {useSocial} from '@/features/social/social-provider'
import {SaleItemPicker} from '@/features/exchange/sale-item-picker'
import {AssetView} from '@/features/exchange/asset-view'
import {exchangeChanged,loadExchangeInventory} from '@/features/exchange/api'
import type {ExchangeAsset,ExchangeInventory} from '@/features/exchange/api'
import {auctionError,bidAuction,cancelAuction,loadAuctions,postAuction} from './api'
import type {Auction,AuctionFeed,AuctionPost} from './api'

const field='min-h-11 min-w-0 w-full rounded-lg border bg-background px-3 text-sm text-foreground'
const empty:ExchangeAsset={kind:'collectible',id:'',name:'',quantity:1,thumbnail_path:null}
const statusLabels={active:'진행 중',sold:'낙찰 완료',unsold:'유찰 · 물품 반환',cancelled:'취소 · 물품 반환'}
export function AuctionPage(){const {session}=useAuth();return <AccountAuctions key={session?.user.id??'guest'} owner={session?.user.id??''}/>}
function AccountAuctions({owner}:{owner:string}){
 const wallet=useGold(),social=useSocial()
 const [tab,setTab]=useState('all'),[query,setQuery]=useState(''),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0),[feed,setFeed]=useState<AuctionFeed|null>(null),[error,setError]=useState('')
 const [now,setNow]=useState(Date.now()),serverOffset=useRef(0)
 const [open,setOpen]=useState(false),[inventory,setInventory]=useState<ExchangeInventory|null>(null),[inventoryLoading,setInventoryLoading]=useState(false)
 const [offer,setOffer]=useState<ExchangeAsset>(empty),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[price,setPrice]=useState(300),[days,setDays]=useState<1|3|7>(1)
 const [selected,setSelected]=useState<Auction|null>(null),[amount,setAmount]=useState(0),[cancel,setCancel]=useState<Auction|null>(null),[confirmPost,setConfirmPost]=useState(false)
 const [busy,setBusy]=useState(false),[actionError,setActionError]=useState('')
 const lock=useRef(false),alive=useRef(true),inventoryVersion=useRef(0),postPending=useRef<AuctionPost|null>(null),bidPending=useRef<{id:string;amount:number;operation:string}|null>(null)
 useEffect(()=>{alive.current=true;const refresh=()=>setRetry(v=>v+1);const timer=setInterval(()=>{setNow(Date.now()+serverOffset.current);if(document.visibilityState==='visible'&&!lock.current)refresh()},30000);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);return()=>{alive.current=false;inventoryVersion.current++;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh)}},[])
 useEffect(()=>{let active=true;setError('');const timer=setTimeout(()=>{void loadAuctions(tab,query,offset).then(data=>{if(active){setFeed(data);serverOffset.current=new Date(data.serverNow).getTime()-Date.now();setNow(Date.now()+serverOffset.current);void social.refresh()}}).catch(cause=>{if(active)setError(auctionError(cause))})},200);return()=>{active=false;clearTimeout(timer)}},[tab,query,offset,retry]) // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(feed)setSelected(current=>current?(feed.items.find(item=>item.id===current.id)??current):null)},[feed])
 async function beginPost(){setOpen(true);setActionError('');setInventoryLoading(true);const version=++inventoryVersion.current;try{const next=await loadExchangeInventory();if(alive.current&&version===inventoryVersion.current)setInventory(next)}catch(cause){if(alive.current&&version===inventoryVersion.current)setActionError(auctionError(cause))}finally{if(alive.current&&version===inventoryVersion.current)setInventoryLoading(false)}}
 function choose(asset:ExchangeAsset){setOffer(asset);if(!title)setTitle(`${asset.name} 경매`.slice(0,60))}
 const available=inventory?.assets.find(a=>a.kind===offer.kind&&a.id===offer.id)?.available??0
 const valid=offer.id&&offer.kind!=='gold'&&Number.isSafeInteger(offer.quantity)&&offer.quantity>0&&offer.quantity<=Math.min(available,offer.kind==='bait'?9999:20)&&title.trim().length>=2&&title.trim().length<=60&&description.length<=1000&&Number.isSafeInteger(price)&&price>0&&price<=1000000000
 const minimum=selected?Math.max(selected.minimum_price,selected.highest_amount+1):1
 const bidCost=selected?.highest_bidder===owner?amount-selected.highest_amount:amount
 const validBid=!!selected&&selected.status==='active'&&new Date(selected.ends_at).getTime()>now&&Number.isSafeInteger(amount)&&amount>=minimum&&amount<=1000000000&&bidCost<=wallet.wallet.gold&&!wallet.loading&&!wallet.error
 async function mutate(kind:'post'|'bid'|'cancel'){
  if(lock.current)return
  if(kind==='post'&&!postPending.current&&!valid||kind==='bid'&&!bidPending.current&&!validBid||kind==='cancel'&&!cancel)return
  lock.current=true;setBusy(true);setActionError('')
  try{
   if(kind==='post'){
    if(offer.kind==='gold')return
    postPending.current??={p_kind:offer.kind,p_item_id:offer.id,p_quantity:offer.quantity,p_title:title,p_description:description,p_minimum_price:price,p_days:days,p_operation_id:crypto.randomUUID()}
    await postAuction(postPending.current)
   }else if(kind==='bid'){
    bidPending.current??={id:selected!.id,amount,operation:crypto.randomUUID()}
    await bidAuction(bidPending.current.id,bidPending.current.amount,bidPending.current.operation)
   }else await cancelAuction(cancel!.id)
   exchangeChanged();void wallet.refresh();void social.refresh()
   if(alive.current){if(kind==='post'){postPending.current=null;setOpen(false);setConfirmPost(false);setOffer(empty);setTitle('');setDescription('');setPrice(300);setDays(1);setTab('mine');setQuery('');setOffset(0)}else if(kind==='bid'){bidPending.current=null;setSelected(null)}else setCancel(null);setRetry(v=>v+1);toast.success(kind==='post'?'물품을 맡기고 경매를 등록했어요.':kind==='bid'?'입찰금을 맡기고 입찰했어요.':'맡긴 물품을 선물함으로 돌려보냈어요.')}
  }catch(cause){if(alive.current){if(cause&&typeof cause==='object'&&'code'in cause&&/^[0-9A-Z]{5}$/.test(String(cause.code))){if(kind==='post')postPending.current=null;else if(kind==='bid')bidPending.current=null}setActionError(auctionError(cause));setRetry(v=>v+1)}}finally{lock.current=false;if(alive.current)setBusy(false)}
 }
 function openBid(a:Auction){if(bidPending.current&&bidPending.current.id!==a.id){toast.error('이전 입찰의 결과부터 확인해주세요.');return}setActionError('');setSelected(a);setAmount(bidPending.current?.amount??Math.max(a.minimum_price,a.highest_amount+1))}
 return <section className="min-w-0 w-full space-y-4 py-5">
  <div className="flex justify-end gap-2"><Button variant="ghost" size="icon" aria-label="경매 새로고침" onClick={()=>setRetry(v=>v+1)}><RefreshCw className="size-4"/></Button><Button onClick={()=>void beginPost()}><Plus className="size-4"/>경매 등록</Button></div>
  <div role="group" aria-label="경매 분류" className="grid grid-cols-3 gap-2">{[['all','경매 목록'],['mine','내 경매'],['bids','내 입찰']].map(([key,label])=><Button key={key} className="min-w-0 px-2 text-xs" variant={tab===key?'default':'outline'} aria-pressed={tab===key} onClick={()=>{setTab(key);setOffset(0);setFeed(null)}}>{label}</Button>)}</div>
  <input className={field} aria-label="경매 검색" placeholder="물품이나 경매 제목 검색" maxLength={80} value={query} onChange={e=>{setQuery(e.target.value);setOffset(0)}}/>
  {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}{!feed&&!error&&<p role="status" className="py-8 text-center text-sm">경매를 불러오는 중…</p>}
  <ul className="divide-y">{feed?.items.map(a=>{const ended=a.status!=='active'||new Date(a.ends_at).getTime()<=now,mine=a.owner_id===owner;return <li key={a.id} className="space-y-3 py-4">
   <div className="flex items-start justify-between gap-3"><div className="min-w-0 space-y-1"><h2 className="break-words text-sm font-normal">{a.title}</h2><p className="text-[11px] text-muted-foreground">{a.owner_name}{a.highest_bidder===owner?' · 내가 최고 입찰자':''}</p></div><span className="shrink-0 text-[11px] text-muted-foreground">{statusLabels[a.status]}</span></div>
   <div className="flex items-center justify-between gap-3"><AssetView asset={a.offer}/><div className="text-right"><p className="mb-1 text-[11px] text-muted-foreground">{a.highest_amount?'최고 입찰가':'최저 입찰가'}</p><p className="flex items-center justify-end gap-1 tabular-nums text-primary"><GoldIcon className="size-4"/>{(a.highest_amount||a.minimum_price).toLocaleString('ko-KR')}</p></div></div>
   {a.description&&<p className="line-clamp-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{a.description}</p>}
   <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="size-3"/>{a.status!=='active'?statusLabels[a.status]:ended?'마감 정산 중':`${new Date(a.ends_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} 마감`}</p>{!ended&&(mine?<Button variant="ghost" disabled={busy||a.highest_amount>0} onClick={()=>{setActionError('');setCancel(a)}}>{a.highest_amount?'입찰 진행 중':'등록 취소'}</Button>:<Button variant="outline" disabled={busy||a.highest_amount>=1000000000} onClick={()=>openBid(a)}>입찰하기</Button>)}</div>
  </li>})}</ul>
  {feed&&!feed.items.length&&<p className="py-10 text-center text-sm text-muted-foreground">표시할 경매가 없어요.</p>}
  {feed&&feed.total>20&&<div className="flex items-center justify-between"><Button variant="outline" disabled={!offset} onClick={()=>setOffset(v=>v-20)}>이전</Button><span className="text-xs">{offset+1}–{Math.min(offset+20,feed.total)} / {feed.total}</span><Button variant="outline" disabled={offset+20>=feed.total} onClick={()=>setOffset(v=>v+20)}>다음</Button></div>}
  <Dialog open={open} onOpenChange={next=>{if(!busy){setOpen(next);if(!next)setConfirmPost(false)}}}><DialogContent className="flex h-[min(760px,calc(100dvh-2rem))] flex-col gap-3 overflow-hidden rounded-[10px] sm:max-w-[420px]">
   <DialogHeader className="shrink-0"><DialogTitle className="font-normal">경매 등록</DialogTitle><DialogDescription className="text-xs">물품을 맡기고 최저가와 기간을 정해주세요.</DialogDescription></DialogHeader>
   <div className="shrink-0 space-y-2"><input aria-label="경매 제목" placeholder="경매 제목 (2~60자)" maxLength={60} className={field} value={title} disabled={busy||!!postPending.current} onChange={e=>setTitle(e.target.value)}/><textarea aria-label="경매 설명" placeholder="물품 설명을 적어주세요 (선택)" maxLength={1000} rows={2} className={`${field} resize-none py-2`} value={description} disabled={busy||!!postPending.current} onChange={e=>setDescription(e.target.value)}/></div>
   <div className="flex min-h-0 flex-1 flex-col"><SaleItemPicker value={offer} onChange={choose} inventory={inventory??{gold:0,assets:[]}} loading={inventoryLoading} disabled={busy||inventoryLoading||!!postPending.current}/></div>
   <div className="shrink-0 space-y-2 border-t pt-3"><div className="flex h-10 items-center">{offer.id?<AssetView asset={offer} compact/>:<p className="text-xs text-muted-foreground">검색 결과에서 물품을 선택해주세요.</p>}</div>
    <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-xs text-muted-foreground">수량<input aria-label="경매 수량" type="number" inputMode="numeric" min={1} max={Math.min(available,offer.kind==='bait'?9999:20)} className={field} value={offer.quantity||''} disabled={!offer.id||busy||!!postPending.current} onChange={e=>setOffer({...offer,quantity:Number(e.target.value)})}/></label><label className="space-y-1 text-xs text-muted-foreground">최저가 · 골드<input aria-label="최저 입찰가" type="number" inputMode="numeric" min={1} max={1000000000} className={field} value={price||''} disabled={busy||!!postPending.current} onChange={e=>setPrice(Number(e.target.value))}/></label></div>
    <div role="group" aria-label="경매 기간" className="grid grid-cols-3 gap-2">{([1,3,7] as const).map(day=><Button key={day} variant={days===day?'default':'outline'} disabled={busy||!!postPending.current} aria-pressed={days===day} onClick={()=>setDays(day)}>{day}일</Button>)}</div>
    <div className="flex h-8 items-center overflow-y-auto">{actionError?<p role="alert" className="text-xs text-destructive">{actionError}</p>:<p className="text-[11px] text-muted-foreground">입찰 시작 후 취소 불가 · 유찰 물품은 선물함 반환</p>}</div>
    {!inventory&&!inventoryLoading?<Button className="w-full" variant="outline" onClick={()=>void beginPost()}>물품 다시 불러오기</Button>:<Button className="min-h-11 w-full" disabled={busy||inventoryLoading||(!postPending.current&&!valid)} onClick={()=>postPending.current?void mutate('post'):setConfirmPost(true)}>{postPending.current?'이전 등록 결과 확인':'맡기고 경매 등록'}</Button>}
   </div>
  </DialogContent></Dialog>
  <ConfirmDialog open={confirmPost} onOpenChange={setConfirmPost} title="이 조건으로 경매를 등록할까요?" description={`${days}일 동안 진행해요. 첫 입찰 후에는 취소할 수 없어요.`} busy={busy} error={actionError} onConfirm={()=>void mutate('post')}><AssetView asset={offer}/><p className="mt-2 text-sm">최저 {price.toLocaleString('ko-KR')}골드</p></ConfirmDialog>
  <ConfirmDialog open={!!selected} onOpenChange={next=>{if(!next)setSelected(null)}} title={selected?.title??'입찰하기'} description="입찰금을 맡겨요. 더 높은 입찰이 들어오면 전액을 선물함으로 돌려보내요." busy={busy} error={actionError} confirmDisabled={!bidPending.current&&!validBid} onConfirm={()=>void mutate('bid')}>
   {selected&&<div className="space-y-3"><AssetView asset={selected.offer}/>{selected.description&&<p className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{selected.description}</p>}<p className="text-xs text-muted-foreground">{minimum>1000000000?'최고 입찰 한도에 도달했어요.':`최소 ${minimum.toLocaleString('ko-KR')}골드부터 입찰할 수 있어요.`}</p><label className="block space-y-1 text-xs">입찰 금액<input aria-label="입찰 금액" type="number" inputMode="numeric" className={field} min={minimum} max={1000000000} value={amount||''} disabled={busy||!!bidPending.current} onChange={e=>setAmount(Number(e.target.value))}/></label><p className="text-xs text-muted-foreground">{selected.highest_bidder===owner?`추가로 맡길 금액 ${Math.max(0,bidCost).toLocaleString('ko-KR')}골드`:`맡길 금액 ${amount.toLocaleString('ko-KR')}골드`} · 보유 {wallet.wallet.gold.toLocaleString('ko-KR')}골드</p></div>}
  </ConfirmDialog>
  <ConfirmDialog open={!!cancel} onOpenChange={next=>{if(!next)setCancel(null)}} title="경매를 취소할까요?" description="맡긴 물품은 선물함으로 반환해요." busy={busy} error={actionError} onConfirm={()=>void mutate('cancel')}/>
 </section>
}
