import {useEffect,useRef,useState} from 'react'
import {Archive,Check,ChevronLeft,ChevronRight,RefreshCw} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import {AquariumToolButton} from './aquarium-tool-button'
import {loadCollectibleStorage,storageError} from './api'
import type {AquariumState,CollectibleStorage} from './api'

export function CollectibleStorageDialog({state,currentTankId,busy,onAssign}:{state:AquariumState;currentTankId:string;busy:boolean;onAssign:(ids:string[],tankId:string)=>Promise<void>}){
 const [open,setOpen]=useState(false),[page,setPage]=useState(0),[kind,setKind]=useState('all')
 const [query,setQuery]=useState(''),[search,setSearch]=useState(''),[retry,setRetry]=useState(0)
 const [data,setData]=useState<CollectibleStorage|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('')
 const [selection,setSelection]=useState<Set<string>>(new Set()),[target,setTarget]=useState(''),[saving,setSaving]=useState(false)
 const locked=useRef(false)
 const capacity=state.tankCapacity??50
 const targetId=state.tanks.some(t=>t.id===target)?target:currentTankId
 const occupancy=(id:string)=>state.inhabitants.filter(item=>item.tank_id===id).length
 const free=Math.max(0,capacity-occupancy(targetId))
 useEffect(()=>{const timer=setTimeout(()=>{setSearch(query.trim());setPage(0)},250);return()=>clearTimeout(timer)},[query])
 useEffect(()=>{
  if(!open)return
  let active=true
  setLoading(true);setError('');setData(null)
  void loadCollectibleStorage(page*50,search,kind).then(result=>{if(active)setData(result)}).catch(()=>{if(active)setError('보관함을 불러오지 못했어요. 다시 시도해주세요.')}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[open,page,search,kind,retry])
 function toggle(id:string){setSelection(current=>{const next=new Set(current);if(next.has(id))next.delete(id);else if(next.size<50)next.add(id);return next})}
 async function assign(){
  if(locked.current||busy||!selection.size||selection.size>free)return
  locked.current=true;setSaving(true);setError('')
  try{await onAssign([...selection],targetId);setSelection(new Set());setPage(0);setRetry(v=>v+1)}catch(cause){setError(storageError(cause))}finally{locked.current=false;setSaving(false)}
 }
 const disabled=busy||saving
 return <Dialog open={open} onOpenChange={value=>{if(disabled)return;setOpen(value);if(value){setSelection(new Set());setTarget(currentTankId);setPage(0);setRetry(v=>v+1)}}}>
  <AquariumToolButton label="보관함" icon={<Archive className="size-4"/>} count={state.storageCount??0}/>
  <DialogContent className="flex max-h-[88dvh] flex-col gap-3 overflow-y-auto sm:max-w-md">
   <DialogHeader><DialogTitle>보관함 <span className="ml-1 text-sm font-normal text-muted-foreground">{state.storageCount??0}개</span></DialogTitle><DialogDescription>함께 지낼 어항을 골라주세요. 한 번에 50개까지 선택할 수 있어요.</DialogDescription></DialogHeader>
   <Input aria-label="보관함 검색" placeholder="이름으로 찾기" maxLength={60} value={query} disabled={disabled} onChange={event=>setQuery(event.target.value)}/>
   <div role="group" aria-label="보관함 분류" className="grid grid-cols-4 gap-1">{[{id:'all',name:'전체'},{id:'fish',name:'물고기'},{id:'decoration',name:'장식물'},{id:'trash',name:'쓰레기'}].map(item=><Button key={item.id} variant={kind===item.id?'secondary':'ghost'} size="sm" className="min-h-10" aria-pressed={kind===item.id} disabled={disabled} onClick={()=>{setKind(item.id);setPage(0)}}>{item.name}</Button>)}</div>
   <div className="flex items-center justify-between text-xs"><span className="text-primary" aria-live="polite">{selection.size}개 선택</span><div className="flex gap-1"><Button variant="ghost" size="sm" disabled={disabled||loading||!data?.items.length} onClick={()=>setSelection(current=>{const next=new Set(current);for(const item of data?.items??[])if(next.size<50)next.add(item.id);return next})}>이 화면 선택</Button><Button variant="ghost" size="sm" disabled={disabled||!selection.size} onClick={()=>setSelection(new Set())}>선택 해제</Button></div></div>
   <div className="min-h-24 flex-1 overflow-y-auto overscroll-contain">
    {loading?<p role="status" className="py-10 text-center text-xs text-muted-foreground">보관함을 여는 중…</p>:data?.items.length?<ul className="grid grid-cols-3 gap-2">{data.items.map((item,index)=><li key={item.id}><button type="button" aria-label={`${item.species.name} 선택 ${page*50+index+1}`} aria-pressed={selection.has(item.id)} disabled={disabled||(!selection.has(item.id)&&selection.size>=50)} onClick={()=>toggle(item.id)} className={`relative flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition-colors ${selection.has(item.id)?'border-primary bg-primary/5':'border-border/60 bg-card'}`}><span className={`absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full border ${selection.has(item.id)?'border-primary bg-primary text-primary-foreground':'border-border'}`} aria-hidden="true">{selection.has(item.id)&&<Check className="size-3"/>}</span><CollectibleThumbnail species={item.species} path={item.species.thumbnail_path} name={item.species.name} className="size-14"/><span className="line-clamp-2 text-[11px] leading-4">{item.species.name}</span></button></li>)}</ul>:!error&&<div className="py-8 text-center text-muted-foreground"><Archive className="mx-auto mb-2 size-7 opacity-40"/><p className="text-sm">{search||kind!=='all'?'조건에 맞는 개체가 없어요.':'보관함이 비어 있어요.'}</p><p className="mt-1 text-xs">낚시와 선물로 만난 개체가 여기에 모여요.</p></div>}
   </div>
   {data&&data.total>50&&<div className="flex items-center justify-center gap-4"><Button variant="ghost" size="icon" aria-label="보관함 이전 페이지" disabled={disabled||loading||page===0} onClick={()=>setPage(v=>v-1)}><ChevronLeft/></Button><span className="text-xs tabular-nums">{page+1}/{Math.ceil(data.total/50)}</span><Button variant="ghost" size="icon" aria-label="보관함 다음 페이지" disabled={disabled||loading||(page+1)*50>=data.total} onClick={()=>setPage(v=>v+1)}><ChevronRight/></Button></div>}
   {error&&<div role="alert" className="flex items-center justify-between gap-2 text-xs text-destructive"><p>{error}</p><Button variant="ghost" size="icon" aria-label="보관함 새로고침" disabled={disabled} onClick={()=>{setSelection(new Set());setRetry(v=>v+1)}}><RefreshCw className="size-4"/></Button></div>}
   <div className="space-y-2 border-t pt-3"><Label htmlFor="storage-target-tank">넣을 어항</Label><select id="storage-target-tank" className="min-h-11 w-full rounded-xl border bg-background px-3 text-sm" value={targetId} disabled={disabled} onChange={event=>setTarget(event.target.value)}>{state.tanks.map(tank=><option key={tank.id} value={tank.id}>{tank.name} · {occupancy(tank.id)}/{capacity}</option>)}</select><p className={`text-xs ${selection.size>free?'text-destructive':'text-muted-foreground'}`}>{selection.size>free?`이 어항에는 ${free}개만 더 넣을 수 있어요.`:`${free}개를 더 넣을 수 있어요.`}</p><Button className="min-h-11 w-full rounded-xl" disabled={disabled||loading||!selection.size||selection.size>free||!targetId} onClick={()=>void assign()}>{saving?'옮기는 중…':`${selection.size}개 어항에 넣기`}</Button></div>
  </DialogContent>
 </Dialog>
}
