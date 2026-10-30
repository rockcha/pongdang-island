import {useRef,useState} from 'react'
import {Minus,Plus} from 'lucide-react'
import {toast} from 'sonner'
import {Button} from '@/components/ui/button'

export function FishSizeEditor({scale,busy,onChange}:{scale:number;busy:boolean;onChange:(scale:number)=>Promise<void>}){
 const lock=useRef(false)
 const [saving,setSaving]=useState(false)
 async function change(next:number){
  if(busy||lock.current)return
  lock.current=true;setSaving(true)
  try{await onChange(next)}catch{toast.error('크기를 저장하지 못했어요. 다시 시도해주세요.')}finally{lock.current=false;setSaving(false)}
 }
 return <div role="group" aria-label="물고기 크기" aria-busy={saving} className="flex min-h-11 w-full items-center">
  <span className="mr-auto w-9 text-[11px] text-muted-foreground">크기</span>
  <Button variant="ghost" size="icon" aria-label="물고기 크기 줄이기" className="size-9 shrink-0" disabled={busy||saving||scale<=.5} onClick={()=>void change(Math.max(.5,Math.round((scale-.1)*100)/100))}><Minus className="size-4"/></Button>
  <output aria-label="현재 크기" className="min-w-12 text-center text-xs tabular-nums">{Math.round(scale*100)}%</output>
  <Button variant="ghost" size="icon" aria-label="물고기 크기 키우기" className="size-9 shrink-0" disabled={busy||saving||scale>=2} onClick={()=>void change(Math.min(2,Math.round((scale+.1)*100)/100))}><Plus className="size-4"/></Button>
 </div>
}
