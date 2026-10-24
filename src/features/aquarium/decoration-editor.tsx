import { useState } from 'react'
import { FlipHorizontal2, Minus, Plus, RotateCw, RotateCcw, Pin, PinOff } from 'lucide-react'
import type {LucideIcon} from 'lucide-react'
import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from '@/components/ui/tooltip'
import type { DecorationPlacement } from '@/features/collection/api'
import { toast } from 'sonner'

export function DecorationEditor({name,value,busy,onChange,allowPositionLock=false}:{name:string;value:DecorationPlacement;busy:boolean;onChange:(value:DecorationPlacement)=>void|Promise<void>;allowPositionLock?:boolean}){
 const [saving,setSaving]=useState(false)
 async function change(next:DecorationPlacement){
  if(busy||saving)return
  setSaving(true)
  try{await onChange(next)}catch{toast.error('꾸미기를 저장하지 못했어요. 다시 시도해주세요.')}finally{setSaving(false)}
 }
 const controls:{label:string;icon:LucideIcon;disabled:boolean;next:DecorationPlacement;pressed?:boolean}[]=[
  {label:'좌우 반전',icon:FlipHorizontal2,disabled:false,next:{...value,flipped:!value.flipped}},
  {label:'반시계 방향 15도 회전',icon:RotateCcw,disabled:false,next:{...value,rotation:(value.rotation+345)%360}},
  {label:'시계 방향 15도 회전',icon:RotateCw,disabled:false,next:{...value,rotation:(value.rotation+15)%360}},
  {label:'크기 줄이기',icon:Minus,disabled:value.scale<=.5,next:{...value,scale:Math.max(.5,Math.round((value.scale-.1)*100)/100)}},
  {label:'크기 키우기',icon:Plus,disabled:value.scale>=2,next:{...value,scale:Math.min(2,Math.round((value.scale+.1)*100)/100)}},
  ...(allowPositionLock?[{label:value.position_locked?'위치 고정 해제':'위치 고정',icon:value.position_locked?PinOff:Pin,disabled:false,pressed:!!value.position_locked,next:{...value,position_locked:!value.position_locked}}]:[]),
 ]
 return <section aria-label={`${name} 꾸미기`} aria-busy={saving} className={`flex h-11 max-w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background/60 p-0.5 shadow-none ${allowPositionLock?'w-[276px]':'w-[236px]'}`}>
  <TooltipProvider>{controls.map(({label,icon:Icon,disabled,next,pressed},index)=><Fragment key={label}>
    {index>0&&<span aria-hidden="true" className="h-4 w-px shrink-0 bg-foreground/20"/>}
    <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" className={`h-10 w-10 flex-none rounded-none border-0 ${pressed?'bg-primary/10 text-primary':''}`} aria-label={label} aria-pressed={pressed} disabled={busy||saving||disabled} onClick={()=>void change(next)}/>}><Icon className="size-3.5"/></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>
    {label==='크기 줄이기'&&<output aria-label="현재 크기" className="w-6 shrink-0 text-center text-[10px] tabular-nums">{Number(value.scale.toFixed(1))}×</output>}
  </Fragment>)}</TooltipProvider>
 </section>
}
