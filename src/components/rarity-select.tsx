import { Select } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
import { RarityBadge } from './rarity-badge'
function RarityOption({rarity}:{rarity:Rarity}){return <span className="inline-flex items-center gap-2"><RarityBadge rarity={rarity}/></span>}
export type RarityFilter = 'all' | Rarity
export function RaritySelect({value,onChange,disabled=false,className=''}:{value:RarityFilter;onChange:(value:RarityFilter)=>void;disabled?:boolean;className?:string}){
 const items=[{value:'all',label:'전체 등급'},...Object.entries(rarities).map(([value,meta])=>({value,label:meta.label}))]
 return <Select.Root value={value} disabled={disabled} items={items} onValueChange={next=>{if(next!==null)onChange(next as RarityFilter)}}><Select.Trigger aria-label="등급 선택" className={`flex min-h-11 ${className?'min-w-0':'min-w-32'} items-center justify-between gap-3 rounded-xl border border-border bg-secondary/60 px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${className}`}><Select.Value>{value==='all'?'전체 등급':<RarityOption rarity={value}/>}</Select.Value><Select.Icon><ChevronDown className="size-4"/></Select.Icon></Select.Trigger><Select.Portal><Select.Positioner sideOffset={5} className="z-[70]"><Select.Popup className="min-w-36 rounded-xl border bg-popover p-1 shadow-lg"><Select.List>{items.map(item=><Select.Item key={item.value} value={item.value} aria-label={item.label} className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg px-3 outline-none data-highlighted:bg-secondary"><Select.ItemText>{item.value==='all'?<span className="text-xs">전체 등급</span>:<RarityOption rarity={item.value as Rarity}/>}</Select.ItemText><Select.ItemIndicator><Check className="size-4"/></Select.ItemIndicator></Select.Item>)}</Select.List></Select.Popup></Select.Positioner></Select.Portal></Select.Root>
}
