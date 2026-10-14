import { AquariumView } from '@/features/aquarium/aquarium-view'
import { AquariumBackgroundDialog } from '@/features/aquarium/aquarium-background-dialog'
import { TestFishPicker } from '@/features/aquarium/test-fish-picker'
import type { OwnedCollectible } from '@/features/collection/api'
import { Link } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { goldError } from '@/features/gold/api'
import { manageTank, loadAquarium,placeCollectible } from '@/features/aquarium/api'
import type { AquariumState } from '@/features/aquarium/api'

export function AquariumPage() {
 const {wallet,transact,busy:goldBusy,loading:goldLoading,error:goldLoadError}=useGold()
 const [state,setState]=useState<AquariumState|null>(null)
 const [testFish,setTestFish]=useState<OwnedCollectible[]>([])
 const [selectedId,setSelectedId]=useState('')
 const [name,setName]=useState('')
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const active=useRef(true)
 const locked=useRef(false)
 const placementQueue=useRef(new Map<string,Promise<void>>())
 async function reload(){try{const data=await loadAquarium();if(active.current){setState(data);setError('')}}catch{if(active.current)setError('배경을 불러오지 못했어요. 09·10·15·16 SQL 적용과 연결을 확인해주세요.')}}
 useEffect(()=>{active.current=true;void reload();return()=>{active.current=false}},[])
 async function act(id:string,owned:boolean){
  if(locked.current)return
  locked.current=true;setBusy(true)
  try{
   if(owned && tank){const data=await manageTank(tank.id,'equip',id);if(active.current)setState(data)}
   else{await transact({type:'buy',id:`background:${id}`});await reload();toast.success('배경을 구매했어요. 적용 버튼으로 꾸며보세요.')}
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
 async function sell(ids:string[]){
  if(locked.current||goldBusy)throw new Error('다른 작업을 마친 뒤 다시 판매해주세요.')
  locked.current=true;setBusy(true)
  try{await transact({type:'sell',id:`collectibles:${[...ids].sort().join(',')}`});setState(current=>current?{...current,inhabitants:current.inhabitants.filter(item=>!ids.includes(item.id))}:current);await reload();toast.success('개체를 판매했어요.')}
  finally{locked.current=false;if(active.current)setBusy(false)}
 }
 useEffect(()=>{setName(tank?.name??'')},[tank?.id,tank?.name])
 async function buyTank(){
  if(locked.current)return
  locked.current=true;setBusy(true)
  try{await transact({type:'buy',id:'aquarium:tank'});await reload();toast.success('새 어항을 구매했어요.')}
  catch(cause){toast.error(goldError(cause))}finally{locked.current=false;if(active.current)setBusy(false)}
 }
 async function rename(){
  if(!tank||locked.current)return
  locked.current=true;setBusy(true)
  try{const data=await manageTank(tank.id,'rename',name.trim());if(active.current)setState(data);toast.success('어항 이름을 저장했어요.')}
  catch(cause){toast.error(goldError(cause))}finally{locked.current=false;if(active.current)setBusy(false)}
 }
 return <section className="space-y-6 py-6">
  <header><h1 className="text-2xl font-bold">아쿠아리움</h1><p className="mt-2 text-sm text-muted-foreground">나만의 작은 바다를 꾸며보세요.</p></header>
  {state && <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-semibold">내 어항 {state.tanks.length}개</h2><Button variant="outline" className="min-h-11" disabled={busy||goldBusy||goldLoading||!!goldLoadError||wallet.gold<state.tankPrice} onClick={()=>void buyTank()}><GoldIcon className="size-5"/>{state.tankPrice} 어항 구매</Button></div><div role="group" aria-label="어항 선택" className="flex gap-2 overflow-x-auto pb-2">{state.tanks.map(item=><Button key={item.id} variant={tank?.id===item.id?'default':'outline'} className="min-h-11 max-w-48 shrink-0" aria-pressed={tank?.id===item.id} disabled={busy||goldBusy} onClick={()=>setSelectedId(item.id)}><span className="truncate">{item.name}</span></Button>)}</div></div>}
  <AquariumView items={inhabitants} name={tank?.name??'어항을 불러오는 중…'} background={selected} busy={busy||goldBusy||goldLoading||!!goldLoadError} onPlace={place} onSell={sell} onGiftSent={ids=>{setState(current=>current?{...current,inhabitants:current.inhabitants.filter(item=>!ids.includes(item.id))}:current);void reload()}} navigation={state?{index:tankIndex,count:state.tanks.length,onChange:changeTank}:undefined} backgroundControls={state&&tank?<AquariumBackgroundDialog state={state} selectedId={tank.background_id} gold={wallet.gold} busy={busy||goldBusy} loading={goldLoading} error={!!goldLoadError} onAct={act}/>:null}/>
  {tank && <TestFishPicker tankId={tank.id} count={testFish.filter(item=>item.tank_id===tank.id).length} onAdd={item=>setTestFish(current=>[...current,item])} onClear={()=>setTestFish(current=>current.filter(item=>item.tank_id!==tank.id))}/>}
  {tank && <form className="space-y-2" onSubmit={event=>{event.preventDefault();void rename()}}><Label htmlFor="tank-name">어항 이름</Label><div className="flex gap-2"><Input id="tank-name" value={name} maxLength={20} required disabled={busy||goldBusy} onChange={event=>setName(event.target.value)} className="min-h-11"/><Button type="submit" variant="outline" className="min-h-11" disabled={busy||goldBusy||!name.trim()||name.trim()===tank.name}>저장</Button></div><p className="text-xs text-muted-foreground">1~20자 · 구매한 배경은 모든 어항에 사용할 수 있어요.</p></form>}
  <Link to="/collection" className="block text-right text-xs text-primary underline">바다 도감 보기</Link>
  {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void reload()}>다시 불러오기</Button></div>}
 </section>
}
