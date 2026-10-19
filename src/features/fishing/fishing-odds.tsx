import {rarities,type Rarity} from '@/lib/game/rarity'
import type {FishingBait} from './api'

export function FishingOdds({bait,successChanceBp}:{bait?:FishingBait;successChanceBp?:number}){
 const chance=bait?.successChanceBp??bait?.baseSuccessChanceBp??(bait?.id==='bait'?successChanceBp:undefined)
 const keys=Object.keys(rarities) as Rarity[]
 const total=bait?keys.reduce((sum,key)=>sum+bait[`${key}_bp`],0):0
 const percent=(value:number)=>`${Number(value.toFixed(2))}%`
 return <aside aria-label="현재 미끼 낚시 확률" className="border-b border-border/70 bg-background px-3 py-2 text-[10px] text-muted-foreground">
  <div className="mb-1 flex items-center justify-between gap-2"><span>낚시 성공률 <strong className="ml-1 text-xs font-medium tabular-nums text-primary">{chance===undefined?'—':percent(chance/100)}</strong></span><span>{bait?.effect_kind==='decoration'?'장식물 전용':'성공 시 등급 확률'}</span></div>
  {total>0&&<ul className="grid grid-cols-4 gap-1">{keys.map(key=><li key={key} className="flex items-center justify-center gap-1 whitespace-nowrap"><span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{backgroundColor:rarities[key].effectColor}}/><span>{rarities[key].label}</span><span className="tabular-nums text-foreground">{percent(bait![`${key}_bp`]/total*100)}</span></li>)}</ul>}
 </aside>
}
