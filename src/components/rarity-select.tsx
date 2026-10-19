import { Select } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
import { RarityBadge } from './rarity-badge'
// Default worm's rarity distribution after a successful catch; modifiers can change it.
const baseCatchRates:Record<Rarity,string>={common:'77%',rare:'20%',epic:'2.7%',mythic:'0.3%'}
function RarityOption({rarity}:{rarity:Rarity}){return <span className="inline-flex items-center gap-2"><RarityBadge rarity={rarity}/><span className="text-[11px] tabular-nums text-muted-foreground">{baseCatchRates[rarity]}</span></span>}
export type RarityFilter = 'all' | Rarity
export function RaritySelect({value,onChange,disabled=false}:{value:RarityFilter;onChange:(value:RarityFilter)=>void;disabled?:boolean}){
 const items=[{value:'all',label:'전체 등급'},...Object.entries(rarities).map(([value,meta])=>({value,label:`${meta.label} ${baseCatchRates[value as Rarity]}`}))]
 return <Select.Root value={value} disabled={disabled} items={items} onValueChange={next=>{if(next!==null)onChange(next as RarityFilter)}}><Select.Trigger aria-label="등급 선택" className="flex min-h-11 min-w-32 items-center justify-between gap-3 rounded-xl border border-border bg-secondary/60 px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><Select.Value>{value==='all'?'전체 등급':<RarityOption rarity={value}/>}</Select.Value><Select.Icon><ChevronDown className="size-4"/></Select.Icon></Select.Trigger><Select.Portal><Select.Positioner sideOffset={5} className="z-[70]"><Select.Popup className="min-w-36 rounded-xl border bg-popover p-1 shadow-lg"><Select.List>{items.map(item=><Select.Item key={item.value} value={item.value} aria-label={item.label} className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg px-3 outline-none data-highlighted:bg-secondary"><Select.ItemText>{item.value==='all'?<span className="text-xs">전체 등급</span>:<RarityOption rarity={item.value as Rarity}/>}</Select.ItemText><Select.ItemIndicator><Check className="size-4"/></Select.ItemIndicator></Select.Item>)}</Select.List><p className="border-t px-3 py-2 text-[10px] text-muted-foreground">기본 미끼 낚시 성공 기준</p></Select.Popup></Select.Positioner></Select.Portal></Select.Root>
}
