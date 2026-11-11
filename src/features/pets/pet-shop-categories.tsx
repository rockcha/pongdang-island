import {Fish} from 'lucide-react'
import {appArt} from '@/components/app-art'

export type PetShopCategory = 'food' | 'bait'
export function PetShopCategories({value,onChange}:{value:PetShopCategory;onChange:(value:PetShopCategory)=>void}){
 return <nav aria-label="펫 상점 종류" className="pet-shop-categories grid grid-cols-2 border-b border-border">
  {([['food','사료',appArt.petFood],['bait','미끼',Fish]] as const).map(([id,label,Icon])=><button key={id} type="button" aria-pressed={value===id} onClick={()=>onChange(id)} className={`flex min-h-12 items-center justify-center gap-2 rounded-none border-border text-sm first:border-r ${value===id?'bg-secondary font-medium text-primary':'text-muted-foreground'}`}><Icon className={`size-6 ${value===id?'':'grayscale opacity-55'}`}/>{label}</button>)}
 </nav>
}
