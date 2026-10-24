import {useRef,useState} from 'react'
import {Check,ChevronDown,ChevronRight,Plus,Pencil,GripVertical,ArrowUp,ArrowDown} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog'
import {backgroundUrl} from './api'

type Tank={id:string;name:string;background_id:string}
export function AquariumTankPicker({tanks,selectedId,backgrounds,busy,onSelect,onAdd,onRename,onReorder}:{
 tanks:Tank[];selectedId:string;backgrounds:{id:string;image_path:string}[];busy:boolean
 onSelect:(id:string)=>void;onAdd:()=>void;onRename?:(id:string)=>void
 onReorder?:(ids:string[],expectedIds:string[])=>Promise<void>
}){
 const [open,setOpen]=useState(false),[editing,setEditing]=useState(false)
 const [draft,setDraft]=useState<string[]>([]),[expected,setExpected]=useState<string[]>([])
 const [saving,setSaving]=useState(false),[error,setError]=useState(''),[dragging,setDragging]=useState<string|null>(null)
 const saveLock=useRef(false)
 const list=useRef<HTMLDivElement>(null)
 const disabled=busy||saving
 const shown=editing?draft.flatMap(id=>{const tank=tanks.find(t=>t.id===id);return tank?[tank]:[]}):tanks
 const changed=draft.join(',')!==expected.join(',')
 function move(id:string,to:number){
  setDraft(previous=>{const next=[...previous],from=next.indexOf(id);if(from<0||to<0||to>=next.length)return previous;next.splice(from,1);next.splice(to,0,id);return next})
  setError('')
  if(to===0)requestAnimationFrame(()=>{if(list.current)list.current.scrollTop=0})
 }
 function close(next:boolean){if(saveLock.current)return;setOpen(next);if(!next){setEditing(false);setDragging(null);setError('')}}
 async function save(){
  if(!onReorder||disabled||saveLock.current||!changed)return
  saveLock.current=true;setSaving(true);setError('')
  try{await onReorder(draft,expected);setEditing(false)}catch(cause){setError(cause instanceof Error?cause.message:'순서를 저장하지 못했어요. 다시 시도해 주세요.')}
  finally{saveLock.current=false;setSaving(false)}
 }
 return <Dialog open={open} onOpenChange={close}>
  <DialogTrigger render={<Button variant="ghost" className="min-h-11 max-w-full px-2" disabled={busy} aria-label="어항 선택"/>}>
   <span className="truncate text-sm">{tanks.find(t=>t.id===selectedId)?.name}</span><ChevronDown className="size-3.5 shrink-0"/>
  </DialogTrigger>
  <DialogContent className="notification-sheet bottom-0 top-auto left-0 max-w-full translate-x-0 translate-y-0 gap-4 rounded-t-xl rounded-b-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
   <DialogHeader>
    <div className="flex min-h-9 items-center justify-between gap-2 pr-7">
     <DialogTitle>{editing?'어항 순서 편집':'내 어항'}</DialogTitle>
     {!editing&&onReorder&&tanks.length>1&&<Button variant="ghost" className="min-h-11 px-2 text-xs" disabled={disabled} onClick={()=>{const ids=tanks.map(t=>t.id);setDraft(ids);setExpected(ids);setError('');setEditing(true)}}>순서 편집</Button>}
    </div>
    <DialogDescription className="text-left text-xs leading-5">첫번째 어항은 친구들이 방문했을 때 보여지는 대표 어항입니다.</DialogDescription>
   </DialogHeader>
   {editing&&<p className="text-[11px] leading-5 text-muted-foreground">손잡이를 끌거나 화살표로 순서를 바꿔주세요.</p>}
   <div ref={list} role="list" aria-label={editing?'편집 중인 어항 순서':'내 어항 목록'} className="max-h-[48dvh] space-y-2 overflow-y-auto overscroll-contain">
    {shown.map((tank,i)=>{
     const background=backgrounds.find(b=>b.id===tank.background_id)
     const image=<span className={`${editing?'size-10':'size-14'} shrink-0 overflow-hidden rounded-md bg-secondary`}>{background&&<img src={backgroundUrl(background.image_path)} alt="" draggable={false} className="size-full object-cover"/>}</span>
     const label=<span className="min-w-0 flex-1"><span className="block truncate text-sm">{tank.name}</span><span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground"><span>{i+1}번째 어항</span>{i===0&&<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">대표</span>}</span></span>
     return <div role="listitem" data-tank-order-id={tank.id} key={tank.id} className={`rounded-lg border border-border ${dragging===tank.id?'border-primary bg-primary/10':!editing&&tank.id===selectedId?'bg-secondary':''}`}>
      {editing?<div className="flex min-h-24 items-center gap-1 p-1.5">
       <button type="button" disabled={disabled} className="flex min-h-11 w-8 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary" aria-label={`${tank.name} 순서 끌어서 이동`} onKeyDown={event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();move(tank.id,i+(event.key==='ArrowUp'?-1:1))}}}
        onPointerDown={event=>{if(disabled||event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture?.(event.pointerId);setDragging(tank.id)}}
        onPointerMove={event=>{if(disabled||dragging!==tank.id)return;const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-tank-order-id]')?.getAttribute('data-tank-order-id');if(target&&target!==tank.id){const index=draft.indexOf(target);if(index>=0)move(tank.id,index)}}}
        onPointerUp={()=>setDragging(null)} onPointerCancel={()=>setDragging(null)}><GripVertical aria-hidden="true" className="size-4"/></button>
       {image}<div className="min-w-0 flex-1 pl-1">{label}{i>0&&<button type="button" disabled={disabled} onClick={()=>move(tank.id,0)} className="mt-1 min-h-9 text-[11px] text-primary underline underline-offset-4" aria-label={`${tank.name} 맨 앞으로`}>맨 앞으로</button>}</div>
       <div className="flex shrink-0 flex-col"><Button variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={disabled||i===0} aria-label={`${tank.name} 위로`} onClick={()=>move(tank.id,i-1)}><ArrowUp aria-hidden="true" className="size-4"/></Button><Button variant="ghost" size="icon" className="min-h-11 min-w-11" disabled={disabled||i===shown.length-1} aria-label={`${tank.name} 아래로`} onClick={()=>move(tank.id,i+1)}><ArrowDown aria-hidden="true" className="size-4"/></Button></div>
      </div>:<div className="flex items-center">
       <button type="button" disabled={disabled} aria-label={`${tank.name} 어항으로 들어가기`} aria-pressed={tank.id===selectedId} onClick={()=>{onSelect(tank.id);close(false)}} className="flex min-h-18 min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-ring">{image}{label}<span className="flex shrink-0 items-center gap-1 text-[11px] text-primary">{tank.id===selectedId&&<Check aria-hidden="true" className="size-3.5"/>}들어가기<ChevronRight aria-hidden="true" className="size-3.5"/></span></button>
       {onRename&&<Button variant="ghost" size="icon" className="mr-1 min-h-11 min-w-11 shrink-0" disabled={disabled} aria-label={`${tank.name} 이름 변경`} onClick={()=>{close(false);onRename(tank.id)}}><Pencil className="size-4"/></Button>}
      </div>}
     </div>
    })}
   </div>
   {editing&&<p role="status" aria-live="polite" className="text-xs text-primary">대표 어항 · {shown[0]?.name}</p>}
   {error&&<p role="alert" className="text-xs leading-5 text-destructive">{error}</p>}
   {editing?<div className="grid grid-cols-2 gap-2"><Button variant="outline" className="min-h-11" disabled={disabled} onClick={()=>{setEditing(false);setError('');setDragging(null)}}>취소</Button><Button className="min-h-11" disabled={disabled||!changed} onClick={()=>void save()}>{saving?'저장 중…':'저장'}</Button></div>:<Button variant="outline" className="min-h-11" disabled={disabled} onClick={()=>{close(false);onAdd()}}><Plus className="size-4"/>어항 추가</Button>}
  </DialogContent>
 </Dialog>
}
