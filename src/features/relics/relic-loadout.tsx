import {useAccountState} from '@/lib/account-query'
import {useEffect,useRef,useState} from 'react'
import {useNavigate} from 'react-router'
import {startShowcaseDraft} from '@/features/showcase/draft'
import {loadRelicShowcaseCatch,showcaseError} from '@/features/showcase/api'
import type {Relic} from './api'
import {Button} from '@/components/ui/button'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {RelicIcon} from '@/components/collection-filter-icons'
import {useAuth} from '@/components/auth-provider'
import {randomId} from '@/lib/random-id'
import {equipRelic,sellRelic,loadRelics,readRelics,relicError,type RelicState} from './api'
import {RelicEquipmentSlot,type RelicTransition} from './relic-equipment-slot'
import {playRelicEquipSound,playRelicUnequipSound} from '@/features/gold/purchase-sound'

import {RelicCatalogTabs} from './relic-catalog-tabs'
import {RelicGold} from './relic-gold'
import {RelicCraftingGuide} from './relic-crafting-guide'
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs'
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
 const navigate=useNavigate(),{session}=useAuth()
 const [open,setOpen]=useState(page),[error,setError]=useState(''),[attempt,setAttempt]=useState(0)
 const [state,setState,query]=useAccountState<RelicState>('relics',readRelics,{enabled:open})
 const [notice,setNotice]=useState('')
 const [tab,setTab]=useState('inventory'),[craftBusy,setCraftBusy]=useState(false),[craftLocked,setCraftLocked]=useState(false)
 const [equipEffect,setEquipEffect]=useState<RelicTransition|null>(null)
 const scene=useRef<HTMLDivElement>(null)
 useEffect(()=>{
  if(!equipEffect)return
  const timer=window.setTimeout(()=>setEquipEffect(null),1100)
  let animation:Animation|undefined
  if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   const strength=({common:0.5,rare:1,epic:2,mythic:3}[equipEffect.relic.rarity])*(equipEffect.kind==='unequip'?0.55:1)
   animation=scene.current?.animate?.([0,-1,0.8,-0.55,0.3,0].map((x,i)=>({transform:`translate(${x*strength}px,${i%2?strength*0.3:0}px) rotate(${x*strength*0.035}deg)`})),{duration:equipEffect.kind==='unequip'?260:380,delay:120,easing:'ease-out'})
  }
  return()=>{window.clearTimeout(timer);animation?.cancel()}
 },[equipEffect])
 const [purchase,setPurchase]=useState<Purchase|null>(null),[pending,setPending]=useState<Purchase|null>(()=>restore(storageKey)),[saving,setSaving]=useState(false)
 const lock=useRef(false)
 const alive=useRef(false),revision=useRef(0)
 const list=useRef<HTMLDivElement>(null)
 const [pickerOpen,setPickerOpen]=useState(false)
 useEffect(()=>{if(!open)return;alive.current=true;return()=>{alive.current=false;revision.current++}},[open])
 useEffect(()=>{if(query.error&&!purchase)setError('유물을 불러오지 못했어요. 다시 시도해 주세요.')},[query.error,purchase])
 useEffect(()=>{if(attempt>0)void query.refetch({cancelRefetch:false}).then(result=>{if(!result.error)setError('')})},[attempt])
 function remember(p:Purchase|null){setPending(p);try{if(p)localStorage.setItem(storageKey,JSON.stringify(p));else localStorage.removeItem(storageKey)}catch{/* Retain the same operation in memory. */}}
 function select(id:string|null,name:string){if(!state||pending)return;setError('');setNotice('');setPurchase({id,name,operation:randomId(),fee:state.equippedId?(state.unequipFee??state.changeFee):(state.equipFee??0)})}
 async function share(relic:Relic){
  if(!session||lock.current||pending)return
  lock.current=true;setSaving(true);setError('')
  try{
   const caught=await loadRelicShowcaseCatch(relic.id)
   if(!alive.current)return
   const id=startShowcaseDraft({...caught,owner:session.user.id,renderVersion:1,preview:false})
   setOpen(false);navigate('/showcase/new',{state:{showcaseDraft:id}})
  }catch(cause){if(alive.current)setError(showcaseError(cause))}
  finally{lock.current=false;if(alive.current)setSaving(false)}
 }
 async function confirm(){
  if(!purchase||lock.current)return
  lock.current=true;const request=++revision.current;setSaving(true);setError('');setNotice('');remember(purchase)
  try{
   const next=await (purchase.action==='sell'?sellRelic(purchase.id!,purchase.operation,purchase.fee):equipRelic(purchase.id,purchase.operation,purchase.fee))
   if(!alive.current||request!==revision.current)return
   if(purchase.action!=='sell'&&next.equippedId===purchase.id){
    if(purchase.id)playRelicEquipSound(purchase.operation)
    else playRelicUnequipSound(purchase.operation)
    const effectRelic=purchase.id?next.relics.find(r=>r.id===purchase.id):state?.relics.find(r=>r.id===state.equippedId)
    if(effectRelic)setEquipEffect({id:purchase.operation,kind:purchase.id?'equip':'unequip',relic:effectRelic})
   }
   setState(next);remember(null);setPurchase(null);if(purchase.action!=='sell')setPickerOpen(false)
  }
  catch(cause){
   if(!alive.current||request!==revision.current)return
   const message=String((cause as {message?:string})?.message??'')
   if(/RELIC_LOADOUT_CHANGED|RELIC_ALREADY_EQUIPPED|RELIC_NOT_OWNED|RELIC_PRICE_CHANGED|RELIC_EQUIPPED|OPERATION_CONFLICT/.test(message)){
    // These are definite server rejections. Refresh rather than retrying a stale
    // quote; a newly charged action still requires a fresh confirmation.
    remember(null);setPurchase(null)
    try{
     const latest=await loadRelics(true)
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
    <Tabs value={tab} onValueChange={value=>{if(!craftBusy)setTab(String(value))}} className="flex min-h-0 flex-1 flex-col">
     <TabsList aria-label="유물 메뉴" className="relic-page-tabs shrink-0"><TabsTrigger value="inventory" disabled={craftBusy}><RelicIcon className={`size-7 shrink-0 object-contain ${tab==='inventory'?'':'grayscale opacity-55'}`}/>보유 유물</TabsTrigger><TabsTrigger value="craft" disabled={!state.canCraft||saving||!!pending||craftBusy}><img src="/app-icons/relic-craft.png" alt="" aria-hidden="true" className={`size-7 shrink-0 object-contain ${tab==='craft'?'':'grayscale opacity-55'}`}/>{state.canCraft?'세공':'세공 준비 중'}{craftLocked&&!craftBusy&&<span className="relic-tab-notice">결과 확인</span>}</TabsTrigger></TabsList>
     <TabsContent value="inventory" keepMounted className="mt-0 flex min-h-0 flex-1 flex-col gap-4 px-5 pb-4 pt-4 [&[hidden]]:hidden">
      <RelicEquipmentSlot relic={state.relics.find(r=>r.id===state.equippedId)} transition={equipEffect} disabled={saving||!!pending||craftLocked} canChoose={state.relics.some(r=>r.owned)} onChoose={()=>setPickerOpen(true)} onUnequip={()=>select(null,'유물 해제')}/>
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{state.relics.filter(r=>r.owned).length}종 보유</span><Button variant="ghost" size="sm" className="text-xs text-primary" onClick={()=>{setOpen(false);navigate('/item-collection?tab=relic')}}>유물 도감</Button></div>
      {!state.relics.some(r=>r.owned)&&<p className="py-6 text-center text-xs text-muted-foreground">아직 보유한 유물이 없어요.</p>}
      <Dialog open={pickerOpen} onOpenChange={value=>{if(!saving&&!purchase)setPickerOpen(value)}}><DialogContent className="flex h-[80dvh] max-h-[85dvh] flex-col overflow-hidden rounded-2xl sm:max-w-lg"><DialogHeader><DialogTitle>유물 {state.equippedId?'교체':'장착'}</DialogTitle><DialogDescription className="sr-only">장착할 유물을 선택해 주세요.</DialogDescription></DialogHeader>
       <RelicCatalogTabs state={state} disabled={saving||!!pending||craftLocked} listRef={list} onEquip={r=>select(r.id,r.name)} onShare={r=>void share(r)} onSell={r=>{setError('');setNotice('');setPurchase({id:r.id,name:r.name,operation:randomId(),fee:r.sell_price,action:'sell'})}}/>
      </DialogContent></Dialog>
     </TabsContent>
     <TabsContent value="craft" keepMounted className="mt-0 flex min-h-0 flex-1 flex-col [&[hidden]]:hidden">
      {state.canCraft&&<RelicCraftingGuide state={state} disabled={saving||!!pending} storageKey={storageKey+':craft'} onState={setState} onBusyChange={setCraftBusy} onLockChange={setCraftLocked} onOpenInventory={()=>setTab('inventory')} onShare={r=>void share(r)}/>}
     </TabsContent>
    </Tabs>
   </>}
 </>
 return <>
  {page?<section aria-label="유물" className="flex min-h-0 flex-1 flex-col">
   <h2 className="sr-only">유물</h2>
   <div ref={scene} className="flex min-h-0 flex-1 flex-col gap-4">{content}</div>
  </section>:<>
   <Button type="button" size="sm" variant="outline" onClick={()=>{setError('');setOpen(true)}}><RelicIcon className="size-5"/>유물 장착</Button>
   <Dialog open={open} onOpenChange={value=>{if(!saving&&!craftBusy)setOpen(value)}}><DialogContent showCloseButton={!craftBusy} className={`flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-lg ${tab==='craft'?'h-[85dvh]':''}`}>
    <DialogHeader className={tab==='craft'?'sr-only':undefined}><DialogTitle>유물 장착</DialogTitle><DialogDescription>장착은 무료이며 한 번에 하나만 장착할 수 있어요. 해제와 교체에는 해제 비용만 들어요.</DialogDescription></DialogHeader>
    <div ref={scene} className="flex min-h-0 flex-1 flex-col gap-4">{content}</div>
   </DialogContent></Dialog>
  </>}
  <ConfirmDialog open={!!purchase} onOpenChange={value=>{if(!value&&!saving){setPurchase(null);setError('')}}} title={purchase?.action==='sell'?`${purchase.name} 판매할까요?`:purchase?.id?`${purchase.name} 장착할까요?`:'유물을 해제할까요?'} description={purchase?.fee===0?null:<span className="block space-y-2"><span className="flex items-center justify-center gap-1">{<><RelicGold amount={purchase?.fee??0}/>{purchase?.action==='sell'?'를 받아요':''}</>}</span><span className="block">{purchase?.action==='sell'?'유물 1개를 판매해요. 장착 중인 1개와 도감 발견 기록은 유지돼요.':purchase?.id?'기존 유물의 해제 비용만 지불해요. 새 유물 장착은 무료예요.':'유물 해제 비용이에요.'}</span></span>} busy={saving} error={error} confirmLabel={pending?'결과 다시 확인':purchase?.action==='sell'?'판매하기':'확인'} onConfirm={()=>void confirm()}/>
 </>
}
