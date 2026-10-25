import {Plus,Sparkles} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {RarityBadge} from '@/components/rarity-badge'
import {RelicIcon} from '@/components/collection-filter-icons'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import type {Relic} from './api'
import {RelicGold} from './relic-gold'

export function relicEffectDescription(description:string){
 return description.replace(/\s*·?\s*장착 중에만 (?:효과가 적용돼요|발동됩니다)\.?\s*$/,'').trim()
}

export function RelicEffectText({description}:{description:string}){
 return <>{relicEffectDescription(description).split(/(\d[\d,]*\s*골드)/).map((part,index)=>{
  const price=part.match(/^(\d[\d,]*)\s*골드$/)
  return price?<RelicGold key={index} amount={Number(price[1].replaceAll(',',''))}/>:part
 })}</>
}

export function RelicEquipmentSlot({relic,fee,disabled,canChoose,onChoose,onUnequip}:{relic?:Relic;fee:number;disabled:boolean;canChoose:boolean;onChoose:()=>void;onUnequip:()=>void}){
 return <section aria-label="장착 슬롯" className={`shrink-0 rounded-2xl border p-3 sm:p-4 ${relic?'border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background shadow-sm':'border-dashed border-primary/25 bg-secondary/30'}`}>
  <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-xs font-semibold">나의 유물 슬롯</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${relic?'bg-primary/10 text-primary':'bg-muted text-muted-foreground'}`}>{relic?'장착 중':'비어 있음'}</span></div>
  <div className="flex items-center gap-3">
   <div className={`relative grid size-16 shrink-0 place-items-center rounded-2xl border sm:size-20 ${relic?'border-primary/25 bg-background shadow-inner':'border-dashed border-primary/20 bg-background/60'}`}>
    {relic?<CollectibleThumbnail path={relic.thumbnail_path} name={`장착 중: ${relic.name}`} className="size-14 sm:size-16"/>:<><RelicIcon className="size-9 opacity-35"/><Plus aria-hidden="true" className="absolute -bottom-1 -right-1 size-5 rounded-full bg-background p-0.5 text-primary"/></>}
   </div>
   <div className="min-w-0 flex-1">
    {relic?<><div className="flex flex-wrap items-center gap-1.5"><p className="break-keep text-sm font-semibold">{relic.name}</p><RarityBadge rarity={relic.rarity}/></div><p className="mt-1.5 flex items-start gap-1 text-xs leading-5 text-primary"><Sparkles aria-hidden="true" className="mt-1 size-3 shrink-0"/><span><span className="sr-only">현재 효과: </span><RelicEffectText description={relic.description}/></span></p></>:<><p className="text-sm font-semibold">장착 중인 유물이 없어요.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">아래에서 마음에 드는 유물을 골라보세요.</p></>}
   </div>
  </div>
  <div className="mt-3 flex items-center justify-between gap-2 border-t border-primary/10 pt-3"><div className="space-y-1 text-[10px] leading-4 text-muted-foreground"><p>장착 <span className="font-medium text-primary">무료</span></p><p className="flex items-center gap-1">해제·교체 <RelicGold amount={fee}/></p></div>{relic?<Button size="sm" variant="outline" disabled={disabled} onClick={onUnequip}>해제</Button>:<Button size="sm" disabled={disabled||!canChoose} onClick={onChoose}>유물 선택</Button>}</div>
 </section>
}
