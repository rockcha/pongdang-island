import {useRef,useState} from 'react'
import {Link} from 'react-router'
import {ChevronLeft,ChevronRight,Check,Minus,Plus,Clock,Package,Gift,Compass,Magnet,Sparkles,Shell,Star,Copy,Shrimp,PackagePlus,Info} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip'
import {regionIcons} from '@/features/regions/region-icons'
import {baitEffects} from '@/features/fishing/bait-effects'
import {collectibleUrl} from '@/features/collection/api'
import type {Region} from '@/features/regions/api'
import {duration} from './api'
import type {ExpeditionState,Vessel} from './api'

export function BoatImage({id,name,className='h-40 w-full'}:{id:string;name:string;className?:string}){
 return <img onError={event=>{if(event.currentTarget.dataset.fallback)return;event.currentTarget.dataset.fallback='true';event.currentTarget.src='/fallback-image.svg'}} src={id==='dinghy'?'/navigation/journey-boat.png':collectibleUrl(`vessels/${id}.png`)} alt={name} loading="lazy" decoding="async" draggable={false} className={`${className} block min-w-0 max-w-full select-none object-contain`} width={512} height={512}/>
}
const bonusIcons:Record<string,typeof Gift>={breeze:Copy,fullcatch:PackagePlus,homesea:Compass,shrimp:Shrimp,salvage:Magnet,candy:Sparkles,discovery:Shell,starlit:Star}
export function VesselStats({vessel:v}:{vessel:Vessel}){
 const BonusIcon=bonusIcons[v.id]??Gift
 return <div className="mt-2 space-y-2">
  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock aria-hidden="true" className="size-3.5 text-primary"/><span className="sr-only">조업 시간 </span><span className="tabular-nums">{duration(v.duration_minutes)}</span></span><span className="inline-flex items-center gap-1.5"><Package aria-hidden="true" className="size-3.5 text-primary"/><span className="sr-only">적재량 </span><span className="tabular-nums">미끼 {v.min_baits}~{v.max_baits}개</span></span></div>
  <details className="text-center text-[11px] leading-5 text-primary"><summary className="mx-auto inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"><BonusIcon aria-hidden="true" className="size-4"/>어선 효과<Info className="size-3"/></summary><p className="mx-auto mt-1 max-w-64 text-muted-foreground">{v.bonus_description}</p></details>
 </div>
}
export function BoatPicker({vessels,value,onChange,disabled=false}:{vessels:Vessel[];value:string;onChange:(id:string)=>void;disabled?:boolean}){
 const start=useRef<number|null>(null),index=Math.max(0,vessels.findIndex(v=>v.id===value)),v=vessels[index]
 function move(delta:number){const next=vessels[index+delta];if(next&&!disabled)onChange(next.id)}
 if(!v)return null
 return <div aria-label="어선 선택" aria-roledescription="캐러셀" className="w-full min-w-0 max-w-full shrink-0 rounded-2xl bg-gradient-to-b from-secondary/10 to-secondary/45 px-3 pb-4" style={{touchAction:'pan-y'}} onTouchStart={e=>{start.current=e.touches[0]?.clientX??null}} onTouchEnd={e=>{if(start.current!==null){const distance=(e.changedTouches[0]?.clientX??start.current)-start.current;if(Math.abs(distance)>45)move(distance<0?1:-1)}start.current=null}}>
  <BoatImage id={v.id} name={v.name} className="mx-auto h-[clamp(88px,15dvh,144px)] w-full max-w-64"/>
  <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_44px] items-center"><Button variant="ghost" className="size-11 shrink-0 p-0" aria-label="이전 어선" disabled={index===0||disabled} onClick={()=>move(-1)}><ChevronLeft className="size-5"/></Button><h2 className="text-center text-lg" aria-live="polite">{v.name}</h2><Button variant="ghost" className="size-11 shrink-0 p-0" aria-label="다음 어선" disabled={index===vessels.length-1||disabled} onClick={()=>move(1)}><ChevronRight className="size-5"/></Button></div>
  <VesselStats vessel={v}/>
  {vessels.length>1&&<div className="mt-1 hidden items-center justify-center gap-1.5 sm:flex" aria-label={`${vessels.length}척 중 ${index+1}번째 어선`}><span aria-hidden="true" className="mr-1 text-[10px] tabular-nums text-muted-foreground">{index+1} / {vessels.length}</span>{vessels.map((boat,i)=>Math.abs(i-index)<=2&&<button key={boat.id} aria-label={`${boat.name} 선택`} data-selection-icons aria-pressed={i===index} onClick={()=>onChange(boat.id)} className="grid size-7 place-items-center"><span className={`block h-1.5 rounded-full ${i===index?'w-4 bg-primary':'w-1.5 bg-border'}`}/></button>)}</div>}
 </div>
}
export function RegionPicker({regions,value,onChange}:{regions:Region[];value:string;onChange:(id:string)=>void}){
 const selected=regions.find(r=>r.id===value)
 return <div className="w-full min-w-0 max-w-full shrink-0"><div className="mb-2 flex items-center justify-between gap-3"><h2 className="text-sm">해역</h2><span className="truncate text-xs text-primary" aria-live="polite">{selected?.name??'해역 선택'}</span></div><TooltipProvider><div className="flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain py-1" aria-label="파견 해역">{regions.map(r=><Tooltip key={r.id}><TooltipTrigger render={<button aria-label={r.name} data-selection-icons aria-pressed={r.id===value} onClick={()=>onChange(r.id)} className={`relative grid size-14 shrink-0 place-items-center rounded-xl border transition-colors ${r.id===value?'border-primary bg-primary/10':'border-transparent bg-secondary/40'}`}/>}><img src={regionIcons[r.id]?.src??'/region-icons/pongdang.svg'} alt="" className="size-10 object-contain"/>{r.id===value&&<span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3"/></span>}</TooltipTrigger><TooltipContent>{r.name}</TooltipContent></Tooltip>)}</div></TooltipProvider></div>
}
export function CargoMeter({total,min,max}:{total:number;min:number;max:number}){
 return <div className="mb-3 space-y-2"><div className="flex items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">실은 미끼</span><span className="tabular-nums text-muted-foreground"><span className="font-medium text-foreground">{total}</span> / {max}개</span></div><div role="progressbar" aria-label="미끼 적재 현황" aria-valuemin={0} aria-valuemax={max} aria-valuenow={total} aria-valuetext={`미끼 ${total}개 적재, 최소 ${min}개, 최대 ${max}개`} className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{width:`${Math.min(100,total/Math.max(1,max)*100)}%`}}/></div><p className="text-[11px] text-muted-foreground">{total<min?`최소 ${min}개부터 출항 가능`:total===max?'가득 실었어요':'출항 준비 완료'}</p></div>
}
export function BaitCargoSheet(props:Parameters<typeof BaitCargo>[0]&{open:boolean;onOpenChange:(open:boolean)=>void}){
 const [selected,setSelected]=useState('')
 const total=Object.values(props.cargo).reduce((a,b)=>a+b,0)
 return <Dialog open={props.open} onOpenChange={props.onOpenChange}>
   <DialogContent className="notification-sheet inset-x-0 bottom-0 top-auto left-0 flex h-[94dvh] max-h-[54rem] w-full max-w-full translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-t-2xl rounded-b-none bg-popover p-0 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
    <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"/>
    <DialogHeader className="shrink-0 px-4 py-4 pr-12"><DialogTitle className="flex items-center gap-2 text-base font-normal"><img src="/branding/pongi-starfish.png" alt="" aria-hidden="true" className="size-5 object-contain"/>미끼 선택하기</DialogTitle><DialogDescription className="text-xs">미끼를 골라 수량을 조절해주세요. 여러 종류를 함께 실을 수 있어요.</DialogDescription></DialogHeader>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4"><BaitCargo {...props} selectedId={selected} onSelect={setSelected}/>{!props.baits.some(b=>(props.inventory[b.id]??0)>0)&&<p className="py-4 text-sm text-muted-foreground">보유한 미끼가 없어요. <Link to="/shop?tab=bait" className="text-primary underline">상점에서 준비하기</Link></p>}</div>
    <div className="shrink-0 border-t px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"><CargoMeter total={total} min={props.vessel.min_baits} max={props.vessel.max_baits}/><Button className="min-h-12 w-full rounded-xl" disabled={total<props.vessel.min_baits||total>props.vessel.max_baits} onClick={()=>props.onOpenChange(false)}>적재 완료 · {total}개</Button></div>
   </DialogContent>
  </Dialog>
}

export function BaitCargo({baits,inventory,cargo,vessel,onChange,selectedId,onSelect}:{selectedId?:string;onSelect?:(id:string)=>void;baits:ExpeditionState['baits'];inventory:Record<string,number>;cargo:Record<string,number>;vessel:Vessel;onChange:(id:string,value:number)=>void}){
 const available=baits.filter(b=>(inventory[b.id]??0)>0)
 const [localSelected,setLocalSelected]=useState(''),[info,setInfo]=useState<string|null>(null)
 const current=available.find(b=>b.id===(selectedId??localSelected))??available[0]
 const total=Object.values(cargo).reduce((a,b)=>a+b,0)
 const max=(id:string)=>Math.min(inventory[id]??0,vessel.max_baits-total+(cargo[id]??0))
 function select(id:string){if(onSelect)onSelect(id);else setLocalSelected(id)}
 function change(id:string,value:number){select(id);onChange(id,Math.max(0,Math.min(Math.floor(value)||0,max(id))))}
 return <div className="space-y-3">
  <div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">여러 종류를 함께 실을 수 있어요.</p><button type="button" className="min-h-9 px-2 text-xs text-primary disabled:opacity-40" disabled={!total} onClick={()=>{for(const id of Object.keys(cargo))onChange(id,0)}}>비우기</button></div>
  <div className="grid grid-cols-3 gap-2" aria-label="적재할 미끼 종류">{available.map(b=>{
   const amount=cargo[b.id]??0,remaining=Math.max(0,(inventory[b.id]??0)-amount)
   return <div key={b.id} className={`relative min-w-0 rounded-xl border p-1 ${amount?'border-primary/40 bg-primary/5':current?.id===b.id?'border-border bg-secondary/35':'border-transparent bg-secondary/20'}`}>
    <button type="button" className="flex w-full flex-col items-center text-center outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`${b.name} 빠른 적재 선택`} aria-pressed={current?.id===b.id} onClick={()=>select(b.id)}>
     <img src={b.image_path} alt="" className="size-9 object-contain"/>
     <span className="mt-1 flex h-7 items-center justify-center text-[10px] leading-[14px] [overflow-wrap:anywhere]">{b.name}</span>
     <span aria-label={`${b.name} 내 미끼 잔량 ${remaining}개`} className="text-[10px] tabular-nums text-muted-foreground">보유 {remaining}</span>
    </button>
    {amount>0&&<span aria-label={`적재 ${amount}개`} className="pointer-events-none absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-2.5"/></span>}
    <div className="mt-1.5 flex items-center rounded-lg bg-background/80">
     <button type="button" aria-label={`${b.name} 한 개 빼기`} disabled={!amount} onClick={()=>change(b.id,amount-1)} className="grid min-h-9 min-w-0 flex-1 place-items-center rounded-l-lg text-primary disabled:opacity-25"><Minus className="size-3.5"/></button>
     <Input aria-label={`${b.name} 적재량`} type="number" inputMode="numeric" min={0} max={max(b.id)} value={amount} onFocus={()=>select(b.id)} onChange={event=>change(b.id,Number(event.target.value))} className="h-9 w-8 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-center text-sm tabular-nums shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"/>
     <button type="button" aria-label={`${b.name} 한 개 더 싣기`} disabled={amount>=max(b.id)} onClick={()=>change(b.id,amount+1)} className="grid min-h-9 min-w-0 flex-1 place-items-center rounded-r-lg text-primary disabled:opacity-25"><Plus className="size-3.5"/></button>
    </div>
    <button type="button" aria-label={`${b.name} 효과 보기`} onClick={()=>setInfo(b.id)} className="absolute left-0 top-0 grid size-7 place-items-center rounded-lg text-muted-foreground"><Info className="size-3.5"/></button>
   </div>
  })}</div>
  {current&&<div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><div className="min-w-0"><p className="text-xs">{current.name}</p><p className="mt-1 text-[10px] text-muted-foreground">내 미끼 {Math.max(0,(inventory[current.id]??0)-(cargo[current.id]??0))}개 남음</p></div><div className="flex gap-1"><Button variant="secondary" className="min-h-10 px-2 text-[11px]" disabled={total>=vessel.min_baits||(cargo[current.id]??0)>=max(current.id)} onClick={()=>change(current.id,(cargo[current.id]??0)+Math.max(0,vessel.min_baits-total))}>최소 채우기</Button><Button variant="secondary" className="min-h-10 px-2 text-[11px]" disabled={(cargo[current.id]??0)>=max(current.id)} onClick={()=>change(current.id,max(current.id))}>가득 싣기</Button></div></div>}
  <Dialog open={!!info} onOpenChange={open=>{if(!open)setInfo(null)}}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>{baits.find(b=>b.id===info)?.name}</DialogTitle><DialogDescription>{info?baitEffects[info]??'미끼의 특성에 따라 다양한 개체를 만날 수 있어요.':''}</DialogDescription></DialogHeader></DialogContent></Dialog>
 </div>
}

