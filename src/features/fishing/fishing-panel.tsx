import { preparedFailureSeconds } from './tension-game'
import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
import { practiceSpecies,plannedFailureMessages } from './fishing-practice'
import { CatchReveal } from './catch-reveal'
import { TensionFishingGame } from './tension-fishing-game'
import { useEffect, useRef, useState } from 'react'
import { FishingResultCard } from './fishing-result-card'
import { createFishingPresentation } from './fishing-presentation'
import type { FishingPresentation } from './fishing-presentation'
import { Fish, Package, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { Link } from 'react-router'
import { prepareFishing,finishFishing, fishingError, loadFishing } from './api'
import type { PreparedFishing,FishingAttempt, FishingState } from './api'

export function BaitInventoryDialog(){
 return <Dialog><DialogTrigger render={<Button variant="outline" className="min-h-11 w-full"/>}><ShoppingBag className="size-4"/>미끼 상점 · 인벤토리</DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md"><DialogHeader><DialogTitle>미끼 상점 · 인벤토리</DialogTitle><DialogDescription>퐁당 지렁이를 구매하고, 획득한 미끼의 수량과 효과를 확인해요.</DialogDescription></DialogHeader><FishingPanel/></DialogContent></Dialog>
}
export function FishingPanel({regionId}:{regionId?:string}){
 const {wallet,transact,busy:goldBusy,loading:goldLoading,error:goldError,refresh}=useGold()
 const [state,setState]=useState<FishingState|null>(null)
 const [error,setError]=useState('')
 const [selected,setSelected]=useState('bait')
 const [busy,setBusy]=useState(false)
 const [prepared,setPrepared]=useState<PreparedFishing|null>(null)
 const [practice,setPractice]=useState<Rarity|null>(null)
 const [failureText,setFailureText]=useState('')
 const [gameOpen,setGameOpen]=useState(false)
 const [revealing,setRevealing]=useState(false)
 const [baitOpen,setBaitOpen]=useState(false)
 const [uncertain,setUncertain]=useState(false)
 const [result,setResult]=useState<FishingAttempt|null>(null)
 const [presentation,setPresentation]=useState<FishingPresentation|null>(null)
 const [castOpen,setCastOpen]=useState(false)
 const [castError,setCastError]=useState('')
 const active=useRef(true)
 const lock=useRef(false)
 const pending=useRef<{id:string;bait:string;region:string;stage:'prepare'|'finish';won?:boolean}|null>(null)
 const request=useRef(0)
 async function reload(){
  const version=++request.current
  try{const data=await loadFishing();if(active.current&&version===request.current){setState(data);setError('')}}
  catch{if(active.current&&version===request.current)setError('미끼 정보를 불러오지 못했어요. 62 SQL 적용과 연결을 확인해주세요.')}
 }
 useEffect(()=>{active.current=true;void reload();return()=>{active.current=false;request.current++}},[])
 async function buy(id:string){
  if(lock.current)return
  lock.current=true;setBusy(true)
  try{await transact({type:'buy',id:`fishing:${id}`})}
  catch(cause){toast.error(cause instanceof Error?cause.message:'구매하지 못했어요.')}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 function failureMessage(reason?:string|null){
  if(reason&&reason in plannedFailureMessages)return plannedFailureMessages[reason as keyof typeof plannedFailureMessages]
  if(reason==='expired')return '낚시 시간이 지나 물고기가 떠났어요.'
  if(reason==='snap')return '줄이 끊어졌어요.'
  if(reason==='slack')return '버티는 힘이 다해 물고기를 놓쳤어요.'
  if(reason==='timeout')return '물고기가 멀리 달아났어요.'
  if(reason==='cancelled')return '낚시를 그만두었어요.'
  return createFishingPresentation().failure
 }
 function showResult(attempt:FishingAttempt,reason?:string|null){
  setResult(attempt);setUncertain(false)
  if(attempt.species){setCastOpen(false);setRevealing(true)}else{setFailureText(failureMessage(reason));setCastOpen(true)}
 }
 function showError(cause:unknown){
  const definite=cause&&typeof cause==='object'&&'code' in cause&&/^[0-9A-Z]{5}$/.test(String(cause.code))
  if(definite)pending.current=null
  setCastError(fishingError(cause));setUncertain(!definite);setCastOpen(true)
 }
 async function settle(won=true,reason?:string){
  setGameOpen(false);setBusy(true);lock.current=true;setCastError('');setResult(null)
  if(reason)setFailureText(failureMessage(reason))
  if(practice){
   showResult({operation_id:'practice',region_id:regionId??'',bait_id:selected,rarity:won?practice:null,created_at:new Date().toISOString(),species:won?practiceSpecies(practice):null},reason)
   lock.current=false;setBusy(false);return
  }
  if(!prepared&&!pending.current){lock.current=false;setBusy(false);return}
  pending.current??={id:prepared!.operation_id,bait:prepared!.bait_id,region:prepared!.region_id,stage:'finish',won}
  pending.current.stage='finish';pending.current.won??=won
  try{
   const data=await finishFishing(pending.current.id,pending.current.won)
   pending.current=null
   if(active.current)showResult(data.attempt,!data.failure_reason||data.failure_reason==='minigame'?reason:data.failure_reason)
   await Promise.allSettled([refresh(),reload()])
  }catch(cause){if(active.current)showError(cause)}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 async function cast(){
  if(!regionId||lock.current)return
  if(practice){startPractice(practice);return}
  if(pending.current?.stage==='finish'){await settle(pending.current.won);return}
  setPractice(null);setPrepared(null);setFailureText('');setResult(null);setError('');setCastError('')
  lock.current=true;setBusy(true);setBaitOpen(false);setCastOpen(false);setPresentation(createFishingPresentation())
  pending.current??={id:state?.prepared?.operation_id??crypto.randomUUID(),bait:state?.prepared?.bait_id??selected,region:state?.prepared?.region_id??regionId,stage:'prepare'}
  try{
   const plan=await prepareFishing(pending.current.region,pending.current.bait,pending.current.id)
   if(!active.current)return
   pending.current=null;setPrepared(plan);setSelected(plan.bait_id);setUncertain(false)
   if(plan.finished&&plan.result)showResult(plan.result.attempt,plan.result.failure_reason)
   else setGameOpen(true)
   await Promise.allSettled([refresh(),reload()])
  }catch(cause){if(active.current)showError(cause)}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 function startPractice(rarity:Rarity){
  if(lock.current||gameOpen||state?.prepared)return
  setPractice(rarity);setPrepared(null);setResult(null);setFailureText('');setCastError('');setCastOpen(false);setBaitOpen(false);setPresentation(createFishingPresentation());setGameOpen(true)
 }
 const bait=state?.baits.find(item=>item.id===selected)
 const baitList=(<ul className="space-y-3">{state?.baits.map(item=><li key={item.id} className={`rounded-xl border p-3 ${regionId&&selected===item.id?'border-primary/40 bg-primary/5':''}`}><div className="flex gap-3"><img src={item.image_path} alt="" className="size-12 shrink-0 object-contain"/><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h3 className="text-sm font-semibold">{item.name}</h3><span className="text-xs tabular-nums text-muted-foreground">보유 {goldLoading?'…':wallet.inventory[item.id]??0}개</span></div><p className="mt-2 text-xs leading-6 text-muted-foreground">{item.description}</p><p className="mt-2 text-xs leading-5 text-primary">{item.effect_description}</p></div></div><div className="mt-3 flex gap-2">{regionId&&<Button variant={selected===item.id?'default':'outline'} aria-pressed={selected===item.id} className="min-h-11 flex-1" disabled={busy||goldBusy||uncertain} onClick={()=>setSelected(item.id)}>{selected===item.id?'선택됨':'선택'}</Button>}{item.price!==null?<Button variant="outline" className="min-h-11 flex-1" disabled={busy||goldBusy||goldLoading||!!goldError||uncertain||wallet.gold<item.price} onClick={()=>void buy(item.id)} aria-label={`${item.name} 1개 구매 ${item.price} 골드`}><GoldIcon className="size-5"/>{item.price} · 1개 구매</Button>:<span className="flex min-h-11 flex-1 items-center justify-center text-xs text-muted-foreground">획득 전용 · 획득처 준비 중</span>}</div></li>)}</ul>)
 return <div className={regionId?"relative isolate min-h-0 flex-1 bg-[#123c68]":"space-y-5"}>
  {regionId?<div className="absolute bottom-6 left-4 z-20 max-w-[calc(100%-9rem)]"><Button variant="outline" className="min-h-11 gap-2 rounded-full border-white/20 bg-black/20 px-3 text-white hover:bg-black/30 hover:text-white" disabled={gameOpen||busy||uncertain||revealing} onClick={()=>setBaitOpen(true)}><span className="text-sm font-semibold tabular-nums">{wallet.inventory[selected]??0}개</span><Package className="size-4"/><span className="shrink-0">미끼통</span>{bait&&<span className="hidden max-w-36 truncate text-xs text-white/80 sm:inline">{bait.name}</span>}</Button></div>:<div className="flex items-center justify-between"><h2 className="font-semibold">미끼 인벤토리</h2><span className="flex items-center gap-1 text-sm"><GoldIcon/>{wallet.gold.toLocaleString('ko-KR')}</span></div>}
  {!state&&!error&&<p role="status" className={regionId?"absolute inset-x-4 top-28 z-20 rounded-xl bg-background/95 p-3 text-sm":"text-sm"}>미끼를 불러오는 중…</p>}
  {error&&<div role="alert" className={regionId?"absolute inset-x-4 top-28 z-20 space-y-2 rounded-xl bg-background/95 p-3 text-sm text-destructive":"space-y-2 text-sm text-destructive"}><p>{error}</p>{!uncertain&&<Button variant="outline" onClick={()=>void Promise.all([reload(),refresh()])}>다시 불러오기</Button>}</div>}
  {goldError&&<p role="alert" className={regionId?"absolute inset-x-4 top-28 z-20 rounded-xl bg-background/95 p-3 text-sm text-destructive":"text-sm text-destructive"}>{goldError}</p>}
  {regionId?<Dialog open={baitOpen} onOpenChange={setBaitOpen}><DialogContent className="max-h-[85dvh] overflow-y-auto rounded-3xl sm:max-w-md"><DialogHeader><DialogTitle>미끼통</DialogTitle><DialogDescription>미끼를 고르고 효과와 해역별 확률을 확인해요.</DialogDescription></DialogHeader>{baitList}<div className="space-y-2 text-xs leading-5 text-muted-foreground">{bait&&<><p>{state?.regionName?state.regionName+' 기준':'현재 해역 기준'}</p><p>시작 시 성공 예정 {((state?.successChanceBp??3500)/100)}% · 미니게임 성공도 필요해요.</p><p>시작할 때 미끼 1개를 사용해요. 취소·실패해도 돌려받지 않아요.</p><p>성공 예정일 때의 등급 확률</p><p>{bait.effect_kind==='decoration'?'현재 해역 장식물':`일반 ${bait.common_bp/100}% · 희귀 ${bait.rare_bp/100}% · 특급 ${bait.epic_bp/100}% · 신화 ${bait.mythic_bp/100}%`}</p></>}{state?.mapChanceBp!==undefined&&<p>해당 등급에 잠긴 항로가 있으면 지도 조각을 {state.mapChanceBp/100}% 확률로 획득해요. 장식물 미끼는 제외돼요.</p>}</div><Button className="min-h-11" onClick={()=>setBaitOpen(false)}>이 미끼로 준비하기</Button></DialogContent></Dialog>:baitList}
  {regionId&&<TensionFishingGame regionId={regionId} key={gameOpen?(prepared?.operation_id??'practice-'+practice):"ready"} active={gameOpen} quiet={!gameOpen&&(busy||revealing||castOpen)} challenge={{rarity:practice??prepared?.rarity??'common',wait:practice?1:prepared?.wait_seconds,failureAt:prepared&&!prepared.eligible?preparedFailureSeconds:undefined,failureReason:prepared?.failure_reason}} outline={practice?practiceSpecies(practice):prepared?.species} practice={!!practice} onCancel={()=>void settle(false,'cancelled')} onFailed={reason=>void settle(false,reason)} onCaught={()=>void settle(true)}/>}
  {regionId&&gameOpen&&practice&&<span className="pointer-events-none absolute left-3 top-3 z-20 rounded-full bg-black/20 px-3 py-1 text-xs text-white">{rarities[practice].label} 힘 테스트</span>}
  {regionId&&bait&&!gameOpen&&!castOpen&&!revealing&&<div className="absolute inset-x-4 bottom-36 z-10 mx-auto max-w-sm space-y-2"><Button className="min-h-14 w-full rounded-2xl" disabled={busy||(!practice&&(goldBusy||goldLoading||!!goldError||(!uncertain&&!state?.prepared&&!(wallet.inventory[selected]>0))))} onClick={()=>void cast()}><Fish className="size-4"/>{busy?'낚시하는 중…':practice?`${rarities[practice].label} 테스트 시작`:uncertain?'결과 다시 확인':state?.prepared?'진행 중인 낚시 이어하기':`${bait.name} 1개로 낚시하기`}</Button><p className="text-center text-xs text-white/80">물고기가 당기면 꾹 눌러 버텨요. 게이지가 너무 차면 잠깐 쉬어요.</p></div>}

  {revealing&&result?.species&&<CatchReveal species={result.species} practice={!!practice} onDismiss={()=>{setRevealing(false);setResult(null)}}/> }
  {presentation&&castOpen&&!result?.species&&(castError?<div className="absolute inset-x-4 top-1/2 z-30 mx-auto max-h-[80%] max-w-sm -translate-y-1/2 overflow-y-auto rounded-2xl bg-background/95"><FishingResultCard result={null} pending={busy} error={castError} practice={!!practice} failure={failureText||presentation.failure} onContinue={()=>setCastOpen(false)} onRetry={()=>void cast()}/></div>:!busy&&<CatchReveal failure={failureText||presentation.failure} practice={!!practice} onDismiss={()=>setCastOpen(false)}/>)}

  {regionId&&!gameOpen&&!busy&&!revealing&&!castOpen&&!uncertain&&<div className="absolute left-3 top-3 z-20 rounded-xl bg-black/20 p-2 text-white"><p className="mb-1 text-[10px] text-white/70">힘 테스트 · 미끼/보상 없음</p><div className="flex gap-1"><Button variant="ghost" className="min-h-9 px-2 text-xs text-white" aria-pressed={practice===null} onClick={()=>setPractice(null)}>실전</Button>{(Object.keys(rarities) as Rarity[]).map(rarity=><Button key={rarity} variant="ghost" className="min-h-9 px-2 text-xs text-white hover:bg-white/15 hover:text-white" disabled={!!state?.prepared} aria-pressed={practice===rarity} onClick={()=>setPractice(rarity)}>{rarities[rarity].label}</Button>)}</div></div>}
  {regionId&&<Link to="/aquarium" className="sr-only focus:not-sr-only focus:absolute focus:bottom-2 focus:z-30">아쿠아리움 보관함으로</Link>}
 </div>
}
