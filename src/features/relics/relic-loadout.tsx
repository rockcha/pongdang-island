import {useEffect,useRef,useState} from 'react'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {RelicIcon} from '@/components/collection-filter-icons'
import {useAuth} from '@/components/auth-provider'
import {randomId} from '@/lib/random-id'
import {equipRelic,sellRelic,loadRelics,relicError,type RelicState} from './api'
import {RelicEquipmentSlot} from './relic-equipment-slot'
import {playRelicEquipSound,playRelicUnequipSound} from '@/features/gold/purchase-sound'

import {RelicCatalogTabs} from './relic-catalog-tabs'
import {RelicGold} from './relic-gold'

type Purchase={id:string|null;name:string;operation:string;fee:number;action?:'sell'}
function restore(key:string):Purchase|null{
 try{const p=JSON.parse(localStorage.getItem(key)??'null');return p&&(p.id===null||typeof p.id==='string')&&typeof p.name==='string'&&typeof p.operation==='string'&&(p.action==='sell'?typeof p.id==='string'&&Number.isSafeInteger(p.fee)&&p.fee>0:!p.action&&[0,500,1000].includes(p.fee))?p:null}catch{return null}
}
export function RelicPage(){return <RelicLoadout page/>}

export function RelicLoadout({page=false}:{page?:boolean}){
 const {session}=useAuth()
 return <Loadout page={page} key={session?.user.id??'guest'} storageKey={`pongdang:relic-loadout:${session?.user.id??'guest'}`}/>
}
function Loadout({storageKey,page}:{storageKey:string;page:boolean}){
 const [open,setOpen]=useState(page),[state,setState]=useState<RelicState|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 const [purchase,setPurchase]=useState<Purchase|null>(null),[pending,setPending]=useState<Purchase|null>(()=>restore(storageKey)),[saving,setSaving]=useState(false)
 const lock=useRef(false)
 const list=useRef<HTMLDivElement>(null)
 useEffect(()=>{if(!open)return;let alive=true;void loadRelics().then(s=>{if(alive){setState(s);setError('')}}).catch(()=>{if(alive)setError('유물을 불러오지 못했어요. 다시 시도해 주세요.')});return()=>{alive=false}},[open,attempt])
 function remember(p:Purchase|null){setPending(p);try{if(p)localStorage.setItem(storageKey,JSON.stringify(p));else localStorage.removeItem(storageKey)}catch{/* Retain the same operation in memory. */}}
 function select(id:string|null,name:string){if(!state||pending)return;setError('');setPurchase({id,name,operation:randomId(),fee:state.equippedId?(state.unequipFee??state.changeFee):(state.equipFee??0)})}
 async function confirm(){
  if(!purchase||lock.current)return
  lock.current=true;setSaving(true);setError('');remember(purchase)
  try{
   const next=await (purchase.action==='sell'?sellRelic(purchase.id!,purchase.operation,purchase.fee):equipRelic(purchase.id,purchase.operation,purchase.fee))
   if(purchase.action!=='sell'){
    if(purchase.id)playRelicEquipSound(purchase.operation)
    else playRelicUnequipSound(purchase.operation)
   }
   setState(next);remember(null);setPurchase(null)
  }
  catch(cause){setError(relicError(cause));if((cause as {code?:string}).code)remember(null)}
  finally{lock.current=false;setSaving(false)}
 }
 const content=<>
   {error&&!purchase&&<div role="alert" className="text-sm text-destructive">{error}<Button variant="ghost" onClick={()=>setAttempt(n=>n+1)}>다시 불러오기</Button></div>}
   {pending&&<Button disabled={saving} onClick={()=>{setError('');setPurchase(pending)}}>{pending.action==='sell'?'판매':'장착'} 결과 다시 확인</Button>}
   {!state&&!error&&<p role="status" className="py-6 text-center text-sm">유물을 불러오는 중…</p>}
   {state&&<>
    <RelicEquipmentSlot relic={state.relics.find(r=>r.id===state.equippedId)} fee={state.unequipFee??state.changeFee} disabled={saving||!!pending} canChoose={state.relics.some(r=>r.owned)} onChoose={()=>list.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()} onUnequip={()=>select(null,'유물 해제')}/>
    <RelicCatalogTabs state={state} disabled={saving||!!pending} listRef={list} onEquip={r=>select(r.id,r.name)} onSell={r=>{setError('');setPurchase({id:r.id,name:r.name,operation:randomId(),fee:r.sell_price,action:'sell'})}}/>
   </>}
 </>
 return <>
  {page?<section aria-label="유물" className="flex min-h-0 flex-1 flex-col">
   <header className="shrink-0 space-y-1 border-b px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-medium"><RelicIcon className="size-6"/>유물 장착</h2><p className="text-[11px] leading-5 text-muted-foreground">한 번에 하나의 유물을 장착할 수 있어요.</p></header>
   <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">{content}</div>
  </section>:<>
   <Button type="button" size="sm" variant="outline" onClick={()=>{setError('');setOpen(true)}}><RelicIcon className="size-5"/>유물 장착</Button>
   <Dialog open={open} onOpenChange={value=>{if(!saving)setOpen(value)}}><DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-lg">
    <DialogHeader><DialogTitle>유물 장착</DialogTitle><DialogDescription>장착은 무료이며 한 번에 하나만 장착할 수 있어요. 해제와 교체에는 해제 비용만 들어요.</DialogDescription></DialogHeader>
    {content}
   </DialogContent></Dialog>
  </>}
  <ConfirmDialog open={!!purchase} onOpenChange={value=>{if(!value&&!saving)setPurchase(null)}} title={purchase?.action==='sell'?`${purchase.name} 판매할까요?`:purchase?.id?`${purchase.name} 장착할까요?`:'유물을 해제할까요?'} description={<span className="block space-y-2"><span className="flex items-center justify-center gap-1">{purchase?.fee===0?'무료':<><RelicGold amount={purchase?.fee??0}/>{purchase?.action==='sell'?'를 받아요':''}</>}</span><span className="block">{purchase?.action==='sell'?'도감 기록은 남으며, 판매한 유물은 낚시에서 다시 만날 수 있어요.':purchase?.fee===0?'비용 없이 유물을 장착해요.':purchase?.id?'기존 유물의 해제 비용만 지불해요. 새 유물 장착은 무료예요.':'유물 해제 비용이에요.'}</span></span>} busy={saving} error={error} confirmLabel={pending?'결과 다시 확인':purchase?.action==='sell'?'판매하기':'확인'} onConfirm={()=>void confirm()}/>
 </>
}
