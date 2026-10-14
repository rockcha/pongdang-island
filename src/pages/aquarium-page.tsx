import { TankInhabitants } from '@/features/aquarium/tank-inhabitants'
import { TankBubbles } from '@/features/aquarium/tank-bubbles'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import { Link } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { goldError } from '@/features/gold/api'
import { backgroundUrl, manageTank, loadAquarium } from '@/features/aquarium/api'
import type { AquariumState } from '@/features/aquarium/api'

function BackgroundImage({ path, name, className }: {path:string;name:string;className:string}) {
 const [failed,setFailed]=useState(false)
 useEffect(()=>setFailed(false),[path])
 return failed ? <div className={`${className} flex items-center justify-center bg-gradient-to-b from-sky-100 to-teal-200 text-xs text-teal-800`}>배경 이미지를 준비 중이에요</div> : <img src={backgroundUrl(path)} alt={name} className={`${className} object-cover`} onError={()=>setFailed(true)}/>
}
export function AquariumPage() {
 const {wallet,transact,busy:goldBusy,loading:goldLoading,error:goldLoadError}=useGold()
 const [state,setState]=useState<AquariumState|null>(null)
 const [selectedId,setSelectedId]=useState('')
 const [name,setName]=useState('')
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const active=useRef(true)
 const locked=useRef(false)
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
  <div className="relative overflow-hidden rounded-2xl border">{selected ? <BackgroundImage path={selected.image_path} name={selected.name} className="aspect-[9/16] w-full"/> : <div className="aspect-[9/16] bg-gradient-to-b from-sky-100 to-teal-100"/>}<TankBubbles/><TankInhabitants items={state?.inhabitants?.filter(item=>item.tank_id===tank?.id)??[]}/><div className="pointer-events-none absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/40 to-transparent p-4 text-sm text-white">{tank ? tank.name + ' · ' + (selected?.name ?? '') : '어항을 불러오는 중…'}</div></div>
  {tank && <form className="space-y-2" onSubmit={event=>{event.preventDefault();void rename()}}><Label htmlFor="tank-name">어항 이름</Label><div className="flex gap-2"><Input id="tank-name" value={name} maxLength={20} required disabled={busy||goldBusy} onChange={event=>setName(event.target.value)} className="min-h-11"/><Button type="submit" variant="outline" className="min-h-11" disabled={busy||goldBusy||!name.trim()||name.trim()===tank.name}>저장</Button></div><p className="text-xs text-muted-foreground">1~20자 · 구매한 배경은 모든 어항에 사용할 수 있어요.</p></form>}
  <div className="space-y-3"><div className="flex justify-between"><h2 className="text-sm font-semibold">이 어항의 친구들</h2><Link to="/collection" className="text-xs text-primary underline">도감 보기</Link></div><ul className="flex flex-wrap gap-2">{state?.inhabitants?.filter(item=>item.tank_id===tank?.id).map(item=><li key={item.id} className="rounded-lg border p-2 text-center"><CollectibleThumbnail path={item.species.thumbnail_path} name={item.species.name} className="size-12"/><p className="text-[10px]">{item.species.name}</p></li>)}</ul></div>
  {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={()=>void reload()}>다시 불러오기</Button></div>}
  <div className="flex items-center justify-between"><h2 className="font-semibold">배경 꾸미기</h2><p className="flex items-center gap-1 text-sm tabular-nums"><GoldIcon/>{goldLoading?'…':goldLoadError?'—':wallet.gold.toLocaleString('ko-KR')}</p></div>
  <ul className="grid grid-cols-2 gap-3">{state?.catalog.map(item=>{
   const owned=item.id==='default'||state.owned.includes(item.id)
   const equipped=tank?.background_id===item.id
   return <li key={item.id} className="overflow-hidden rounded-xl border"><BackgroundImage path={item.image_path} name={item.name} className="aspect-[9/16] w-full"/><div className="space-y-3 p-3"><h3 className="text-sm font-semibold">{item.name}</h3><Button className="min-h-11 w-full" variant={owned?'outline':'default'} disabled={busy||goldBusy||equipped||(!owned&&(goldLoading||!!goldLoadError||wallet.gold<item.price))} onClick={()=>void act(item.id,owned)}>{equipped?'적용 중':owned?'적용하기':<><GoldIcon className="size-5"/>{item.price} 구매</>}</Button></div></li>
  })}</ul>
 </section>
}
