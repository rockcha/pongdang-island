import {useState} from 'react'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog'
import {CollectiblePreview} from '@/features/collection/collectible-preview'
import {weatherNames,type WeatherKind} from './weather'
import {weatherPracticePool} from './weather-creatures'

export function WeatherCreaturePicker({kind,selected,onSelect}:{kind:WeatherKind;selected:string;onSelect:(id:string)=>void}){
 const [open,setOpen]=useState(false)
 return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button variant="ghost" className="pointer-events-auto mt-1 h-9 border border-white/20 bg-slate-950/40 px-3 text-xs text-white hover:bg-slate-950/60 hover:text-white"/>}>퐁이 선택</DialogTrigger><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{weatherNames[kind]} 퐁이</DialogTitle><DialogDescription>유영하는 모습을 확인하고 연습할 퐁이를 선택하세요. 미끼와 보상은 사용하지 않아요.</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-2">{weatherPracticePool(kind).map(species=><button key={species.id} type="button" aria-label={`${species.name} 선택`} aria-pressed={selected===species.id} onClick={()=>{onSelect(species.id);setOpen(false)}} className={`flex min-w-0 flex-col items-center rounded-xl border p-2 text-xs ${selected===species.id?'border-primary bg-secondary':'border-border'}`}><CollectiblePreview species={species}/><span className="mt-1">{species.name}</span><span className="mt-1 tabular-nums text-muted-foreground">판매가 {species.sell_price.toLocaleString()}골드</span></button>)}</div></DialogContent></Dialog>
}
