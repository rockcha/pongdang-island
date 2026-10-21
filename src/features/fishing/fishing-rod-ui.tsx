import {Link} from 'react-router'
import {appArt} from '@/components/app-art'
import {fishingDockButton} from '@/components/fishing-dock-style'
import {ProductSkeleton} from '@/components/product-skeleton'
import {LandscapeImage} from '@/components/landscape-image'
import {useRef,useState} from 'react'
import {toast} from 'sonner'
import {Check,LockKeyhole,Info,ChevronRight,FishingRod as RodIcon} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {TradeQuestion} from '@/components/trade-question'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog'
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {fishingRods,rodSuccessBonusBp,type FishingRod} from './fishing-rods'
import {useRods} from './rod-provider'
import {rodThumbnailUrl} from './rod-image-assets'
import {regionIcons} from '@/features/regions/region-icons'

export function RodPreview({rod}:{rod:FishingRod}){
 return <div className="relative h-40 w-full"><LandscapeImage src={rodThumbnailUrl(rod.id)} alt={rod.name+' 세트'} className="absolute inset-0 size-full object-contain p-2"/></div>
}
export function RodEffect({rod}:{rod:FishingRod}){
 const region=rod.region?regionIcons[rod.region]:undefined
 return <div className="space-y-1 rounded-xl bg-secondary/60 px-4 py-3 text-xs leading-5 text-primary">{region&&rod.nativeBonusBp>0?<><p className="flex items-center gap-1.5"><img src={region.src} alt="" className="size-6 shrink-0 object-contain"/>{region.name}에 어울리는 낚싯대</p><p>해당 해역에서 주 서식지 개체를 만나기 쉬워져요.</p><p className="text-muted-foreground">다른 해역에서도 해당 주 서식지 개체를 만날 확률이 조금 높아져요.</p></>:rodSuccessBonusBp(rod)>0?<p>{rod.id==='calm'?'낚시 성공 확률이 조금 더 높아져요.':'낚시 성공 확률이 소폭 높아져요.'}</p>:<p>추가 효과 없는 기본 낚싯대예요.</p>}</div>
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
   if(inventory)return <button key={rod.id} onClick={()=>setDetail(rod)} aria-label={rod.name+' 상세 보기'} data-selection-icons aria-pressed={equipped} className={`relative flex min-w-0 flex-col items-center gap-2 border-r border-b border-border/60 px-2 pt-7 pb-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${equipped?'bg-secondary/60 ring-2 ring-inset ring-primary/60':'border-border/60 bg-card hover:bg-secondary/50'}`}>{equipped&&<span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] leading-none text-primary-foreground"><Check className="size-3"/>장착 중</span>}<div className="relative aspect-square w-full"><LandscapeImage src={rodThumbnailUrl(rod.id)} alt="" className="absolute inset-0 size-full object-contain"/></div><span className="w-full truncate text-xs leading-5" title={rod.name}>{rod.name}</span></button>
   return <button key={rod.id} type="button" onClick={()=>setDetail(rod)} aria-label={rod.name+' 상세 보기'} className={`relative flex min-w-0 flex-col items-center border-r border-b border-border/60 px-2 pt-2 pb-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring ${equipped?'bg-secondary/60 ring-2 ring-inset ring-primary/60':has?'bg-[#F0F5ED]':'bg-card'}`}>
    <div className="relative aspect-square w-full"><span className={`absolute top-1 right-1 z-10 grid size-6 place-items-center rounded-full border shadow-sm ${equipped?'border-primary bg-primary text-primary-foreground':has?'border-[#C9D9C5] bg-[#EDF4E9] text-[#426342]':'border-border bg-background text-muted-foreground'}`}>{has?<Check aria-hidden="true" className="size-3.5"/>:<LockKeyhole aria-hidden="true" className="size-3.5"/>}</span><LandscapeImage src={rodThumbnailUrl(rod.id)} alt={rod.name+' 세트'} className="absolute inset-0 size-full object-contain"/></div>
    <h2 className="mt-1 h-10 text-xs leading-5 line-clamp-2">{rod.name}</h2><span className={`flex min-h-6 items-center gap-1 rounded-full px-2 text-xs font-medium ${equipped?'bg-primary text-primary-foreground':has?'bg-[#DFEBDD] text-[#426342]':'bg-secondary text-primary'}`}>{has?<><Check className="size-3"/>{equipped?'장착 중':'보유중'}</>:<><GoldIcon className="size-4"/>{rod.price.toLocaleString('ko-KR')}</>}</span>
   </button>
  })}</div>}
  {inventory&&!loading&&!error&&!visible.length&&<p className="py-10 text-center text-sm text-muted-foreground">조건에 맞는 낚싯대가 없어요.</p>}
  <Dialog open={!!detail} onOpenChange={open=>{if(!open)setDetail(null)}}><DialogContent className="notification-sheet bottom-0 top-auto left-0 flex max-h-[88dvh] max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none pb-0 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"><DialogHeader className="shrink-0"><DialogTitle className="flex items-center gap-2 pr-6"><img src="/branding/pongi-starfish.png" alt="" aria-hidden="true" className="size-6 shrink-0 object-contain"/>{detail?.name}</DialogTitle><DialogDescription>{detail?.description}</DialogDescription></DialogHeader>{detail&&<><div className="min-h-0 overflow-y-auto overscroll-contain py-4"><RodPreview rod={detail}/></div><div className="-mx-4 shrink-0 border-t border-border [&>div]:rounded-none"><RodEffect rod={detail}/></div><div className="-mx-4 flex shrink-0 border-t bg-secondary pb-[env(safe-area-inset-bottom)]"><Button className="h-16 min-w-0 flex-1 rounded-none" disabled={unavailable||(owned.includes(detail.id)?selected===detail.id:wallet.gold<detail.price)} onClick={()=>{if(owned.includes(detail.id))void equip(detail.id);else{setTradeError('');setPending({rod:detail,action:'buy'});setDetail(null)}}}>{owned.includes(detail.id)?selected===detail.id?'장착 중':'장착하기':<><GoldIcon className="size-4"/>{detail.price.toLocaleString('ko-KR')} 구매</>}</Button>{detail.price>0&&owned.includes(detail.id)&&<Button variant="outline" className="h-16 min-w-0 flex-1 rounded-none" disabled={unavailable} onClick={()=>{setTradeError('');setPending({rod:detail,action:'sell'});setDetail(null)}}><GoldIcon className="size-4"/>{(detail.price/2).toLocaleString('ko-KR')} 판매</Button>}</div></>}</DialogContent></Dialog>
  <ConfirmDialog illustration={pending?.action==='sell'?'sale':'purchase'} open={!!pending} onOpenChange={open=>{if(!open){setPending(null);setTradeError('')}}} title={pending?<TradeQuestion name={pending.rod.name} price={pending.action==='buy'?pending.rod.price:pending.rod.price/2} selling={pending.action==='sell'}/>:''} description={pending?.action==='sell'&&selected===pending.rod.id?'장착 장비는 입문용으로 바뀝니다.':pending?.action==='buy'?'구매한 낚싯대는 창고에 보관됩니다.':'판매한 낚싯대는 창고에서 사라집니다.'} busy={busy} confirmDisabled={unavailable} error={tradeError} onConfirm={()=>void confirm()}/>
 </div>
}
export function FishingRodSelector({disabled=false,regionId,dock=false,compact=false}:{disabled?:boolean;regionId:string;dock?:boolean;compact?:boolean}){
 const {selected,owned,rods,loading,busy,error,select}=useRods()
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(selected),[details,setDetails]=useState<FishingRod|null>(null),[saving,setSaving]=useState(false)
 const lock=useRef(false)
 const rod=fishingRods.find(r=>r.id===selected)??fishingRods[0]
 const available=rods.filter(item=>owned.includes(item.id)).sort((a,b)=>a.price-b.price)
 const pending=available.find(item=>item.id===draft)
 const unavailable=busy||saving||loading||!!error
 function changeOpen(value:boolean){if(lock.current||busy)return;if(value)setDraft(selected);else setDetails(null);setOpen(value)}
 async function equip(){
  if(lock.current||unavailable||!pending)return
  if(draft===selected){setOpen(false);return}
  lock.current=true;setSaving(true)
  try{await select(draft);setOpen(false)}catch(cause){toast.error(cause instanceof Error?cause.message:'장착하지 못했어요.')}finally{lock.current=false;setSaving(false)}
 }
 return <Dialog open={open} onOpenChange={changeOpen}>
  <TooltipProvider><Tooltip><TooltipTrigger render={<DialogTrigger render={<Button variant="ghost" size="icon" disabled={disabled} aria-label={'낚싯대 선택 · '+rod.name} className={compact?"flex h-11 min-w-0 flex-1 justify-start gap-1.5 rounded-md px-1 text-white/85 hover:bg-white/10 hover:text-white":dock?fishingDockButton:"size-11 rounded-full bg-slate-950/20 text-white hover:bg-slate-950/35 hover:text-white"}/>}/> }>{compact?<><img src={rodThumbnailUrl(rod.id)} alt="" className="size-6 shrink-0 object-contain"/><span className="truncate text-[11px]">{rod.name}</span></>:dock?<><img src={rodThumbnailUrl(rod.id)} alt=""/><span className="text-[11px]">낚싯대 선택</span></>:<RodIcon className="size-5"/>}</TooltipTrigger><TooltipContent>낚싯대 선택 · {rod.name}</TooltipContent></Tooltip></TooltipProvider>
  <DialogContent showCloseButton={!saving&&!busy} className="notification-sheet inset-x-0 bottom-0 top-auto left-0 flex max-h-[84dvh] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none p-0 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
   <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"/>
   <DialogHeader className="shrink-0 px-4 py-4 pr-12"><DialogTitle className="flex items-center gap-2 font-normal"><appArt.rod className="size-7"/>낚싯대 선택</DialogTitle><DialogDescription className="text-xs leading-5">낚시할 해역에 맞는 낚싯대를 골라보세요.</DialogDescription></DialogHeader>
   <div className="min-h-0 overflow-y-auto overscroll-contain">
    <div className="px-4"><RodInventoryStatus/></div>
    {!loading&&!error&&<ul className="divide-y divide-border/60 border-y border-border/60">{available.map(item=>{
     const active=draft===item.id,region=item.region?regionIcons[item.region]:undefined
     const effect=region&&item.nativeBonusBp>0?(item.region===regionId?'주 서식지 개체를 만나기 쉬워져요.':'해당 주 서식지 개체를 만날 확률이 조금 높아져요.'):rodSuccessBonusBp(item)>0?(item.id==='calm'?'성공 확률이 조금 더 높아져요.':'성공 확률이 소폭 높아져요.'):'추가 효과 없음'
     return <li key={item.id} className={active?'flex items-center bg-secondary/65':'flex items-center'}>
      <button type="button" disabled={unavailable} data-selection-icons aria-pressed={active} aria-label={item.name+' 선택'} onClick={()=>setDraft(item.id)} className="flex min-h-24 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50">
       <LandscapeImage src={rodThumbnailUrl(item.id)} alt="" className="size-16 shrink-0 object-contain"/>
       <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-sm"><span>{item.name}</span>{selected===item.id&&<span className="text-[10px] text-primary">장착 중</span>}</span><span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-5 text-muted-foreground">{region&&item.nativeBonusBp>0&&<span className="flex items-center gap-1"><img src={region.src} alt={region.name} className="size-6 shrink-0 object-contain"/><span>{region.name}</span></span>}<span>{effect}</span></span></span>
       <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full border ${active?'border-primary bg-primary text-primary-foreground':'border-border'}`}>{active&&<Check className="size-3"/>}</span>
      </button>
      <Button variant="ghost" size="icon" className="mr-2 size-11 shrink-0 text-muted-foreground" disabled={unavailable} aria-label={item.name+' 효과 안내'} onClick={()=>setDetails(item)}><Info className="size-4"/></Button>
     </li>
    })}</ul>}
   </div>
   <div className="grid shrink-0 grid-cols-2 border-t bg-background pb-[env(safe-area-inset-bottom)]">
    <Link to="/shop?tab=rods" aria-label="낚싯대 상점으로" onClick={event=>{if(unavailable)event.preventDefault();else changeOpen(false)}} aria-disabled={unavailable} className="flex h-14 items-center justify-center gap-1 border-r bg-secondary/40 text-sm text-primary outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-disabled:opacity-50">상점<ChevronRight className="size-3"/></Link>
    <Button aria-label="이 낚싯대 사용하기" className="h-14 w-full rounded-none" disabled={unavailable||!pending} onClick={()=>void equip()}>{saving?'장착 중…':'사용'}</Button>
   </div>
   <Dialog open={!!details} onOpenChange={value=>{if(!value)setDetails(null)}}><DialogContent className="rounded-2xl sm:max-w-sm"><DialogHeader><DialogTitle className="text-base font-normal">{details?.name}</DialogTitle><DialogDescription>해역 낚싯대는 고유종 추첨을, 청동·잔물결 낚싯대는 직접 낚시 성공 판정을 보정해요. 게이지 조작 실패와 통발 설치에는 적용되지 않아요.</DialogDescription></DialogHeader>{details&&<RodEffect rod={details}/>}</DialogContent></Dialog>
  </DialogContent>
 </Dialog>
}
