import {Minus,Plus} from 'lucide-react'

export function PetPurchaseQuantity({value,max=99,disabled=false,onChange}:{value:number;max?:number;disabled?:boolean;onChange:(value:number)=>void}){
 const limit=Math.max(1,max)
 return <div className="space-y-2">
  <span className="text-xs text-muted-foreground">구매 수량</span>
  <div className="flex h-12 items-center rounded-xl border border-border/70 bg-background focus-within:ring-2 focus-within:ring-ring/30">
   <button type="button" aria-label="구매 수량 줄이기" disabled={disabled||value<=1} className="grid h-12 w-12 shrink-0 place-items-center rounded-l-xl text-muted-foreground disabled:opacity-30" onClick={()=>onChange(Math.max(1,value-1))}><Minus className="size-4"/></button>
   <input aria-label="구매 수량" type="number" inputMode="numeric" min={1} max={limit} value={value} disabled={disabled} onChange={e=>onChange(Math.max(1,Math.min(limit,Math.floor(Number(e.target.value))||1)))} className="h-full min-w-0 flex-1 appearance-none bg-transparent text-center text-base tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]"/>
   <button type="button" aria-label="구매 수량 늘리기" disabled={disabled||value>=max} className="grid h-12 w-12 shrink-0 place-items-center rounded-r-xl text-muted-foreground disabled:opacity-30" onClick={()=>onChange(Math.min(limit,value+1))}><Plus className="size-4"/></button>
  </div>
 </div>
}
