import {Plus} from 'lucide-react'
import {RelicArtwork} from './relic-artwork'
import {Button} from '@/components/ui/button'
import {RarityBadge} from '@/components/rarity-badge'
import {RelicIcon} from '@/components/collection-filter-icons'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import type {Relic} from './api'
export type RelicTransition={id:string;kind:'equip'|'unequip';relic:Relic}

export function relicEffectDescription(description:string){
 return description
  .replace(/^장착한 상태로 출항하는 어선의 항해 시간이 (\d+)% 줄어들어요\. 진행 중인 항해와 통발에는 적용되지 않아요\.$/,'어선 항해 시간 $1% 단축')
  .replace(/\s*·?\s*장착 중에만 (?:효과가 적용돼요|발동됩니다)\.?\s*$/,'').trim()
}

export function RelicEffectText({description}:{description:string}){
 return <>{relicEffectDescription(description)}</>
}

export function RelicEquipmentSlot({relic,transition,disabled,canChoose,onChoose,onUnequip}:{relic?:Relic;transition?:RelicTransition|null;disabled:boolean;canChoose:boolean;onChoose:()=>void;onUnequip:()=>void}){
 return <section aria-label="장착 슬롯" data-relic-rarity={transition?.relic.rarity??relic?.rarity} className="relic-slot relic-equipment-panel relative isolate shrink-0">
  <div className="flex items-center justify-between"><h3 className="text-xs font-semibold text-primary">장착 유물</h3>{relic&&<Button size="sm" variant="ghost" className="h-8 px-2 text-[11px] text-muted-foreground" disabled={disabled} onClick={onUnequip}>해제</Button>}</div>
  {transition&&<div key={transition.id} aria-hidden="true" data-transition={transition.kind} className="relic-transition pointer-events-none absolute left-10 top-20 z-10 grid size-12 place-items-center">
   {transition.kind==='unequip'&&<div className="relic-departing-art absolute inset-0"><CollectibleThumbnail path={transition.relic.thumbnail_path} name="" className="size-12"/></div>}
   <span className="relic-transition-flash absolute -inset-5 rounded-full"/>
   {[0,1,2].map(i=><span key={i} className="relic-transition-ring relic-equip-pulse absolute -inset-1 rounded-full"/>)}
   <span className="relic-transition-sparks absolute -inset-8 rounded-full"/>
  </div>}
  {relic?<div className="flex items-center gap-5 py-3">
   <div className="relic-equipped-art relic-equipped-medallion relative isolate grid size-24 shrink-0 place-items-center"><RelicArtwork relic={relic} name={`장착 중: ${relic.name}`} className="relative size-20"/></div>
   <div className="min-w-0 flex-1"><RarityBadge rarity={relic.rarity}/><p className="mt-2 text-base font-semibold leading-6">{relic.name}</p><p className="mt-2 text-xs leading-5 text-muted-foreground"><span className="mb-0.5 block text-[10px] text-primary">현재 효과</span><RelicEffectText description={relic.description}/></p></div>
  </div>:<button type="button" aria-label="유물 선택" disabled={disabled||!canChoose} onClick={onChoose} className="mt-3 flex min-h-28 w-full items-center gap-4 rounded-xl border border-dashed border-border/70 px-4 text-left text-xs text-muted-foreground outline-none transition-colors hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default">
   <RelicIcon className="size-10 shrink-0 opacity-35"/><span className="flex-1">유물을 선택해 주세요</span><Plus aria-hidden="true" className="size-4 shrink-0 opacity-55"/>
  </button>}
 </section>
}
