import {DailyOrderBadge} from '@/features/merchant/daily-order-badge'
import {TreasureTrashBadge} from '@/features/collection/treasure-trash-badge'
import {Check,Minus,Plus} from 'lucide-react'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {GoldIcon} from '@/features/gold/gold-provider'
import type {Species} from '@/features/collection/api'
export function CollectibleQuantityCard({species,count,value,disabled,dailyOrder=false,recent=false,max=count,onChange}:{species:Species;count:number;value:number;disabled:boolean;dailyOrder?:boolean;recent?:boolean;max?:number;onChange:(value:number)=>void}){
 const rarityBackground={common:'bg-card',rare:'bg-blue-50 dark:bg-blue-950/40',epic:'bg-purple-50 dark:bg-purple-950/40',mythic:'bg-amber-50 dark:bg-amber-950/40'}[species.rarity]??'bg-card'
 return <div className={`relative isolate min-w-0 overflow-hidden border-r border-b border-border/60 ${rarityBackground}`}>
  <button type="button" className="flex h-36 w-full min-w-0 flex-col items-center justify-center gap-1 px-2 pt-6 pb-2 text-center" aria-label={species.name+' 선택'} aria-pressed={value>0} disabled={disabled||(!value&&max===0)} onClick={()=>onChange(value?0:1)}>
   <span aria-hidden="true" className={`absolute left-1.5 top-1.5 grid size-4 place-items-center rounded-full border ${value?'border-primary bg-primary text-primary-foreground':'border-border'}`}>{value>0&&<Check className="size-3"/>}</span>
   <span className="absolute right-1.5 top-1.5 rounded-full bg-secondary px-1.5 text-[10px] leading-4 tabular-nums text-primary">×{count}</span>
   {recent&&<span className="absolute inset-x-6 top-1.5 text-center text-[9px] font-medium leading-4 text-primary">🎣 이번 낚시</span>}
   <span className="pointer-events-none absolute left-1 top-7 flex flex-col gap-0.5">{dailyOrder&&<DailyOrderBadge/>}<TreasureTrashBadge speciesId={species.id}/></span>
   <CollectibleThumbnail loading="lazy" species={species} path={species.thumbnail_path} name={species.name} className="size-14 shrink-0"/><span className="block h-4 w-full truncate text-[11px] leading-4" title={species.name}>{species.name}</span>
   <span className="flex items-center gap-1 text-[11px] tabular-nums text-primary" aria-label={`개당 ${species.sell_price??0} 골드`}><GoldIcon className="size-4"/>{(species.sell_price??0).toLocaleString('ko-KR')}</span>
  </button>
  <div className="grid grid-cols-[1fr_1fr_1fr] items-center border-t border-border/60 bg-background/60">
   <button type="button" className="grid min-h-11 place-items-center text-primary disabled:opacity-30" aria-label={species.name+' 수량 줄이기'} disabled={disabled||value===0} onClick={()=>onChange(value-1)}><Minus className="size-3.5"/></button>
   <input type="text" inputMode="numeric" pattern="[0-9]*" aria-label={species.name+' 선택 수량'} value={value} disabled={disabled} onFocus={event=>event.target.select()} onChange={event=>{if(/^\d*$/.test(event.target.value))onChange(Math.min(max,Number(event.target.value)))}} className="h-11 w-full min-w-0 bg-transparent text-center text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"/>
   <button type="button" className="grid min-h-11 place-items-center text-primary disabled:opacity-30" aria-label={species.name+' 수량 늘리기'} disabled={disabled||value>=max} onClick={()=>onChange(value+1)}><Plus className="size-3.5"/></button>
  </div>
  {value>0&&<span aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 border-2 border-primary"/>}
 </div>
}
