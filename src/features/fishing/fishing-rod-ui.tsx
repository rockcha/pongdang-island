import {ProductSkeleton} from '@/components/product-skeleton'
import {LandscapeImage} from '@/components/landscape-image'
import {useRef,useState} from 'react'
import {toast} from 'sonner'
import {Check,FishingRod as RodIcon} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {TradeQuestion} from '@/components/trade-question'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog'
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {fishingRods,type FishingRod} from './fishing-rods'
import {useRods} from './rod-provider'
import {rodThumbnailUrl} from './rod-image-assets'
import {regionIcons} from '@/features/regions/region-icons'

export function RodPreview({rod}:{rod:FishingRod}){
 return <div className="relative h-40 w-full"><LandscapeImage src={rodThumbnailUrl(rod.id)} alt={rod.name+' 세트'} className="absolute inset-0 size-full object-contain p-2"/></div>
}
export function RodEffect({rod}:{rod:FishingRod}){
 const region=rod.region?regionIcons[rod.region]:undefined
 return <div className="space-y-1 rounded-xl bg-secondary/60 px-4 py-3 text-xs leading-5 text-primary">{region&&rod.nativeBonusBp>0?<><p className="flex items-center gap-1.5"><img src={region.src} alt="" className="size-6 shrink-0 object-contain"/>{region.name} 주 서식지 개체</p><p>추첨 가중치 · 해당 해역 ×2.2 / 다른 해역 ×0.3</p></>:<p>주 서식지 추가 보정 없음</p>}</div>
}
export function RodInventoryStatus(){
 const {loading,error,refresh}=useRods()
 if(loading)return <p role="status" className="py-5 text-sm text-muted-foreground">낚싯대를 불러오는 중…</p>
 if(error)return <div role="alert" className="space-y-2 rounded-xl bg-destructive/5 p-4 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void refresh()}>다시 불러오기</Button></div>
 return null
}
export function FishingRodShop(){return <RodCards/>}
export function FishingRodInventory({query=''}:{query?:string}){return <RodCards inventory query={query}/>}
function RodCards({inventory=false,query=''}:{inventory?:boolean;query?:string}){
 const {owned,selected,rods,loading,busy:equipping,error,refresh,select}=useRods()
 const {wallet,transact,loading:goldLoading,busy:trading,error:goldError}=useGold()
 const [pending,setPending]=useState<{rod:FishingRod;action:'buy'|'sell'}|null>(null),[processing,setProcessing]=useState(false),[tradeError,setTradeError]=useState('')
 const [detail,setDetail]=useState<FishingRod|null>(null)
 const lock=useRef(false)
 const busy=processing||trading||equipping
 const unavailable=loading||goldLoading||busy||!!error||!!goldError
 async function confirm(){
  if(!pending||lock.current||unavailable)return
  lock.current=true;setProcessing(true);setTradeError('')
  try{await transact({type:pending.action,id:'rod:'+pending.rod.id});setPending(null);await refresh()}
  catch(cause){setTradeError(cause instanceof Error?cause.message:'거래를 처리하지 못했어요.')}
  finally{lock.current=false;setProcessing(false)}
 }
 async function equip(id:string){try{await select(id)}catch(cause){toast.error(cause instanceof Error?cause.message:'장착하지 못했어요.')}}
 const visible=(inventory?rods.filter(rod=>owned.includes(rod.id)&&rod.name.includes(query.trim())):[...rods]).sort((a,b)=>a.price-b.price)
 return <div className="space-y-4">
  {loading?<ProductSkeleton columns={inventory?3:2}/>:<RodInventoryStatus/>}
  {!loading&&!error&&<div className={inventory?"grid grid-cols-3 border-t border-border/60 sm:grid-cols-4":"grid grid-cols-2 border-t border-border/60"}>{visible.map(rod=>{
   const has=owned.includes(rod.id),equipped=selected===rod.id
   if(inventory)return <button key={rod.id} onClick={()=>setDetail(rod)} aria-label={rod.name+' 상세 보기'} aria-pressed={equipped} className={`relative flex min-w-0 flex-col items-center gap-2 border-r border-b border-border/60 px-2 pt-7 pb-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${equipped?'bg-secondary/60 ring-2 ring-inset ring-primary/60':'border-border/60 bg-card hover:bg-secondary/50'}`}>{equipped&&<span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] leading-none text-primary-foreground"><Check className="size-3"/>장착 중</span>}<div className="relative aspect-square w-full"><LandscapeImage src={rodThumbnailUrl(rod.id)} alt="" className="absolute inset-0 size-full object-contain"/></div><span className="w-full truncate text-xs leading-5" title={rod.name}>{rod.name}</span></button>
   return <button key={rod.id} type="button" onClick={()=>setDetail(rod)} aria-label={rod.name+' 상세 보기'} className="relative flex min-w-0 flex-col items-center border-r border-b border-border/60 bg-card px-2 pt-2 pb-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <div className="relative aspect-square w-full"><LandscapeImage src={rodThumbnailUrl(rod.id)} alt={rod.name+' 세트'} className="absolute inset-0 size-full object-contain"/></div>
    <h2 className="mt-1 h-10 text-xs leading-5 line-clamp-2">{rod.name}</h2><span className="flex items-center gap-1 text-xs text-primary">{has?<><Check className="size-3"/>{equipped?'장착 중':'보유중'}</>:<><GoldIcon className="size-4"/>{rod.price.toLocaleString('ko-KR')}</>}</span>
   </button>
  })}</div>}
  {inventory&&!loading&&!error&&!visible.length&&<p className="py-10 text-center text-sm text-muted-foreground">조건에 맞는 낚싯대가 없어요.</p>}
  <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="notification-sheet bottom-0 top-auto left-0 flex max-h-[88dvh] max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none pb-0 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"><DialogHeader className="shrink-0"><DialogTitle className="flex items-center gap-2 pr-6"><img src="/branding/pongi-starfish.png" alt="" aria-hidden="true" className="size-6 shrink-0 object-contain"/>{detail?.name}</DialogTitle><DialogDescription>{detail?.description}</DialogDescription></DialogHeader>{detail&&<><div className="min-h-0 overflow-y-auto overscroll-contain py-4"><RodPreview rod={detail}/></div><div className="-mx-4 shrink-0 border-t border-border [&>div]:rounded-none"><RodEffect rod={detail}/></div><div className="-mx-4 flex shrink-0 border-t bg-secondary pb-[env(safe-area-inset-bottom)]"><Button className="h-16 min-w-0 flex-1 rounded-none" disabled={unavailable||(owned.includes(detail.id)?selected===detail.id:wallet.gold<detail.price)} onClick={()=>{if(owned.includes(detail.id))void equip(detail.id);else{setTradeError('');setPending({rod:detail,action:'buy'});setDetail(null)}}}>{owned.includes(detail.id)?selected===detail.id?'장착 중':'장착하기':<><GoldIcon className="size-4"/>{detail.price.toLocaleString('ko-KR')} 구매</>}</Button>{detail.price>0&&owned.includes(detail.id)&&<Button variant="outline" className="h-16 min-w-0 flex-1 rounded-none" disabled={unavailable} onClick={()=>{setTradeError('');setPending({rod:detail,action:'sell'});setDetail(null)}}><GoldIcon className="size-4"/>{(detail.price/2).toLocaleString('ko-KR')} 판매</Button>}</div></>}</DialogContent></Dialog>
  <ConfirmDialog open={!!pending} onOpenChange={open=>{if(!open){setPending(null);setTradeError('')}}} title={pending?<TradeQuestion name={pending.rod.name} price={pending.action==='buy'?pending.rod.price:pending.rod.price/2} selling={pending.action==='sell'}/>:''} description={pending?.action==='sell'&&selected===pending.rod.id?'장착 장비는 입문용으로 바뀝니다.':pending?.action==='buy'?'구매한 낚싯대는 창고에 보관됩니다.':'판매한 낚싯대는 창고에서 사라집니다.'} busy={busy} confirmDisabled={unavailable} error={tradeError} onConfirm={()=>void confirm()}/>
 </div>
}
export function FishingRodSelector({disabled=false,regionId}:{disabled?:boolean;regionId:string}){
 const {selected,owned,rods,loading,busy,error,select}=useRods()
 const [open,setOpen]=useState(false)
 const rod=fishingRods.find(r=>r.id===selected)??fishingRods[0]
 async function equip(id:string){try{await select(id)}catch(cause){toast.error(cause instanceof Error?cause.message:'장착하지 못했어요.')}}
 return <Dialog open={open} onOpenChange={setOpen}>
  <TooltipProvider><Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" disabled={disabled} aria-label={'낚싯대 선택 · '+rod.name} className="size-11 rounded-full bg-slate-950/20 text-white hover:bg-slate-950/35 hover:text-white"/>}/> }><RodIcon className="size-5"/></TooltipTrigger><TooltipContent>낚싯대 선택 · {rod.name}</TooltipContent></Tooltip></TooltipProvider>
  <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden rounded-3xl sm:max-w-md">
   <DialogHeader><DialogTitle>낚싯대 선택</DialogTitle><DialogDescription>장착한 낚싯대의 주 서식지 개체를 어느 해역에서든 더 쉽게 만나요.</DialogDescription></DialogHeader>
   <RodInventoryStatus/>
   <div className="min-h-0 space-y-2 overflow-y-auto">{!loading&&!error&&rods.map(item=><button key={item.id} type="button" disabled={busy||!owned.includes(item.id)||selected===item.id} aria-pressed={selected===item.id} aria-label={item.name+' 선택'} onClick={()=>void equip(item.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50 ${selected===item.id?'border-primary bg-primary/5':'border-border/60'}`}>
    <img src={rodThumbnailUrl(item.id)} alt="" className="size-12 shrink-0 object-contain"/>
    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.name}</p><RodEffect rod={item}/><p className="text-[10px] text-muted-foreground">{!owned.includes(item.id)?'상점에서 구매':item.region?item.region===regionId?'해당 해역 보정 적용':'다른 해역 보정 적용':'사용 가능'}</p></div>
    {selected===item.id&&<Check className="size-4 shrink-0 text-primary"/>}
   </button>)}</div>
   <Button disabled={busy} onClick={()=>setOpen(false)}>선택 완료</Button>
  </DialogContent>
 </Dialog>
}
