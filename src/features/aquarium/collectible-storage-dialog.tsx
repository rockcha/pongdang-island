import {useEffect,useRef,useState} from 'react'
import {groupCollectibles} from './collectible-groups'
import {CollectibleQuantityCard} from './collectible-quantity-card'
import {rarities} from '@/lib/game/rarity'
import {Archive,Fish,Gift,ChevronLeft,ChevronRight,RefreshCw} from 'lucide-react'
import {GoldIcon} from '@/features/gold/gold-provider'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {SendGiftDialog} from '@/features/gifts/send-gift-dialog'
import {CollectibleThumbnail} from '@/features/collection/collectible-thumbnail'
import type {OwnedCollectible} from '@/features/collection/api'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {AquariumToolButton} from './aquarium-tool-button'
import {loadCollectibleStorage,storageError} from './api'
import type {AquariumState,CollectibleStorage} from './api'

export function CollectibleStorageDialog({state,currentTankId,busy,onAssign,onSell,onGiftSent}:{state:AquariumState;currentTankId:string;busy:boolean;onAssign:(ids:string[],tankId:string)=>Promise<void>;onSell?:(ids:string[])=>Promise<void>;onGiftSent?:(ids:string[])=>void}){
 const [open,setOpen]=useState(false),[page,setPage]=useState(0),[kind,setKind]=useState('all')
 const [retry,setRetry]=useState(0)
 const [data,setData]=useState<CollectibleStorage|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('')
 const [selection,setSelection]=useState<Set<string>>(new Set()),[saving,setSaving]=useState(false)
 const [assignIds,setAssignIds]=useState<string[]|null>(null)
 const [sale,setSale]=useState<OwnedCollectible[]|null>(null)
 const cache=useRef(new Map<string,OwnedCollectible>())
 const locked=useRef(false)
 const capacity=state.tankCapacity??50
 const targetId=currentTankId
 const occupancy=(id:string)=>state.inhabitants.filter(item=>item.tank_id===id).length
 const free=Math.max(0,capacity-occupancy(targetId))
 useEffect(()=>{
  if(!open)return
  let active=true
  setLoading(true);setError('');setData(null)
  void loadCollectibleStorage(page*50,'',kind).then(result=>{if(active){result.items.forEach(item=>cache.current.set(item.id,item));setData(result)}}).catch(()=>{if(active)setError('보관함을 불러오지 못했어요. 다시 시도해주세요.')}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[open,page,kind,retry])
 async function assign(){
  if(!assignIds?.length)return
  if(locked.current||busy||!assignIds.length||assignIds.length>free)return
  locked.current=true;setSaving(true);setError('')
  try{await onAssign(assignIds,targetId);setAssignIds(null);setSelection(new Set());setPage(0);setRetry(v=>v+1)}catch(cause){setError(storageError(cause))}finally{locked.current=false;setSaving(false)}
 }
 const groups=groupCollectibles(data?.items??[]).sort((a,b)=>(rarities[a.species.rarity]?.rank??0)-(rarities[b.species.rarity]?.rank??0))
 const selectedItems=[...selection].flatMap(id=>cache.current.get(id)?[cache.current.get(id)!]:[])
 const selectedGroups=groupCollectibles(selectedItems)
 const sellable=selectedItems.filter(item=>!item.id.startsWith('test-')&&item.species.kind!=='map'&&item.species.sell_price>0)
 const price=sellable.reduce((sum,item)=>sum+item.species.sell_price,0)
 function refreshStorage(){setSelection(new Set());setPage(0);setRetry(v=>v+1)}
 const disabled=busy||saving
 return <Dialog open={open} onOpenChange={value=>{if(disabled)return;setOpen(value);if(value){setSelection(new Set());setPage(0);setRetry(v=>v+1)}}}>
  <AquariumToolButton prominent label="보관함" icon={<Archive className="size-4"/>} count={state.storageCount??0}/>
  <DialogContent className="bottom-0 top-auto left-0 flex h-[88dvh] max-h-[88dvh] max-w-full translate-x-0 translate-y-0 flex-col gap-3 overflow-hidden rounded-t-2xl rounded-b-none pb-4 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
   <DialogHeader className="shrink-0"><DialogTitle className="flex items-center gap-2"><Archive aria-hidden="true" className="size-5 shrink-0 text-primary"/>보관함 <span className="ml-1 text-sm font-normal text-muted-foreground">{state.storageCount??0}개</span></DialogTitle></DialogHeader>
   <div role="group" aria-label="보관함 분류" className="grid shrink-0 grid-cols-4 gap-1">{[{id:'all',name:'전체'},{id:'fish',name:'물고기'},{id:'decoration',name:'장식물'},{id:'trash',name:'쓰레기'}].map(item=><Button key={item.id} variant={kind===item.id?'secondary':'ghost'} size="sm" className="min-h-10" aria-pressed={kind===item.id} disabled={disabled} onClick={()=>{setKind(item.id);setPage(0)}}>{item.name}</Button>)}</div>
   <div className="-mx-4 min-h-0 flex-1 overflow-y-auto overscroll-contain">
    {loading?<p role="status" className="py-10 text-center text-xs text-muted-foreground">보관함을 여는 중…</p>:data?.items.length?<ul className="grid grid-cols-3 border-t border-border/60">{groups.map(group=>{const value=group.items.filter(item=>selection.has(item.id)).length;const max=Math.min(group.items.length,Math.max(0,50-selection.size+value));return <li key={group.species.id} className="min-w-0"><CollectibleQuantityCard species={group.species} count={group.items.length} value={value} max={max} disabled={disabled} onChange={quantity=>setSelection(old=>{const next=new Set(old);group.items.forEach(item=>next.delete(item.id));group.items.slice(0,quantity).forEach(item=>next.add(item.id));return next})}/></li>})}</ul>:!error&&<div className="py-8 text-center text-muted-foreground"><Archive className="mx-auto mb-2 size-7 opacity-40"/><p className="text-sm">{kind!=='all'?'조건에 맞는 개체가 없어요.':'보관함이 비어 있어요.'}</p><p className="mt-1 text-xs">낚시와 선물로 만난 개체가 여기에 모여요.</p></div>}
   </div>
   {data&&data.total>50&&<div className="flex shrink-0 items-center justify-center gap-4"><Button variant="ghost" size="icon" aria-label="보관함 이전 페이지" disabled={disabled||loading||page===0} onClick={()=>setPage(v=>v-1)}><ChevronLeft/></Button><span className="text-xs tabular-nums">{page+1}/{Math.ceil(data.total/50)}</span><Button variant="ghost" size="icon" aria-label="보관함 다음 페이지" disabled={disabled||loading||(page+1)*50>=data.total} onClick={()=>setPage(v=>v+1)}><ChevronRight/></Button></div>}
   {error&&<div role="alert" className="flex shrink-0 items-center justify-between gap-2 text-xs text-destructive"><p>{error}</p><Button variant="ghost" size="icon" aria-label="보관함 새로고침" disabled={disabled} onClick={()=>{setSelection(new Set());setRetry(v=>v+1)}}><RefreshCw className="size-4"/></Button></div>}
   {selectedGroups.length>0&&<div className="flex min-h-12 shrink-0 items-center gap-3 overflow-x-auto border-t pt-2" aria-label="선택한 개체">{selectedGroups.map(group=><div key={group.species.id} className="relative shrink-0 px-1 pt-3"><span className="absolute inset-x-0 top-0 text-center text-[10px] text-primary">×{group.items.length}</span><CollectibleThumbnail species={group.species} path={group.species.thumbnail_path} name={group.species.name} className="size-9"/></div>)}</div>}
   <div className="-mx-4 -mb-4 -mt-3 grid shrink-0 grid-cols-3 border-t pb-[env(safe-area-inset-bottom)]"><Button variant="secondary" aria-label={selection.size+'개 어항에 넣기'} className="h-16 min-w-0 rounded-none border-r" disabled={disabled||loading||!selection.size||selection.size>free||!targetId} onClick={()=>{setError('');setAssignIds([...selection])}}><Fish className="size-5"/></Button>{selectedGroups.length===1?<SendGiftDialog species={selectedGroups[0].species} items={selectedGroups[0].items} disabled={disabled||loading||selectedGroups[0].species.kind==='map'} onSent={ids=>{onGiftSent?.(ids);refreshStorage()}}/>:<Button variant="secondary" className="h-16 rounded-none border-r" aria-label="선물할 종류 하나를 선택해주세요" disabled><Gift className="size-5"/></Button>}<Button aria-label={'선택한 개체 판매 '+price+' 골드'} className="h-16 min-w-0 gap-1.5 rounded-none" disabled={disabled||loading||!onSell||!sellable.length} onClick={()=>{setError('');setSale([...sellable])}}><GoldIcon className="size-6"/><span className="text-xs tabular-nums">{price.toLocaleString('ko-KR')}</span></Button></div>
   <ConfirmDialog open={assignIds!==null} onOpenChange={value=>{if(!value)setAssignIds(null)}} title="어항에 넣을까요?" description={`선택한 ${assignIds?.length??0}개를 현재 어항으로 옮겨요.`} busy={saving} error={error} confirmDisabled={busy||!assignIds?.length||(assignIds?.length??0)>free} onConfirm={()=>void assign()}/>
   <ConfirmDialog open={sale!==null} onOpenChange={value=>{if(!value)setSale(null)}} title={`선택한 개체 ${sale?.length??0}개를 판매하겠습니까?`} description="판매한 개체는 보관함에서 사라져요. 도감의 발견 기록은 유지돼요." busy={saving} error={error} confirmDisabled={busy||!sale?.length} onConfirm={async()=>{if(locked.current||!onSell||!sale?.length)return;locked.current=true;setSaving(true);setError('');try{await onSell(sale.map(item=>item.id));setSale(null);refreshStorage()}catch(cause){setError(cause instanceof Error?cause.message:'판매하지 못했어요. 다시 시도해주세요.')}finally{locked.current=false;setSaving(false)}}}><div className="flex items-center justify-between text-sm"><span>받을 골드</span><span className="flex items-center gap-1"><GoldIcon className="size-5"/>{sale?.reduce((sum,item)=>sum+item.species.sell_price,0).toLocaleString('ko-KR')}</span></div></ConfirmDialog>
  </DialogContent>
 </Dialog>
}
