import {Search} from 'lucide-react'
import {Input} from '@/components/ui/input'

export function CollectibleSearchInput({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 return <div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input type="search" aria-label="이름 검색" placeholder="이름 검색" value={value} onChange={event=>onChange(event.target.value)} disabled={disabled} className="h-11 min-w-0 rounded-xl bg-secondary/60 pl-9 text-sm"/></div>
}
