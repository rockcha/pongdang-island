import {useRef,useState} from 'react'
import {toast} from 'sonner'
import {Check,FishingRod as RodIcon,MapPin,ShieldCheck} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {TradeQuestion} from '@/components/trade-question'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog'
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {fishingRods,type FishingRod} from './fishing-rods'
import {useRods} from './rod-provider'
import {rodThumbnailUrl} from './rod-image-assets'

export function RodPreview({rod}:{rod:FishingRod}){
 return <img src={rodThumbnailUrl(rod.id)} alt={rod.name+' 세트'} loading="lazy" className="h-40 w-full object-contain p-2"/>
}
export function RodEffect({rod}:{rod:FishingRod}){
 const Icon=rod.region?MapPin:ShieldCheck
 const effect=rod.failureReductionBp?`실패율 −${rod.failureReductionBp/100}%p${rod.nativeBonusBp?' · '+rod.effect.split(' · ').at(-1):''}`:'추가 효과 없음'
 return <p className="flex items-start gap-1.5 text-xs leading-5 text-primary"><Icon className="mt-0.5 size-3.5 shrink-0"/>{effect}</p>
}
export function RodInventoryStatus(){
 const {loading,error,refresh}=useRods()
 if(loading)return <p role="status" className="py-5 text-sm text-muted-foreground">낚싯대를 불러오는 중…</p>
 if(error)return <div role="alert" className="space-y-2 rounded-xl bg-destructive/5 p-4 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void refresh()}>다시 불러오기</Button></div>
 return null
}
export function FishingRodShop(){return <RodCards/>}
export function FishingRodInventory(){return <RodCards inventory/>}
function RodCards({inventory=false}:{inventory?:boolean}){
 const {owned,selected,rods,loading,busy:equipping,error,refresh,select}=useRods()
 const {wallet,transact,loading:goldLoading,busy:trading,error:goldError}=useGold()
 const [pending,setPending]=useState<{rod:FishingRod;action:'buy'|'sell'}|null>(null),[processing,setProcessing]=useState(false),[tradeError,setTradeError]=useState('')
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
 const visible=inventory?rods.filter(rod=>owned.includes(rod.id)):rods
 return <div className="space-y-4">
  <p className="rounded-xl bg-muted/60 px-4 py-3 text-xs leading-5 text-muted-foreground">{inventory?'보유한 낚싯대를 장착하거나 구매가의 절반에 판매할 수 있어요.':'낚싯대는 종류별로 하나씩 보유할 수 있어요. 판매 가격은 구매가의 절반이에요.'} 확률 효과는 아직 적용되지 않아요.</p>
  <RodInventoryStatus/>
  {!loading&&!error&&<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{visible.map(rod=>{
   const has=owned.includes(rod.id),equipped=selected===rod.id
   return <article key={rod.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
    <div className="relative px-3 pt-2" style={{background:`linear-gradient(140deg,${rod.color}18,transparent)`}}><RodPreview rod={rod}/>{equipped&&<span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] text-primary"><Check className="size-3"/>장착 중</span>}</div>
    <div className="flex flex-1 flex-col gap-2 p-4 pt-2"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-medium">{rod.name}</h2>{!rod.price&&<span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">기본 지급</span>}</div>
     <p className="text-xs leading-5 text-muted-foreground">{rod.description}</p><RodEffect rod={rod}/>
     <div className="mt-auto flex gap-2 pt-3">
      {has?<Button variant={equipped?'secondary':'outline'} className="min-h-11 flex-1 text-xs" disabled={unavailable||equipped} aria-label={rod.name+' 장착'} onClick={()=>void equip(rod.id)}>{equipped?'장착 중':'장착'}</Button>:<Button className="min-h-11 flex-1 text-xs" disabled={unavailable||wallet.gold<rod.price} aria-label={rod.name+' 구매'} onClick={()=>{setTradeError('');setPending({rod,action:'buy'})}}><GoldIcon className="size-4"/>{rod.price.toLocaleString('ko-KR')} 구매</Button>}
      {rod.price>0&&<Button variant="ghost" className="min-h-11 flex-1 text-xs text-muted-foreground" disabled={unavailable||!has} aria-label={rod.name+' 반값 판매'} onClick={()=>{setTradeError('');setPending({rod,action:'sell'})}}><GoldIcon className="size-4"/>{(rod.price/2).toLocaleString('ko-KR')} 판매</Button>}
     </div>
    </div>
   </article>
  })}</div>}
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
   <DialogHeader><DialogTitle>낚싯대 선택</DialogTitle><DialogDescription>보유한 낚싯대를 장착하세요. 확률 효과는 아직 적용되지 않아요.</DialogDescription></DialogHeader>
   <RodInventoryStatus/>
   <div className="min-h-0 space-y-2 overflow-y-auto">{!loading&&!error&&rods.map(item=><button key={item.id} type="button" disabled={busy||!owned.includes(item.id)||selected===item.id} aria-pressed={selected===item.id} aria-label={item.name+' 선택'} onClick={()=>void equip(item.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50 ${selected===item.id?'border-primary bg-primary/5':'border-border/60'}`}>
    <img src={rodThumbnailUrl(item.id)} alt="" className="size-12 shrink-0 object-contain"/>
    <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.name}</p><RodEffect rod={item}/><p className="text-[10px] text-muted-foreground">{!owned.includes(item.id)?'상점에서 구매':item.region?item.region===regionId?'현재 해역 대상':'다른 해역 토착 효과':'사용 가능'}</p></div>
    {selected===item.id&&<Check className="size-4 shrink-0 text-primary"/>}
   </button>)}</div>
   <Button disabled={busy} onClick={()=>setOpen(false)}>선택 완료</Button>
  </DialogContent>
 </Dialog>
}
