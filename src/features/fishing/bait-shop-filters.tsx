import {Search,X} from 'lucide-react'
import {appArt} from '@/components/app-art'
import {IslandSelect} from '@/components/island-select'
import type {FishingBait} from './api'
import {baitTargetKinds} from './bait-info'

type Target='all'|'fish'|'trash'|'decoration'
export type BaitShopFilter={search:string;target:Target}
export const initialBaitShopFilter:BaitShopFilter={search:'',target:'all'}
const targetOptions=[
 {value:'all',label:'전체 대상',icon:<appArt.all className="size-6"/>},
 {value:'fish',label:'물고기',icon:<appArt.fish className="size-6"/>},
 {value:'trash',label:'쓰레기',icon:<appArt.trash className="size-6"/>},
 {value:'decoration',label:'장식물',icon:<appArt.decoration className="size-6"/>},
] as const

export function filterBaitShop(items:FishingBait[],filter:BaitShopFilter){
 const search=filter.search.trim().toLocaleLowerCase()
 return items.filter(item=>(!search||`${item.name} ${item.description}`.toLocaleLowerCase().includes(search))
  &&(filter.target==='all'||baitTargetKinds(item).includes(filter.target)))
}

export function BaitShopFilters({value,onChange}:{value:BaitShopFilter;onChange:(value:BaitShopFilter)=>void}){
 return <div role="search" aria-label="미끼 검색 및 필터" className="sticky top-0 z-20 flex items-center gap-2 border-b border-border/60 bg-background px-3 py-3">
  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-primary/15 bg-card px-3 focus-within:ring-2 focus-within:ring-ring">
   <Search aria-hidden="true" className="size-4 shrink-0 text-primary/65"/>
   <input type="search" aria-label="미끼 검색" placeholder="미끼 이름이나 설명 검색" value={value.search} onChange={event=>onChange({...value,search:event.target.value})} className="h-11 min-w-0 flex-1 bg-transparent text-xs outline-none [&::-webkit-search-cancel-button]:appearance-none"/>
   {value.search&&<button type="button" aria-label="미끼 검색 지우기" onClick={()=>onChange({...value,search:''})} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X aria-hidden="true" className="size-3.5"/></button>}
  </div>
  <div className="shrink-0">
   <IslandSelect label="미끼 포획 대상" value={value.target} onChange={target=>onChange({...value,target})} options={targetOptions}/>
  </div>
 </div>
}
