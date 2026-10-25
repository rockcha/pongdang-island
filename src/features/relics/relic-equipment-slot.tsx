import {Plus} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {RarityBadge} from '@/components/rarity-badge'
import {RelicIcon} from '@/components/collection-filter-icons'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import type {Relic} from './api'
export type RelicTransition={id:string;kind:'equip'|'unequip';relic:Relic}

export function relicEffectDescription(description:string){
 return description.replace(/\s*·?\s*장착 중에만 (?:효과가 적용돼요|발동됩니다)\.?\s*$/,'').trim()
}

export function RelicEffectText({description}:{description:string}){
 return <>{relicEffectDescription(description)}</>
}

export function RelicEquipmentSlot({relic,transition,disabled,canChoose,onChoose,onUnequip}:{relic?:Relic;transition?:RelicTransition|null;disabled:boolean;canChoose:boolean;onChoose:()=>void;onUnequip:()=>void}){
 return <section aria-label="장착 슬롯" data-relic-rarity={transition?.relic.rarity??relic?.rarity} className="relic-slot relative isolate shrink-0 border-b border-border/50 pb-5">
  <h3 className="mb-3 text-[10px] tracking-wide text-muted-foreground">장착 유물</h3>
  {transition&&<div key={transition.id} aria-hidden="true" data-transition={transition.kind} className="relic-transition pointer-events-none absolute left-3 top-9 z-10 grid size-12 place-items-center">
   {transition.kind==='unequip'&&<div className="relic-departing-art absolute inset-0"><CollectibleThumbnail path={transition.relic.thumbnail_path} name="" className="size-12"/></div>}
   <span className="relic-transition-flash absolute -inset-5 rounded-full"/>
   {[0,1,2].map(i=><span key={i} className="relic-transition-ring relic-equip-pulse absolute -inset-1 rounded-full"/>)}
   <span className="relic-transition-sparks absolute -inset-8 rounded-full"/>
  </div>}
  {relic?<div className="flex items-center gap-3 rounded-xl bg-primary/[0.045] px-3 py-3.5">
   <div className="relic-equipped-art relative isolate grid size-12 shrink-0 place-items-center"><CollectibleThumbnail path={relic.thumbnail_path} name={`장착 중: ${relic.name}`} className="relative size-12"/></div>
   <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-sm font-medium">{relic.name}</p><RarityBadge rarity={relic.rarity}/></div><p className="mt-1 text-[11px] leading-5 text-muted-foreground"><span className="sr-only">현재 효과: </span><RelicEffectText description={relic.description}/></p></div>
   <Button size="sm" variant="ghost" className="shrink-0 px-2 text-xs text-muted-foreground" disabled={disabled} onClick={onUnequip}>해제</Button>
  </div>:<button type="button" aria-label="유물 선택" disabled={disabled||!canChoose} onClick={onChoose} className="flex min-h-20 w-full items-center gap-3 rounded-xl bg-secondary/35 px-3 text-left text-xs text-muted-foreground outline-none transition-colors hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default">
   <RelicIcon className="size-10 shrink-0 opacity-35"/><span className="flex-1">유물을 선택해 주세요</span><Plus aria-hidden="true" className="size-4 shrink-0 opacity-55"/>
  </button>}
 </section>
}
