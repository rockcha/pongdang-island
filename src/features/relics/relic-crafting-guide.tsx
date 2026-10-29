import {Hammer} from 'lucide-react'

// Agreed rules retained for the future release. Crafting is not available yet.
export const relicCraftingRules=[
 {pair:'희귀 + 희귀',chance:45,cost:3000},
 {pair:'특급 + 희귀',chance:45,cost:3000},
 {pair:'특급 + 특급',chance:40,cost:4000},
 {pair:'신화 + 희귀',chance:40,cost:4000},
 {pair:'신화 + 특급',chance:35,cost:5000},
 {pair:'신화 + 신화',chance:35,cost:5000},
] as const

export function RelicCraftingGuide(){
 return <button type="button" disabled aria-label="유물 세공 준비 중" className="relic-crafting-entry shrink-0">
  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Hammer className="size-5"/></span>
  <span className="min-w-0 flex-1 text-left"><span className="flex items-center gap-2 text-xs font-semibold">유물 세공<span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-normal text-muted-foreground">준비 중</span></span><span className="mt-1 block text-[11px] text-muted-foreground">세공 기능을 준비하고 있어요.</span></span>
 </button>
}
