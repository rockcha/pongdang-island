import { useState } from 'react'
import { FlipHorizontal2, Minus, Plus, RotateCw, RotateCcw, Pin, PinOff } from 'lucide-react'
import type {LucideIcon} from 'lucide-react'
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
 return <section aria-label={`${name} 꾸미기`} aria-busy={saving} className="w-full text-xs">
  <TooltipProvider>{[['크기',[3,4]],['방향',[1,2,0]],...(allowPositionLock?[['위치',[5]]]:[])].map(([title,indices])=><div key={String(title)} className="flex min-h-11 items-center gap-1 border-b border-border/40 last:border-0">
   <span className="w-9 shrink-0 text-[11px] text-muted-foreground">{String(title)}</span>
   <div className="flex flex-1 items-center justify-end">{(indices as number[]).map(index=>{const {label,icon:Icon,disabled,next,pressed}=controls[index];return <span key={label} className="flex items-center"><Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" className={`size-11 shrink-0 ${pressed?'bg-primary/10 text-primary':''}`} aria-label={label} aria-pressed={index===0?value.flipped:pressed} disabled={busy||saving||disabled} onClick={()=>void change(next)}/>}><Icon className="size-4"/></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>{index===3&&<output aria-label="현재 크기" className="w-12 text-center text-xs tabular-nums">{Math.round(value.scale*100)}%</output>}</span>})}</div>
  </div>)}</TooltipProvider>
 </section>
}
