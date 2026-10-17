import { AquariumView } from '@/features/aquarium/aquarium-view'
import { AquariumBackgroundDialog } from '@/features/aquarium/aquarium-background-dialog'
import type { DecorationPlacement,OwnedCollectible,Species } from '@/features/collection/api'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useGold } from '@/features/gold/gold-provider'
import { goldError } from '@/features/gold/api'
import { arrangeDecoration,manageTank, loadAquarium,moveCollectibles,placeCollectible } from '@/features/aquarium/api'
import {CollectibleStorageDialog} from '@/features/aquarium/collectible-storage-dialog'
import type { AquariumState } from '@/features/aquarium/api'
import {CollectionDialog} from '@/features/collection/collection-dialog'
import { Link } from 'react-router'
import { Map as MapIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { TradeQuestion } from '@/components/trade-question'

export function AquariumPage() {
 const {wallet,transact,busy:goldBusy,loading:goldLoading,error:goldLoadError}=useGold()
 const [state,setState]=useState<AquariumState|null>(null)
 const [testFish,setTestFish]=useState<OwnedCollectible[]>([])
 const [selectedId,setSelectedId]=useState('')
 const [name,setName]=useState('')
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [purchaseOpen,setPurchaseOpen]=useState(false)
 const [purchaseError,setPurchaseError]=useState('')
 const active=useRef(true)
 const locked=useRef(false)
 const placementQueue=useRef(new Map<string,Promise<void>>())
 async function reload(){try{const data=await loadAquarium();if(active.current){setState(data);setError('')}}catch{if(active.current)setError('배경을 불러오지 못했어요. 09·10·15·16 SQL 적용과 연결을 확인해주세요.')}}
 useEffect(()=>{
  active.current=true;void reload()
  let timer:ReturnType<typeof setTimeout>|undefined
  const refresh=()=>{clearTimeout(timer);if(locked.current)timer=setTimeout(refresh,300);else void reload()}
  window.addEventListener('focus',refresh);window.addEventListener('collectibles-changed',refresh)
  return()=>{active.current=false;clearTimeout(timer);window.removeEventListener('focus',refresh);window.removeEventListener('collectibles-changed',refresh)}
 },[])
 async function act(id:string,owned:boolean){
  if(locked.current)return
  locked.current=true;setBusy(true)
  try{
   if(owned && tank){const data=await manageTank(tank.id,'equip',id);if(active.current)setState(data)}
   else{await transact({type:'buy',id:`background:${id}`,name:state?.catalog.find(item=>item.id===id)?.name});await reload()}
  }catch(cause){toast.error(goldError(cause))}finally{locked.current=false;if(active.current)setBusy(false)}
 }
 const tank=state?.tanks.find(item=>item.id===selectedId)??state?.tanks[0]
 const selected=state?.catalog.find(item=>item.id===tank?.background_id)
 const tankIndex=state?.tanks.findIndex(item=>item.id===tank?.id)??0
 function changeTank(direction:'previous'|'next'){
  if(busy||goldBusy||!state)return
  const next=state.tanks[tankIndex+(direction==='next'?1:-1)]
  if(next)setSelectedId(next.id)
 }
 function addTemporary(species:Species){
  if(!tank||species.kind==='map')return
  setTestFish(current=>[...current,{id:'test-'+crypto.randomUUID(),species_id:species.id,tank_id:tank.id,
   animation_seed:Math.floor(Math.random()*1000000),position_x:null,position_y:null,
   rotation:0,scale:1,acquired_at:new Date().toISOString(),species}])
  toast.success(species.name+' 임시 개체를 넣었어요.')
 }
 const inhabitants=[...(state?.inhabitants??[]),...testFish].filter(item=>item.tank_id===tank?.id)
 function place(id:string,x:number,y:number){
  if(!tank)return
  const tankId=tank.id
  const update=(items:OwnedCollectible[])=>items.map(item=>item.id===id?{...item,position_x:x,position_y:y}:item)
  if(id.startsWith('test-')){setTestFish(update);return}
  setState(current=>current?{...current,inhabitants:update(current.inhabitants)}:current)
  const operation=(placementQueue.current.get(id)??Promise.resolve()).then(async()=>{
   try{await placeCollectible(id,tankId,x,y)}catch{toast.error('위치를 저장하지 못했어요. 22번 SQL 적용과 연결을 확인해주세요.')}
  })
  placementQueue.current.set(id,operation)
  void operation.finally(()=>{if(placementQueue.current.get(id)===operation)placementQueue.current.delete(id)})
 }
 async function arrange(id:string,value:DecorationPlacement){
  if(!tank||locked.current)throw new Error('잠시 후 다시 시도해주세요.')
  const tankId=tank.id
  if(id.startsWith('test-')){setTestFish(current=>current.map(item=>item.id===id?{...item,...value}:item));return}
  const previous=state?.inhabitants.find(item=>item.id===id)
  setState(current=>current?{...current,inhabitants:current.inhabitants.map(item=>item.id===id?{...item,...value}:item)}:current)
  locked.current=true;setBusy(true)
  try{
   await placementQueue.current.get(id)
   const saved=await arrangeDecoration(id,tankId,value)
   if(active.current)setState(current=>current?{...current,inhabitants:current.inhabitants.map(item=>item.id===id?{...item,...saved}:item)}:current)
  }catch(cause){
   if(previous&&active.current)setState(current=>current?{...current,inhabitants:current.inhabitants.map(item=>item.id===id?previous:item)}:current)
   throw cause
  }finally{locked.current=false;if(active.current)setBusy(false)}
 }
 async function sell(ids:string[]){
  if(locked.current||goldBusy)throw new Error('다른 작업을 마친 뒤 다시 판매해주세요.')
  locked.current=true;setBusy(true)
  try{await transact({type:'sell',id:`collectibles:${[...ids].sort().join(',')}`});setState(current=>current?{...current,inhabitants:current.inhabitants.filter(item=>!ids.includes(item.id))}:current);await reload()}
  finally{locked.current=false;if(active.current)setBusy(false)}
 }
 async function move(ids:string[],targetTankId:string|null){
  if(locked.current||goldBusy)throw new Error('BUSY')
  locked.current=true;setBusy(true)
  try{
   await Promise.all(ids.map(id=>placementQueue.current.get(id)))
   const data=await moveCollectibles(ids,targetTankId)
   if(active.current)setState(data)
   toast.success(targetTankId?'선택한 개체를 어항에 넣었어요.':'보관함으로 옮겼어요.')
  }finally{locked.current=false;if(active.current)setBusy(false)}
 }
 useEffect(()=>{setName(tank?.name??'')},[tank?.id,tank?.name])
 async function buyTank(){
  if(locked.current)return
  locked.current=true;setBusy(true);setPurchaseError('')
  try{await transact({type:'buy',id:'aquarium:tank'});setPurchaseOpen(false);await reload()}
  catch(cause){setPurchaseError(goldError(cause))}finally{locked.current=false;if(active.current)setBusy(false)}
 }
 async function rename(){
  if(!tank||locked.current)return
  locked.current=true;setBusy(true)
  try{const data=await manageTank(tank.id,'rename',name.trim());if(active.current)setState(data);toast.success('어항 이름을 저장했어요.')}
  catch(cause){toast.error(goldError(cause))}finally{locked.current=false;if(active.current)setBusy(false)}
 }
 return <section aria-label="아쿠아리움" className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
  <AquariumView items={inhabitants} name={tank?.name??'어항을 불러오는 중…'} background={selected} busy={busy||goldBusy||goldLoading||!!goldLoadError} onPlace={place} onArrange={arrange} onSell={sell} onStore={ids=>move(ids,null)}
   purchase={state?{price:state.tankPrice,disabled:busy||goldBusy||goldLoading||!!goldLoadError||wallet.gold<state.tankPrice,onBuy:()=>{setPurchaseError('');setPurchaseOpen(true)}}:undefined}
   onGiftSent={ids=>{setState(current=>current?{...current,inhabitants:current.inhabitants.filter(item=>!ids.includes(item.id))}:current);void reload()}}
   navigation={state?{index:tankIndex,count:state.tanks.length,onChange:changeTank}:undefined}
   backgroundControls={state&&tank?<AquariumBackgroundDialog state={state} selectedId={tank.background_id} gold={wallet.gold} busy={busy||goldBusy} loading={goldLoading} error={!!goldLoadError} onAct={act}/>:null}
   storageControls={<>{state&&tank&&<CollectibleStorageDialog state={state} currentTankId={tank.id} busy={busy||goldBusy} onAssign={move}/>}</>}
   managementControls={<><CollectionDialog onAddTemporary={tank?addTemporary:undefined}/><Tooltip><TooltipTrigger render={<Link to="/harbor" aria-label="지도로" className="inline-flex size-10 shrink-0 items-center justify-center rounded-r-xl transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"/>}><MapIcon className="size-4"/></TooltipTrigger><TooltipContent>지도로</TooltipContent></Tooltip></>}
   bottomControls={<>
    {tank&&<Dialog><DialogTrigger render={<Button variant="secondary" size="sm" className="max-w-32 truncate bg-background/85"/>}>어항 이름 변경</DialogTrigger><DialogContent><DialogHeader><DialogTitle>어항 이름</DialogTitle><DialogDescription>어항에 어울리는 이름을 붙여주세요.</DialogDescription></DialogHeader><form className="space-y-3" onSubmit={event=>{event.preventDefault();void rename()}}><Label htmlFor="tank-name">어항 이름</Label><Input id="tank-name" value={name} maxLength={20} required disabled={busy||goldBusy} onChange={event=>setName(event.target.value)}/><Button type="submit" disabled={busy||goldBusy||!name.trim()||name.trim()===tank.name}>저장</Button></form></DialogContent></Dialog>}
   </>}/>
  <ConfirmDialog open={purchaseOpen} onOpenChange={setPurchaseOpen} title={<TradeQuestion name="새 어항" price={state?.tankPrice??200}/>} description="새로운 어항에서 더 많은 바다 친구들을 꾸밀 수 있어요." busy={busy||goldBusy} error={purchaseError} confirmDisabled={!state||goldLoading||!!goldLoadError||wallet.gold<(state?.tankPrice??200)} onConfirm={()=>void buyTank()}/>
  {error&&<div role="alert" className="absolute inset-x-4 top-16 z-30 space-y-2 rounded-xl bg-background/95 p-3 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void reload()}>다시 불러오기</Button></div>}
 </section>
}
