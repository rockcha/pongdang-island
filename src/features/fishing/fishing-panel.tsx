import { useEffect, useRef, useState } from 'react'
import { FishingDialog } from './fishing-dialog'
import { createFishingPresentation } from './fishing-presentation'
import type { FishingPresentation } from './fishing-presentation'
import { Fish, Package, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { Link } from 'react-router'
import { CollectibleThumbnail } from '@/features/collection/collectible-thumbnail'
import { kindLabels } from '@/features/collection/api'
import { castFishing, fishingError, loadFishing } from './api'
import type { FishingAttempt, FishingState } from './api'

export function BaitInventoryDialog(){
 return <Dialog><DialogTrigger render={<Button variant="outline" className="min-h-11 w-full"/>}><ShoppingBag className="size-4"/>미끼 상점 · 인벤토리</DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md"><DialogHeader><DialogTitle>미끼 상점 · 인벤토리</DialogTitle><DialogDescription>퐁당 지렁이를 구매하고, 획득한 미끼의 수량과 효과를 확인해요.</DialogDescription></DialogHeader><FishingPanel/></DialogContent></Dialog>
}
export function FishingPanel({regionId}:{regionId?:string}){
 const {wallet,transact,busy:goldBusy,loading:goldLoading,error:goldError,refresh}=useGold()
 const [state,setState]=useState<FishingState|null>(null)
 const [error,setError]=useState('')
 const [selected,setSelected]=useState('bait')
 const [busy,setBusy]=useState(false)
 const [uncertain,setUncertain]=useState(false)
 const [result,setResult]=useState<FishingAttempt|null>(null)
 const [presentation,setPresentation]=useState<FishingPresentation|null>(null)
 const [castOpen,setCastOpen]=useState(false)
 const [castError,setCastError]=useState('')
 const active=useRef(true)
 const lock=useRef(false)
 const pending=useRef<{id:string;bait:string}|null>(null)
 const request=useRef(0)
 async function reload(){
  const version=++request.current
  try{const data=await loadFishing();if(active.current&&version===request.current){setState(data);setError('')}}
  catch{if(active.current&&version===request.current)setError('미끼 정보를 불러오지 못했어요. 13·14 SQL 적용과 연결을 확인해주세요.')}
 }
 useEffect(()=>{active.current=true;void reload();return()=>{active.current=false;request.current++}},[])
 async function buy(id:string){
  if(lock.current)return
  lock.current=true;setBusy(true)
  try{await transact({type:'buy',id:`fishing:${id}`})}
  catch(cause){toast.error(cause instanceof Error?cause.message:'구매하지 못했어요.')}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 async function cast(){
  if(!regionId||lock.current)return
  lock.current=true;setBusy(true);setError('');setCastError('');setResult(null)
  setPresentation(createFishingPresentation());setCastOpen(true)
  pending.current??={id:crypto.randomUUID(),bait:selected}
  try{
   const data=await castFishing(regionId,pending.current.bait,pending.current.id)
   pending.current=null
   if(active.current){setResult(data.attempt);setUncertain(false)}
   await Promise.all([refresh(),reload()])
  }catch(cause){
   const definite=cause&&typeof cause==='object'&&'code' in cause&&/^[0-9A-Z]{5}$/.test(String(cause.code))
   if(definite)pending.current=null
   if(active.current){setCastError(fishingError(cause));setUncertain(!definite)}
   await refresh()
  }finally{lock.current=false;if(active.current)setBusy(false)}
 }
 const bait=state?.baits.find(item=>item.id===selected)
 return <div className="space-y-5">
  <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-semibold"><Package className="size-4"/>{regionId?'미끼 선택 · 낚시':'미끼 인벤토리'}</h2><span className="flex items-center gap-1 text-sm tabular-nums"><GoldIcon/>{goldLoading?'…':goldError?'—':wallet.gold.toLocaleString('ko-KR')}</span></div>
  {!state&&!error&&<p role="status" className="text-sm">미끼를 불러오는 중…</p>}
  {error&&<div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p>{!uncertain&&<Button variant="outline" onClick={()=>void Promise.all([reload(),refresh()])}>다시 불러오기</Button>}</div>}
  {goldError&&<p role="alert" className="text-sm text-destructive">{goldError}</p>}
  <ul className="space-y-3">{state?.baits.map(item=><li key={item.id} className={`rounded-xl border p-3 ${regionId&&selected===item.id?'border-primary/40 bg-primary/5':''}`}><div className="flex gap-3"><img src={item.image_path} alt="" className="size-12 shrink-0 object-contain"/><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h3 className="text-sm font-semibold">{item.name}</h3><span className="text-xs tabular-nums text-muted-foreground">보유 {goldLoading?'…':wallet.inventory[item.id]??0}개</span></div><p className="mt-2 text-xs leading-6 text-muted-foreground">{item.description}</p><p className="mt-2 text-xs leading-5 text-primary">{item.effect_description}</p></div></div><div className="mt-3 flex gap-2">{regionId&&<Button variant={selected===item.id?'default':'outline'} aria-pressed={selected===item.id} className="min-h-11 flex-1" disabled={busy||goldBusy||uncertain} onClick={()=>setSelected(item.id)}>{selected===item.id?'선택됨':'선택'}</Button>}{item.price!==null?<Button variant="outline" className="min-h-11 flex-1" disabled={busy||goldBusy||goldLoading||!!goldError||uncertain||wallet.gold<item.price} onClick={()=>void buy(item.id)} aria-label={`${item.name} 1개 구매 ${item.price} 골드`}><GoldIcon className="size-5"/>{item.price} · 1개 구매</Button>:<span className="flex min-h-11 flex-1 items-center justify-center text-xs text-muted-foreground">획득 전용 · 획득처 준비 중</span>}</div></li>)}</ul>
  {regionId&&bait&&<div className="space-y-3"><p className="text-xs leading-5 text-muted-foreground">{bait.effect_kind==='decoration'?'구조물 획득 보장':`일반 ${bait.common_bp/100}% · 희귀 ${bait.rare_bp/100}% · 특급 ${bait.epic_bp/100}% · 신화 ${bait.mythic_bp/100}% · 실패 ${bait.failure_bp/100}%`}</p><Button className="min-h-12 w-full" disabled={busy||goldBusy||goldLoading||!!goldError||(!uncertain&&!(wallet.inventory[selected]>0))} onClick={()=>void cast()}><Fish className="size-4"/>{busy?'결과를 확인하는 중…':uncertain?'결과 다시 확인':`${bait.name} 1개로 낚시하기`}</Button><p className="text-xs text-muted-foreground">한 번에 미끼 1개를 사용해요. 실패해도 미끼는 소모돼요.</p></div>}
  {presentation&&<FishingDialog key={presentation.id} open={castOpen} onClose={()=>setCastOpen(false)} presentation={presentation} result={result} pending={busy} error={castError} onRetry={()=>void cast()}/>}
  {state&&<div className="space-y-3 border-t pt-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">보유 개체</h3><Link to="/collection" className="text-xs text-primary underline">바다 도감</Link></div>{state.items?.length?<ul className="grid grid-cols-3 gap-2">{state.items.map(item=><li key={item.id} className="flex flex-col items-center gap-1 rounded-xl border p-2"><CollectibleThumbnail path={item.species.thumbnail_path} name={item.species.name}/><span className="text-center text-xs">{item.species.name}</span><span className="text-[10px] text-muted-foreground">{kindLabels[item.species.kind]}</span></li>)}</ul>:<p className="text-xs text-muted-foreground">아직 보유한 개체가 없어요. 낚시로 만나보세요.</p>}<p className="text-xs text-muted-foreground">물고기·쓰레기·구조물은 첫 어항에 들어가고, 지도 조각은 새 항로를 열어요.</p></div>}
 </div>
}