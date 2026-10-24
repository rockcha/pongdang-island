import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { clampTankView } from './tank-world'
import { useEffect, useState } from 'react'

export function TankPanControls({view,busy=false,onMove,onCollapse}:{view:number;busy?:boolean;onMove:(position:number)=>void;onCollapse?:()=>void}) {
  const [requested,setRequested]=useState<number|null>(null)
  useEffect(()=>{if(requested!==null&&Math.abs(view-requested)<.002)setRequested(null)},[view,requested])
  useEffect(()=>{if(requested===null)return;const timer=setTimeout(()=>setRequested(null),1600);return()=>clearTimeout(timer)},[requested])
  function move(position:number){setRequested(position);onMove(position)}
  return <div role="group" aria-label="어항 가로 이동" className="mx-auto flex w-fit items-center gap-1 rounded-xl border border-white/30 bg-background/80 p-1 shadow-sm">
    <Button variant="ghost" size="icon" aria-label="어항 왼쪽으로 조금 이동" className="min-h-11 min-w-11" disabled={busy||view<=0} onClick={()=>move(clampTankView((requested??view)-.15))}><ChevronLeft className="size-4"/></Button>
    <Button variant="ghost" size="icon" aria-label="어항 오른쪽으로 조금 이동" className="min-h-11 min-w-11" disabled={busy||view>=2} onClick={()=>move(clampTankView((requested??view)+.15))}><ChevronRight className="size-4"/></Button>
    {onCollapse&&<Button variant="ghost" size="icon" aria-label="수조 이동 메뉴 최소화" aria-expanded={true} className="min-h-11 min-w-11 border-l border-border/50" onClick={onCollapse}><ChevronDown className="size-3.5"/></Button>}
  </div>
}
