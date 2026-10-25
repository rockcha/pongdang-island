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
import './relics.css'

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
 const [notice,setNotice]=useState('')
 const [purchase,setPurchase]=useState<Purchase|null>(null),[pending,setPending]=useState<Purchase|null>(()=>restore(storageKey)),[saving,setSaving]=useState(false)
 const lock=useRef(false)
 const alive=useRef(false),revision=useRef(0)
 const list=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  if(!open)return
  alive.current=true
  const refresh=async()=>{
   if(lock.current||document.hidden)return
   const request=++revision.current
   try{const next=await loadRelics();if(alive.current&&request===revision.current&&!lock.current){setState(next);setError('')}}
   catch{if(alive.current&&request===revision.current&&!lock.current)setError('유물을 불러오지 못했어요. 다시 시도해 주세요.')}
  }
  const sync=()=>{void refresh()}
  sync();window.addEventListener('focus',sync);window.addEventListener('online',sync);window.addEventListener('relic-loadout-changed',sync);document.addEventListener('visibilitychange',sync)
  return()=>{alive.current=false;revision.current++;window.removeEventListener('focus',sync);window.removeEventListener('online',sync);window.removeEventListener('relic-loadout-changed',sync);document.removeEventListener('visibilitychange',sync)}
 },[open,attempt])
 function remember(p:Purchase|null){setPending(p);try{if(p)localStorage.setItem(storageKey,JSON.stringify(p));else localStorage.removeItem(storageKey)}catch{/* Retain the same operation in memory. */}}
 function select(id:string|null,name:string){if(!state||pending)return;setError('');setNotice('');setPurchase({id,name,operation:randomId(),fee:state.equippedId?(state.unequipFee??state.changeFee):(state.equipFee??0)})}
 async function confirm(){
  if(!purchase||lock.current)return
  lock.current=true;const request=++revision.current;setSaving(true);setError('');setNotice('');remember(purchase)
  try{
   const next=await (purchase.action==='sell'?sellRelic(purchase.id!,purchase.operation,purchase.fee):equipRelic(purchase.id,purchase.operation,purchase.fee))
   if(!alive.current||request!==revision.current)return
   if(purchase.action!=='sell'){
    if(purchase.id)playRelicEquipSound(purchase.operation)
    else playRelicUnequipSound(purchase.operation)
   }
   setState(next);remember(null);setPurchase(null)
  }
  catch(cause){
   if(!alive.current||request!==revision.current)return
   const message=String((cause as {message?:string})?.message??'')
   if(/RELIC_LOADOUT_CHANGED|RELIC_ALREADY_EQUIPPED|RELIC_NOT_OWNED|RELIC_PRICE_CHANGED|RELIC_EQUIPPED|OPERATION_CONFLICT/.test(message)){
    // These are definite server rejections. Refresh rather than retrying a stale
    // quote; a newly charged action still requires a fresh confirmation.
    remember(null);setPurchase(null)
    try{
     const latest=await loadRelics()
     if(alive.current&&request===revision.current){setState(latest);setError('');setNotice('유물 상태를 새로 확인했어요. 현재 상태에서 다시 선택해 주세요.')}
    }catch{if(alive.current&&request===revision.current)setError('최신 유물 상태를 불러오지 못했어요. 다시 불러와 주세요.')}
   }else{
    setError(relicError(cause))
    const code=(cause as {code?:string}).code??''
    if(code==='P0001'||/^\d{2}[A-Z0-9]{3}$/.test(code))remember(null)
   }
  }
  finally{lock.current=false;if(alive.current&&request===revision.current)setSaving(false)}
 }
 const content=<>
   {notice&&<p role="status" className="shrink-0 rounded-lg bg-secondary/50 px-3 py-2 text-xs leading-5 text-muted-foreground">{notice}</p>}
   {error&&!purchase&&<div role="alert" className="text-sm text-destructive">{error}<Button variant="ghost" onClick={()=>setAttempt(n=>n+1)}>다시 불러오기</Button></div>}
   {pending&&<Button disabled={saving} onClick={()=>{setError('');setPurchase(pending)}}>{pending.action==='sell'?'판매':'장착'} 결과 다시 확인</Button>}
   {!state&&!error&&<p role="status" className="py-6 text-center text-sm">유물을 불러오는 중…</p>}
   {state&&<>
    <RelicEquipmentSlot relic={state.relics.find(r=>r.id===state.equippedId)} disabled={saving||!!pending} canChoose={state.relics.some(r=>r.owned)} onChoose={()=>list.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()} onUnequip={()=>select(null,'유물 해제')}/>
    <RelicCatalogTabs state={state} disabled={saving||!!pending} listRef={list} onEquip={r=>select(r.id,r.name)} onSell={r=>{setError('');setNotice('');setPurchase({id:r.id,name:r.name,operation:randomId(),fee:r.sell_price,action:'sell'})}}/>
   </>}
 </>
 return <>
  {page?<section aria-label="유물" className="flex min-h-0 flex-1 flex-col">
   <header className="shrink-0 px-5 pb-5 pt-6"><h2 className="text-lg font-medium tracking-tight">유물</h2></header>
   <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 pb-4">{content}</div>
  </section>:<>
   <Button type="button" size="sm" variant="outline" onClick={()=>{setError('');setOpen(true)}}><RelicIcon className="size-5"/>유물 장착</Button>
   <Dialog open={open} onOpenChange={value=>{if(!saving)setOpen(value)}}><DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-lg">
    <DialogHeader><DialogTitle>유물 장착</DialogTitle><DialogDescription>장착은 무료이며 한 번에 하나만 장착할 수 있어요. 해제와 교체에는 해제 비용만 들어요.</DialogDescription></DialogHeader>
    {content}
   </DialogContent></Dialog>
  </>}
  <ConfirmDialog open={!!purchase} onOpenChange={value=>{if(!value&&!saving){setPurchase(null);setError('')}}} title={purchase?.action==='sell'?`${purchase.name} 판매할까요?`:purchase?.id?`${purchase.name} 장착할까요?`:'유물을 해제할까요?'} description={<span className="block space-y-2"><span className="flex items-center justify-center gap-1">{purchase?.fee===0?'무료':<><RelicGold amount={purchase?.fee??0}/>{purchase?.action==='sell'?'를 받아요':''}</>}</span><span className="block">{purchase?.action==='sell'?'도감 기록은 남으며, 판매한 유물은 낚시에서 다시 만날 수 있어요.':purchase?.fee===0?'비용 없이 유물을 장착해요.':purchase?.id?'기존 유물의 해제 비용만 지불해요. 새 유물 장착은 무료예요.':'유물 해제 비용이에요.'}</span></span>} busy={saving} error={error} confirmLabel={pending?'결과 다시 확인':purchase?.action==='sell'?'판매하기':'확인'} onConfirm={()=>void confirm()}/>
 </>
}
