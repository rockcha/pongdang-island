import {ShopSalePrice} from '@/features/exchange/shop-sale-price'
import {useEffect,useState} from 'react'
import {Plus,RefreshCw,Search,Check,X,ShoppingBasket,HandCoins} from 'lucide-react'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {GoldIcon} from '@/features/gold/gold-provider'
import {useAccountResource,useAccountState} from '@/lib/account-query'
import {IslandSelect} from '@/components/island-select'
import {BoardTime} from '@/features/board/board-time'
import {readFleaComparison,fleaAssetKey} from './comparison'
import {PlayerVisitMenu} from '@/features/profile/player-visit-menu'
import type {ExchangeAsset} from '@/features/exchange/api'
import {cancelFlea,fleaError,postFlea,readFlea,readFleaInventory,tradeFlea,type FleaPost,type FleaDraft,type FleaTrade} from './api'
import {useFleaMutation} from './use-flea-mutation'

const number=(value:number)=>value.toLocaleString('ko-KR')
function quantityWithin(value:string,limit:number){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(Math.floor(n),Math.max(0,limit))):0}
const field='h-11 min-w-0 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'
const kinds=[['all','전체'],['fish','물고기'],['decoration','장식물'],['trash','쓰레기'],['fuel','연료']] as const
function Picture({asset,compact=false,large=false}:{asset:ExchangeAsset;compact?:boolean;large?:boolean}){const size=compact?'size-7':large?'size-12':'size-9';return asset.kind==='collectible'?<CollectibleThumbnail path={asset.thumbnail_path??''} name={asset.name} className={`${size} shrink-0`}/>:<img src={asset.thumbnail_path??'/app-icons/fuel.png'} alt="" className={`${size} shrink-0 object-contain`}/>}
function Amount({value}:{value:number}){return <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums"><GoldIcon className="size-4"/>{number(value)}</span>}
function ListingOwner({post,owner,expanded=false}:{post:FleaPost;owner:string;expanded?:boolean}){
 return <div className="flex min-w-0 items-center gap-2"><PlayerVisitMenu userId={post.owner_id} nickname={post.owner_name} avatarPath={post.owner_avatar_path} mine={post.owner_id===owner} avatarClassName="size-8"/><div className="min-w-0 max-w-[34%] shrink-0"><p className="truncate text-xs font-medium">{post.owner_name}{post.owner_id===owner&&<span className="ml-1 text-[10px] font-normal text-muted-foreground">내 글</span>}</p><p className="mt-0.5 text-[10px] text-muted-foreground"><BoardTime value={post.created_at}/>{post.status!=='active'&&` · ${post.status==='completed'?'거래 완료':'마감'}`}</p></div><p title={post.title} className={`min-w-0 flex-1 border-l border-border/60 pl-3 text-xs leading-5 ${expanded?'break-words':'truncate'}`}>{post.title}</p></div>
}
function ListingItem({item,side}:{item:FleaPost['items'][number];side:FleaPost['side']}){
 const shop=item.asset.sell_price
 const comparable=item.asset.kind==='collectible'&&!item.asset.items?.length&&shop!=null&&Number.isFinite(shop)&&shop>=0
 const difference=comparable?(side==='buy'?item.unit_price-shop:shop-item.unit_price):null
 return <div className={`flex items-start gap-3 ${item.remaining<=0?'opacity-40 grayscale':''}`}><Picture asset={item.asset} large/><div className="min-w-0 flex-1">
  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-semibold leading-5"><span className="min-w-0 break-words">{item.asset.name}</span><span aria-label={`수량 ${number(item.remaining)}개`} className="shrink-0 whitespace-nowrap text-base font-bold tabular-nums text-primary">× {number(item.remaining)}</span></p>
  <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><p className="flex items-center gap-1.5"><span className="text-[10px] text-muted-foreground">개당</span><span className="text-sm font-semibold text-primary"><Amount value={item.unit_price}/></span></p>
   {difference!=null&&<p title={side==='buy'?'상점에 판매하는 것과 비교한 개당 차익':'구매 후 상점에 되팔 때의 개당 차익'} aria-label={`개당 ${number(Math.abs(difference))}골드 ${difference>0?'이익':difference<0?'손해':'차이 없음'}`} className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] leading-5 ${difference>0?'text-emerald-700 dark:text-emerald-400':difference<0?'text-destructive':'text-muted-foreground'}`}>
    <span>개당</span><Amount value={Math.abs(difference)}/><span>{difference>0?'이익':difference<0?'손해':'차이 없음'}</span>
   </p>}
  </div>
 </div></div>
}

export function FleaMarketPage(){const {session}=useAuth();return <Market key={session?.user.id??'guest'} owner={session?.user.id??''}/>}
function Market({owner}:{owner:string}){
 const [side,setSide]=useState<'sell'|'buy'>('sell'),[search,setSearch]=useState(''),[query,setQuery]=useState(''),[mine,setMine]=useState(false),[offset,setOffset]=useState(0)
 const [comparisonAsset,setComparisonAsset]=useState<ExchangeAsset|null>(null),[sort,setSort]=useState<'latest'|'low'|'high'>('latest')
 const [sellable,setSellable]=useState(false)
 const comparison=comparisonAsset?fleaAssetKey(comparisonAsset):''
 const [compose,setCompose]=useState(false),[composeOpen,setComposeOpen]=useState(false),[selectedOpen,setSelectedOpen]=useState(false),[selected,setSelected]=useState<FleaPost|null>(null)
 useEffect(()=>{const timer=setTimeout(()=>{setQuery(search.trim());setOffset(0)},250);return()=>clearTimeout(timer)},[search])
 const filter={side,query,kind:'all',mine,offset,sellable}
 const [data,setFeed,feedQuery]=useAccountState(['flea',side,query,'all',mine,comparison?0:offset,comparison,sort,sellable],signal=>comparison?readFleaComparison(filter,comparison,sort,signal):readFlea(filter,signal))
 const feed={...feedQuery,data}
 const activePosts=feed.data?.items.filter(post=>post.status==='active')??[]
 const candidates=Array.from(new Map<string,ExchangeAsset>([...activePosts.flatMap(post=>post.items).filter(item=>item.remaining>0&&item.asset.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(item=>[fleaAssetKey(item.asset),item.asset] as const),...(comparisonAsset?[[fleaAssetKey(comparisonAsset),comparisonAsset] as const]:[])]).values())
 const selectedPost=feed.data?.items.find(p=>p.id===selected?.id)??selected
 return <section className="flex min-h-0 min-w-0 w-full flex-1 flex-col">
  <div className="shrink-0 border-b border-border/60 bg-background">
   <Tabs value={side} onValueChange={v=>{setSide(v as 'sell'|'buy');setSellable(false);setOffset(0)}}>
    <TabsList aria-label="벼룩시장 거래 종류" className="w-full rounded-none border-0 bg-transparent p-0"><TabsTrigger value="sell" className="min-h-14 flex-1 gap-2 rounded-none border-r border-border/60 bg-background text-sm last:border-r-0 data-active:bg-secondary data-active:text-primary data-active:shadow-none"><ShoppingBasket className="size-4"/>팔아요</TabsTrigger><TabsTrigger value="buy" className="min-h-14 flex-1 gap-2 rounded-none border-r border-border/60 bg-background text-sm last:border-r-0 data-active:bg-secondary data-active:text-primary data-active:shadow-none"><HandCoins className="size-4"/>사요</TabsTrigger></TabsList>
   </Tabs>
   <div className="space-y-2 p-3"><div className="flex gap-2"><label className="relative min-w-0 flex-1"><Search aria-hidden="true" className="absolute left-3 top-3.5 size-4 text-muted-foreground"/><input className={`${field} w-full pl-9`} type="search" aria-label="벼룩시장 검색" placeholder="글 제목이나 물품 이름 검색" maxLength={80} value={search} onChange={e=>{setSearch(e.target.value);setComparisonAsset(null);setSort('latest')}}/></label><label className="flex min-h-11 shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={mine} onChange={e=>{setMine(e.target.checked);setSellable(false);setOffset(0)}} className="accent-primary"/>내 글</label><Button variant="ghost" size="icon" aria-label="벼룩시장 새로고침" disabled={feed.isFetching} onClick={()=>void feed.refetch()}><RefreshCw className={`size-4 ${feed.isFetching?'motion-safe:animate-spin':''}`}/></Button></div>
   {side==='buy'&&<label className="flex min-h-9 items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={sellable} onChange={e=>{setSellable(e.target.checked);if(e.target.checked)setMine(false);setComparisonAsset(null);setSort('latest');setOffset(0)}} className="accent-primary"/>내가 판매 가능한 글만</label>}
   {query&&candidates.length>0&&<div className="grid grid-cols-2 gap-2"><IslandSelect label="가격 비교 물품" value={comparison} onChange={key=>{setComparisonAsset(candidates.find(asset=>fleaAssetKey(asset)===key)??null);setSort('latest');setOffset(0)}} options={[{value:'',label:'물품 가격 비교'},...candidates.map(asset=>({value:fleaAssetKey(asset),label:asset.name,icon:<Picture asset={asset} compact/>}))]}/><IslandSelect label="벼룩시장 정렬" value={sort} onChange={value=>{setSort(value);setOffset(0)}} disabled={!comparison} options={[{value:'latest',label:'최신순'},{value:'low',label:'낮은 가격순'},{value:'high',label:'높은 가격순'}]}/></div>}
   </div>
  </div>
  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3" aria-busy={feed.isFetching}>
   {feed.error&&<div role="alert" className="rounded-xl border p-4 text-sm"><p>{fleaError(feed.error)}</p><Button variant="ghost" onClick={()=>void feed.refetch()}>다시 불러오기</Button></div>}
   {!feed.data&&feed.isPending?<p role="status" className="py-16 text-center text-sm text-muted-foreground">이웃의 가게를 둘러보는 중…</p>:feed.data&&activePosts.length===0?<div className="py-16 text-center"><ShoppingBasket className="mx-auto mb-3 size-8 text-primary/50"/><p className="text-sm">{sellable?'지금 판매할 수 있는 구매글이 없어요.':query?'검색한 물품이 없어요.':mine?'등록한 글이 없어요.':'아직 열린 가게가 없어요.'}</p><p className="mt-2 text-xs text-muted-foreground">{side==='sell'?'남는 물건을 이웃과 나눠보세요.':'필요한 물건을 구해보세요.'}</p></div>:(comparison?activePosts.slice(offset,offset+20):activePosts).map(post=><article key={post.id} className="relative block w-full rounded-xl border border-border/60 bg-card px-3 py-3 text-left transition-colors hover:border-primary/40 focus-within:ring-2 focus-within:ring-ring">
    <button type="button" aria-label={`${post.title} 상세 보기`} onClick={()=>{setSelected(post);setSelectedOpen(true)}} className="absolute inset-0 rounded-xl outline-none"/>
    <div className="pointer-events-none">
     <ListingOwner post={post} owner={owner}/>
     <ul className="mt-3 space-y-4">{[...post.items].sort((a,b)=>Number(b.asset.name.includes(query))-Number(a.asset.name.includes(query))).slice(0,2).map(item=><li key={item.id}><ListingItem item={item} side={post.side}/></li>)}</ul>
     {post.items.length>2&&<p className="mt-2 text-[11px] text-muted-foreground">외 {post.items.length-2}종</p>}
    </div>
   </article>)}
   {feed.data&&feed.data.total>20&&<div className="flex items-center justify-center gap-3 py-2"><Button variant="ghost" disabled={offset===0} onClick={()=>setOffset(v=>Math.max(0,v-20))}>이전</Button><span className="text-xs tabular-nums">{offset/20+1} / {Math.ceil(feed.data.total/20)}</span><Button variant="ghost" disabled={offset+20>=feed.data.total} onClick={()=>setOffset(v=>v+20)}>다음</Button></div>}
  </div>
  <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"><p className="text-[11px] text-muted-foreground">필요한 만큼, 이웃과 거래해요.</p><Button className="min-h-11 gap-1.5 rounded-xl" onClick={()=>{setCompose(true);setComposeOpen(true)}}><Plus className="size-4"/>글쓰기</Button></div>
  {compose&&<Composer side={side} open={composeOpen} onClose={()=>setComposeOpen(false)} onExited={()=>setCompose(false)}/>}
  {selectedPost&&<TradeDialog key={selectedPost.id} post={selectedPost} owner={owner} open={selectedOpen} onClose={()=>setSelectedOpen(false)} onExited={()=>setSelected(null)} onUpdate={result=>{setSelected(result);setFeed(current=>current?{...current,items:current.items.flatMap(item=>item.id===result.id?(result.status==='active'?[result]:[]):[item]),total:Math.max(0,current.total-(result.status!=='active'&&current.items.some(item=>item.id===result.id)?1:0))}:current)}}/>}
 </section>
}

type DraftItem={asset:ExchangeAsset;quantity:number;price:number}
function Composer({side,open,onClose,onExited}:{side:'sell'|'buy';open:boolean;onClose:()=>void;onExited:()=>void}){
 const compactField=field.replace('h-11','h-9').replace('px-3','px-1')+' [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
 const stock=useAccountResource('flea-inventory',readFleaInventory)
 const [title,setTitle]=useState(''),[query,setQuery]=useState(''),[kind,setKind]=useState('all'),[items,setItems]=useState<DraftItem[]>([])
 const mutation=useFleaMutation(postFlea),frozen=mutation.busy||mutation.pending
 const assets=(stock.data?.assets??[]).filter(a=>a.kind==='fuel'||a.kind==='collectible')
 const results=assets.filter(a=>(side==='buy'||(a.available??0)>0)&&(kind==='all'||a.kind===kind||a.subtype===kind)&&a.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
 const total=items.reduce((n,item)=>n+item.quantity*item.price,0)
 const collectibleCount=items.filter(i=>i.asset.kind==='collectible').reduce((n,i)=>n+i.quantity,0)
 const max=(a:ExchangeAsset)=>Math.min(a.kind==='collectible'?100:9999,side==='buy'?9999:(stock.data?.assets.find(item=>item.kind===a.kind&&item.id===a.id)?.available??0))
 const validationMessage=!title.trim()?'글 제목을 입력해주세요.':items.length===0?'등록할 물품을 선택해주세요.':items.length>5?'한 글에는 최대 5종까지 선택할 수 있어요.':collectibleCount>100?`물고기·쓰레기·장식물은 합계 100개까지 등록할 수 있어요. 현재 ${number(collectibleCount)}개예요.`:!items.every(i=>Number.isSafeInteger(i.quantity)&&i.quantity>=1&&i.quantity<=max(i.asset))?'물품 수량을 확인해주세요.':!items.every(i=>Number.isSafeInteger(i.price)&&i.price>=1&&i.price<=1000000000)?'개당 가격은 1~1,000,000,000골드 사이의 정수로 입력해주세요.':total>1000000000?'한 글의 총 거래 금액은 1,000,000,000골드까지예요.':side==='buy'&&total>(stock.data?.gold??0)?`맡길 구매대금이 보유 골드보다 ${number(total-(stock.data?.gold??0))}골드 많아요.`:''
 const valid=!validationMessage
 async function submit(){const args:FleaDraft={p_side:side,p_title:title.trim(),p_items:items.map(i=>({kind:i.asset.kind as 'fuel'|'collectible',id:i.asset.id,quantity:i.quantity,unit_price:i.price})),p_operation_id:crypto.randomUUID()};if(await mutation.run(args))onClose()}
 function update(index:number,patch:Partial<DraftItem>){setItems(list=>list.map((item,i)=>i===index?{...item,...patch}:item))}
 return <Dialog open={open} onOpenChange={next=>{if(!next&&!frozen)onClose()}} onOpenChangeComplete={next=>{if(!next&&!open)onExited()}}><DialogContent className="flex h-[min(760px,90dvh)] w-[calc(100%-2rem)] min-w-0 max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md" showCloseButton={!frozen}>
  <DialogHeader className="shrink-0 px-4 pt-4 pb-3 pr-12"><div className="flex items-center gap-2">{side==='sell'?<ShoppingBasket className="size-5 text-primary"/>:<HandCoins className="size-5 text-primary"/>}<DialogTitle className="text-base font-normal">{side==='sell'?'내 가게 열기':'구매 요청하기'}</DialogTitle></div><DialogDescription className="text-xs [@media(max-height:620px)]:sr-only">{side==='sell'?'물건과 개당 가격을 정해 가게를 열어요.':'구할 물건과 개당 가격을 정해요.'}</DialogDescription></DialogHeader>
  <div className="shrink-0 space-y-2 border-b px-4 py-2.5">
   <label className="flex items-center gap-2 text-xs"><span className="shrink-0 text-muted-foreground">제목</span><input aria-label="글 제목" className={`${field} h-10 w-full`} maxLength={80} value={title} disabled={frozen} placeholder={side==='sell'?'가게 이름이나 판매할 물건':'어떤 물건을 구하시나요?'} onChange={e=>setTitle(e.target.value)}/></label>
   <div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground"/><input type="search" aria-label="추가할 물품 검색" placeholder="물품 이름 검색" className={`${field} h-10 w-full pl-9`} maxLength={80} value={query} disabled={frozen} onChange={e=>setQuery(e.target.value)}/></div>
   <div role="group" aria-label="추가할 물품 분류" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">{kinds.map(([id,label])=><button key={id} disabled={frozen} aria-pressed={kind===id} onClick={()=>setKind(id)} className={`min-h-8 shrink-0 rounded-full px-2.5 text-xs ${kind===id?'bg-secondary text-primary':'text-muted-foreground'}`}>{label}</button>)}</div>
  </div>
  {items.length>0&&<section aria-label="선택한 물품" className="flex max-h-[min(12rem,22dvh)] shrink-0 flex-col border-b bg-secondary/20 px-4">
   <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_3rem_4.5rem_1.75rem] items-center gap-1.5 py-2 text-[10px] text-muted-foreground"><h3>선택 {items.length} / 5종 · 개체 {number(collectibleCount)} / 100개</h3><span className="text-center">수량</span><span className="text-center">개당 가격</span><span/></div>
   <div className="min-h-0 overflow-y-auto overscroll-contain pb-1">{items.map((item,index)=><div key={`${item.asset.kind}:${item.asset.id}`} className="grid grid-cols-[minmax(0,1fr)_3rem_4.5rem_1.75rem] items-center gap-1.5 border-t border-border/40 py-1">
    <div className="flex min-w-0 items-center gap-1.5"><Picture asset={item.asset} compact/><span className="min-w-0"><span className="block truncate text-[11px]" title={item.asset.name}>{item.asset.name}</span><ShopSalePrice asset={item.asset} compact/></span></div>
    <input aria-label={`${item.asset.name} 수량`} className={`${compactField} w-full text-center text-xs tabular-nums`} type="number" inputMode="numeric" min={1} max={max(item.asset)} value={item.quantity||''} disabled={frozen} onChange={e=>update(index,{quantity:quantityWithin(e.target.value,max(item.asset))})}/>
    <input aria-label={`${item.asset.name} 개당 가격`} className={`${compactField} w-full text-center text-xs tabular-nums`} type="number" inputMode="numeric" min={1} max={1000000000} value={item.price||''} disabled={frozen} onChange={e=>update(index,{price:Number(e.target.value)})}/>
    <Button variant="ghost" size="icon" className="h-9 w-7" aria-label={`${item.asset.name} 선택 해제`} disabled={frozen} onClick={()=>setItems(list=>list.filter((_,i)=>i!==index))}><X className="size-3"/></Button>
   </div>)}</div>
  </section>}
  <section aria-label="물품 선택" className="flex min-h-0 flex-1 flex-col px-4">
   <div className="flex shrink-0 items-center justify-between py-2 text-[10px] text-muted-foreground"><h3>물품 추가</h3><span>{items.length} / 5종 · 최대 5종 선택</span></div>
   <div aria-label="추가할 물품 목록" className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
    {stock.error?<div role="alert" className="text-xs text-destructive">물품을 불러오지 못했어요.<Button variant="ghost" onClick={()=>void stock.refetch()}>다시 불러오기</Button></div>:stock.isPending?<p role="status" className="py-6 text-center text-xs text-muted-foreground">물품을 확인하는 중…</p>:<><ul className="grid grid-cols-2 gap-1.5">{results.slice(0,60).map(asset=>{const chosen=items.some(i=>i.asset.kind===asset.kind&&i.asset.id===asset.id);return <li key={`${asset.kind}:${asset.id}`} className="min-w-0"><button type="button" aria-label={`${asset.name} 추가`} disabled={frozen||chosen||items.length>=5} onClick={()=>setItems(list=>[...list,{asset,quantity:1,price:1}])} className={`flex min-h-14 w-full items-center gap-1.5 rounded-lg border p-2 text-left transition-colors disabled:opacity-50 ${chosen?'border-primary/30 bg-primary/5':'border-border/50 hover:bg-secondary/30'}`}><Picture asset={asset} compact/><span className="min-w-0 flex-1"><span className="block truncate text-[11px]" title={asset.name}>{asset.name}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">보유 {number(asset.available??0)}개</span><ShopSalePrice asset={asset} compact/></span>{chosen?<Check className="size-3 shrink-0 text-primary"/>:<Plus className="size-3 shrink-0 text-muted-foreground"/>}</button></li>})}</ul>{results.length===0&&<p className="py-6 text-center text-xs text-muted-foreground">선택할 수 있는 물품이 없어요.</p>}{results.length>60&&<p className="py-2 text-xs text-muted-foreground">이름으로 검색하면 다른 물품도 찾을 수 있어요.</p>}</>}
   </div>
  </section>
  <div className="shrink-0 space-y-2 border-t bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"><div className="flex items-center justify-between text-sm"><span className="text-xs text-muted-foreground">{side==='buy'?'맡길 구매대금':'모두 판매하면'}</span><Amount value={total}/></div><p className="text-[10px] text-muted-foreground">{side==='buy'?`보유 ${number(stock.data?.gold??0)} · 남은 금액은 마감 시 반환돼요.`:'거래·회수 물품은 우편함으로 도착해요.'}</p>{!frozen&&validationMessage&&<p id="flea-draft-validation" role="status" className="text-xs text-destructive">{validationMessage}</p>}{mutation.error&&<p role="alert" className="text-xs text-destructive">{mutation.error}</p>}<Button aria-describedby={!frozen&&validationMessage?"flea-draft-validation":undefined} className="min-h-11 w-full rounded-xl" disabled={mutation.busy||(!mutation.pending&&!valid)} onClick={()=>void submit()}>{mutation.pending?'이전 등록 결과 다시 확인':side==='buy'?'골드 맡기고 등록':'물건 맡기고 등록'}</Button></div>
 </DialogContent></Dialog>
}

type DetailRequest=FleaTrade|{p_post_id:string;p_operation_id:string}
function TradeDialog({post,owner,open,onClose,onExited,onUpdate}:{post:FleaPost;owner:string;open:boolean;onClose:()=>void;onExited:()=>void;onUpdate:(post:FleaPost)=>void}){
 const mine=post.owner_id===owner,buying=post.side==='sell'
 const stock=useAccountResource('flea-inventory',readFleaInventory,{enabled:!buying&&!mine})
 const [quantities,setQuantities]=useState<Record<string,number>>({}),[finished,setFinished]=useState(false)
 const mutation=useFleaMutation<DetailRequest,FleaPost>(args=>'p_items'in args?tradeFlea(args):cancelFlea(args),onUpdate)
 const frozen=mutation.busy||mutation.pending
 const available=(item:FleaPost['items'][number])=>buying?item.remaining:Math.min(item.remaining,stock.data?.assets.find(a=>a.kind===item.asset.kind&&a.id===item.asset.id)?.available??0)
 const chosen=post.items.filter(i=>(quantities[i.id]??0)>0)
 const selectedCount=chosen.reduce((n,item)=>n+(quantities[item.id]??0),0)
 const total=chosen.reduce((n,i)=>n+(quantities[i.id]??0)*i.unit_price,0)
 const stockReady=buying||(!stock.isPending&&!stock.error)
 const noStock=!mine&&post.status==='active'&&stockReady&&post.items.every(item=>available(item)===0)
 const valid=post.status==='active'&&!mine&&chosen.length>0&&chosen.every(i=>Number.isSafeInteger(quantities[i.id])&&quantities[i.id]<=available(i))
 async function submit(cancel=false){const args=cancel?{p_post_id:post.id,p_operation_id:crypto.randomUUID()}:{p_post_id:post.id,p_items:chosen.map(i=>({id:i.id,quantity:quantities[i.id]})),p_operation_id:crypto.randomUUID()};if(await mutation.run(args)){if(cancel)onClose();else{setQuantities({});setFinished(true)}}}
 return <Dialog open={open} onOpenChange={next=>{if(!next&&!frozen)onClose()}} onOpenChangeComplete={next=>{if(!next&&!open)onExited()}}><DialogContent showCloseButton={!frozen} className="flex max-h-[85dvh] w-[calc(100%-2rem)] min-w-0 max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
  <DialogHeader className="shrink-0 border-b border-border/50 px-4 pb-3 pt-5 pr-12">
   <ListingOwner post={post} owner={owner} expanded/><DialogTitle className="sr-only">{post.title}</DialogTitle>
   <DialogDescription className="sr-only">{buying?'판매 물품의 수량과 가격을 확인하고 구매해요.':'필요한 물품의 수량과 가격을 확인하고 판매해요.'}</DialogDescription>
  </DialogHeader>
  <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto overscroll-contain px-4">
   {post.items.map(item=><section key={item.id} className="py-4">
    <ListingItem item={item} side={post.side}/>
    {!mine&&post.status==='active'&&(!stockReady?<p className="mt-3 text-xs text-muted-foreground">{stock.error?'보유 물품을 확인해주세요.':'보유 물품을 확인하는 중…'}</p>:available(item)>0?<div className="mt-4 flex flex-wrap items-center justify-between gap-2">
     <span className="text-xs text-muted-foreground">{buying?'구매 수량':`판매 가능 ${number(available(item))}개`}</span>
     <div className="flex items-center gap-1"><div className="flex items-center rounded-lg border border-border/70 bg-secondary/20"><Button variant="ghost" size="icon" aria-label={`${item.asset.name} 수량 줄이기`} disabled={frozen||!(quantities[item.id]>0)} onClick={()=>setQuantities(q=>({...q,[item.id]:Math.max(0,(q[item.id]??0)-1)}))}>−</Button><input aria-label={`${item.asset.name} 거래 수량`} type="number" inputMode="numeric" min={0} max={available(item)} value={quantities[item.id]??0} disabled={frozen} onChange={e=>setQuantities(q=>({...q,[item.id]:quantityWithin(e.target.value,available(item))}))} className="h-11 w-12 bg-transparent text-center text-sm tabular-nums outline-none [appearance:textfield] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"/><Button variant="ghost" size="icon" aria-label={`${item.asset.name} 수량 늘리기`} disabled={frozen||(quantities[item.id]??0)>=available(item)} onClick={()=>setQuantities(q=>({...q,[item.id]:(q[item.id]??0)+1}))}>+</Button></div><Button variant="ghost" aria-label={`${item.asset.name} 최대 수량 선택`} className="min-h-11 px-2 text-xs text-primary" disabled={frozen} onClick={()=>setQuantities(q=>({...q,[item.id]:available(item)}))}>최대</Button></div>
    </div>:<p className="mt-3 rounded-lg bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground">{buying?'남은 물품이 없어요.':'판매할 수 있는 물품이 없어요.'}</p>)}
   </section>)}
   {stock.error&&!buying&&!mine&&<div role="alert" className="py-3 text-xs text-destructive">보유 물품을 확인하지 못했어요.<Button variant="ghost" onClick={()=>void stock.refetch()}>다시 확인</Button></div>}
  </div>
  <div className="shrink-0 space-y-3 border-t bg-secondary/20 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
   {finished&&<p role="status" className="text-xs text-primary">거래를 완료했어요. 남은 수량을 확인해 주세요.</p>}
   {mutation.error&&<p role="alert" className="text-xs text-destructive">{mutation.error}</p>}
   {mine?<><p className="text-xs text-muted-foreground">{buying?'남은 물건은 우편함으로 돌려받아요.':'사용되지 않은 구매대금은 즉시 돌려받아요.'}</p><Button variant="outline" className="min-h-11 w-full rounded-xl" disabled={mutation.busy||post.status!=='active'} onClick={()=>void submit(true)}>{mutation.pending?'이전 처리 결과 다시 확인':'글 마감하기'}</Button></>:noStock&&!frozen?<Button variant="outline" className="min-h-11 w-full rounded-xl" onClick={onClose}>계속 둘러보기</Button>:<>
    <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{buying?'결제할 금액':'받을 금액'}</span><span className="text-xl font-semibold text-primary"><Amount value={total}/></span></div>
    <Button aria-label={mutation.pending?'이전 거래 결과 다시 확인':buying?'선택한 수량 구매하기':'선택한 수량 판매하기'} className="min-h-12 w-full rounded-xl" disabled={mutation.busy||(!mutation.pending&&!valid)} onClick={()=>void submit()}>{mutation.pending?'이전 거래 결과 다시 확인':selectedCount?`${number(selectedCount)}개 ${buying?'구매하기':'판매하기'}`:'거래할 수량을 선택해주세요'}</Button>
    <p className="text-center text-[10px] text-muted-foreground">{buying?'구매한 물품은 우편함으로 도착해요.':'물품을 보내면 골드는 즉시 받아요.'}</p>
    {finished&&<Button variant="ghost" className="min-h-11 w-full text-xs" onClick={onClose}>계속 둘러보기</Button>}
   </>}
  </div>
 </DialogContent></Dialog>
}
