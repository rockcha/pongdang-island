import {FishingOdds} from './fishing-odds'
import {FirstDayFishingGuide} from './first-day-fishing-guide'
import {BaitTarget,fishingDisplayBait} from './bait-info'
import {readLastBait,saveLastBait} from './bait-preference'
import {useFishingTools,fishingToolButton} from './fishing-tools'
import {useRods} from './rod-provider'
import {appArt} from '@/components/app-art'
import { fishingBaitSummary } from './bait-effects'
import { LandscapeImage } from '@/components/landscape-image'
import { randomId } from '@/lib/random-id'
import { createPortal } from 'react-dom'
import { FishingRodSelector } from './fishing-rod-ui'
import { preparedFailureSeconds } from './tension-game'
import { rarities } from '@/lib/game/rarity'
import type { Rarity } from '@/lib/game/rarity'
import { practiceSpecies,plannedFailureMessages } from './fishing-practice'
import { CatchReveal } from './catch-reveal'
import { TensionFishingGame } from './tension-fishing-game'
import { FishingLeaveGuard } from './fishing-leave-guard'
import { usePwaUpdateBlock } from '@/features/pwa/update-blockers'
import { useEffect, useRef, useState } from 'react'
import { FishingResultCard } from './fishing-result-card'
import { createFishingPresentation } from './fishing-presentation'
import type { FishingPresentation } from './fishing-presentation'
import {ShoppingBag,FlaskConical} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { CollectionDialog } from '@/features/collection/collection-dialog'
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from '@/components/ui/tooltip'
import { FishingStorageDialog } from './fishing-storage-dialog'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

import { GoldIcon, useGold } from '@/features/gold/gold-provider'
import { Link,useNavigate } from 'react-router'
import {startShowcaseDraft} from '@/features/showcase/draft'
import { prepareFishing,startFishingFight,finishFishing, fishingError, loadFishing } from './api'
import type { PreparedFishing,FishingAttempt, FishingState } from './api'

const {map:Map}=appArt


export function BaitInventoryDialog(){
 return <Dialog><DialogTrigger render={<Button variant="outline" className="min-h-11 w-full"/>}><ShoppingBag className="size-4"/>미끼 상점 · 인벤토리</DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md"><DialogHeader><DialogTitle>미끼 상점 · 인벤토리</DialogTitle><DialogDescription>퐁당 지렁이를 구매하고, 획득한 미끼의 수량과 효과를 확인해요.</DialogDescription></DialogHeader><FishingPanel/></DialogContent></Dialog>
}
export function FishingPanel({regionId,regionName,toolbarTarget,oddsTarget,sceneHeader}:{regionId?:string;regionName?:string;toolbarTarget?:HTMLElement|null;oddsTarget?:HTMLElement|null;sceneHeader?:React.ReactNode}){
 const fishingTools=useFishingTools()
 const navigate=useNavigate()
 const {selected:equippedRod,rods}=useRods()
 const {session}=useAuth()
 const userId=session?.user.id??'guest'
 const [trip,setTrip]=useState<{userId:string;items:FishingAttempt[]}>(()=>({userId,items:[]}))
 const catches=trip.userId===userId?trip.items:[]
 const [testOpen,setTestOpen]=useState(false)
 const {wallet,transact,busy:goldBusy,loading:goldLoading,error:goldError,refresh}=useGold()
 const [state,setState]=useState<FishingState|null>(null)
 const [error,setError]=useState('')
 const [baitPreference,setBaitPreference]=useState(()=>({userId,id:readLastBait(userId)}))
 const preferredBait=baitPreference.userId===userId?baitPreference.id:readLastBait(userId)
 const selected=state&&!state.baits.some(item=>item.id===preferredBait)?'bait':preferredBait
 function setSelected(id:string){setBaitPreference({userId,id});saveLastBait(userId,id)}
 const [draftBait,setDraftBait]=useState('bait')
 const [busy,setBusy]=useState(false)
 const [prepared,setPrepared]=useState<PreparedFishing|null>(null)
 const [practice,setPractice]=useState<Rarity|null>(null)
 const [failureText,setFailureText]=useState('')
 const [failureLabel,setFailureLabel]=useState('다음엔 꼭 만나요')
 const [failureReason,setFailureReason]=useState<string|null>(null)
 const [gameOpen,setGameOpen]=useState(false)
 const [leavePaused,setLeavePaused]=useState(false)
 const [revealing,setRevealing]=useState(false)
 const [baitOpen,setBaitOpen]=useState(false)
 const [uncertain,setUncertain]=useState(false)
 const [result,setResult]=useState<FishingAttempt|null>(null)
 const [presentation,setPresentation]=useState<FishingPresentation|null>(null)
 const [castOpen,setCastOpen]=useState(false)
 // Keep update prompts out of the catch reveal and failure/result screens too.
 usePwaUpdateBlock(revealing||castOpen)
 const [castError,setCastError]=useState('')
 const active=useRef(true)
 const lock=useRef(false)
 const pending=useRef<{id:string;bait:string;region:string;stage:'prepare'|'finish';won?:boolean;reason?:string}|null>(null)
 const request=useRef(0)
 async function reload(){
  const version=++request.current
  try{const data=await loadFishing();if(active.current&&version===request.current){setState(data);setError('')}}
  catch{if(active.current&&version===request.current)setError('미끼 정보를 불러오지 못했어요. 62 SQL 적용과 연결을 확인해주세요.')}
 }
 useEffect(()=>{active.current=true;void reload();return()=>{active.current=false;request.current++}},[equippedRod])
 async function buy(id:string){
  if(lock.current)return
  lock.current=true;setBusy(true)
  try{await transact({type:'buy',id:`fishing:${id}`,name:state?.baits.find(item=>item.id===id)?.name})}
  catch(cause){toast.error(cause instanceof Error?cause.message:'구매하지 못했어요.')}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 function failureMessage(reason?:string|null){
  if(reason&&reason in plannedFailureMessages)return plannedFailureMessages[reason as keyof typeof plannedFailureMessages]
  if(reason==='expired')return '낚시 시간이 지나 물고기가 떠났어요.'
  if(reason==='snap')return '너무 세게 당겨 낚싯줄이 끊어졌어요.'
  if(reason==='slack')return '낚싯줄이 느슨해져 물고기가 빠져나갔어요.'
  if(reason==='timeout')return '물고기가 멀리 달아났어요.'
  if(reason==='cancelled')return '낚시를 그만두었어요.'
  return createFishingPresentation().failure
 }
 function rememberCatch(attempt:FishingAttempt){
  if(!attempt.species||attempt.species.kind==='map')return
  setTrip(previous=>({userId,items:previous.userId===userId?previous.items.some(item=>item.operation_id===attempt.operation_id)?previous.items:[attempt,...previous.items]:[attempt]}))
 }
 function showResult(attempt:FishingAttempt,reason?:string|null){
  if(attempt.species&&!practice)rememberCatch(attempt)
  setGameOpen(false)
  setFailureReason(reason??null)
  setFailureLabel(reason&&reason in plannedFailureMessages?'입질만 하고 떠났어요':reason==='snap'||reason==='slack'?'힘 조절 실패':'다음엔 꼭 만나요')
  setResult(attempt);setUncertain(false)
  if(attempt.species){setCastOpen(false);setRevealing(true)}else{setFailureText(failureMessage(reason));setCastOpen(true)}
 }
 function showError(cause:unknown){
  setGameOpen(false)
  const definite=cause&&typeof cause==='object'&&'code' in cause&&/^[0-9A-Z]{5}$/.test(String(cause.code))
  if(definite)pending.current=null
  setCastError(fishingError(cause));setUncertain(!definite);setCastOpen(true)
 }
 async function leaveFishing(){
  if(lock.current)throw new Error('Fishing request in progress')
  if(practice){setGameOpen(false);return}
  if(!gameOpen&&!pending.current&&!uncertain)return
  lock.current=true;setBusy(true)
  try{
   // Retry the same operation after an ambiguous response, never spend another bait.
   let plan=prepared
   if(pending.current?.stage==='prepare')plan=await prepareFishing(pending.current.region,pending.current.bait,pending.current.id)
   if(!plan&&!pending.current)throw new Error('Missing fishing operation')
   if(!plan?.finished){
    pending.current??={id:plan!.operation_id,bait:plan!.bait_id,region:plan!.region_id,stage:'finish',won:false,reason:'cancelled'}
    pending.current.stage='finish';pending.current.won??=false
    const data=await finishFishing(pending.current.id,pending.current.won)
    if(data.attempt.species)rememberCatch(data.attempt)
   }
   pending.current=null;setGameOpen(false);setUncertain(false);setPrepared(null)
   await Promise.allSettled([refresh(),reload()])
  }catch(cause){showError(cause);throw cause}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 async function settle(won=true,reason?:string){
  if(lock.current)return
  if(!won)setGameOpen(false)
  setBusy(true);lock.current=true;setCastError('');setResult(null)
  if(reason)setFailureText(failureMessage(reason))
  if(practice){
   showResult({operation_id:'practice',region_id:regionId??'',bait_id:selected,rarity:won?practice:null,created_at:new Date().toISOString(),species:won?practiceSpecies(practice):null},reason)
   lock.current=false;setBusy(false);return
  }
  if(!prepared&&!pending.current){lock.current=false;setBusy(false);return}
  pending.current??={id:prepared!.operation_id,bait:prepared!.bait_id,region:prepared!.region_id,stage:'finish',won}
  pending.current.stage='finish';pending.current.won??=won
  pending.current.reason??=reason
  try{
   const data=await finishFishing(pending.current.id,pending.current.won)
   const localReason=pending.current.reason
   pending.current=null
   if(active.current)showResult(data.attempt,!data.failure_reason||data.failure_reason==='minigame'?localReason:data.failure_reason)
   await Promise.allSettled([refresh(),reload()])
  }catch(cause){if(active.current)showError(cause)}
  finally{lock.current=false;if(active.current)setBusy(false)}
 }
 async function beginFight(){
  if(practice||!prepared?.confirm_bite)return true
  if(lock.current)return false
  lock.current=true;setBusy(true)
  try{
   const plan=await startFishingFight(prepared.operation_id)
   if(!active.current)return false
   setPrepared(plan)
   if(plan.finished){
    if(!plan.result)throw new Error('낚시 결과를 확인하지 못했어요.')
    showResult(plan.result.attempt,plan.result.failure_reason)
    await Promise.allSettled([refresh(),reload()])
    return false
   }
   if(!plan.fight_started_at)throw new Error('입질 시작을 확인하지 못했어요.')
   return true
  }finally{lock.current=false;if(active.current)setBusy(false)}
 }
 async function cast(){
  if(!regionId||lock.current)return
  if(practice){startPractice(practice);return}
  if(pending.current?.stage==='finish'){await settle(pending.current.won);return}
  setPractice(null);setPrepared(null);setFailureText('');setResult(null);setError('');setCastError('')
  lock.current=true;setBusy(true);setBaitOpen(false);setCastOpen(false);setPresentation(createFishingPresentation())
  try{
   pending.current??={id:state?.prepared?.operation_id??randomId(),bait:state?.prepared?.bait_id??selected,region:state?.prepared?.region_id??regionId,stage:'prepare'}
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
 const tools=(content:React.ReactNode)=>toolbarTarget?createPortal(content,toolbarTarget):content
 const bait=state?.baits.find(item=>item.id===selected)
 const baitControl=<button type="button" aria-label={`미끼통 열기 · ${bait?.name??'미끼'} ${wallet.inventory[selected]??0}개`} title={bait?.name??'미끼통'} className={fishingTools?fishingToolButton.replace('size-9','size-11').replace('border-white/70','border-[#D5B797]').replace('bg-[#fff8eb]/90','bg-[#fff8eb]')+" border-2 bg-[#fff8eb] ring-2 ring-[#fff8eb] shadow-[0_4px_10px_#34291f40] "+(!goldLoading&&!(wallet.inventory[selected]>0)?"border-amber-500":"border-[#D5B797]"):fishingToolButton} disabled={gameOpen||busy||uncertain||revealing||castOpen} onClick={()=>{setDraftBait(selected);setBaitOpen(true)}}>{bait?<img src={bait.image_path} alt="" className={fishingTools?"size-8 object-contain":"size-6 object-contain"}/>:<appArt.bait className={fishingTools?"size-8":"size-6"}/>}<span aria-hidden="true" className={"absolute -bottom-1 min-w-4 rounded-full border border-[#fff8eb] bg-[#725039] px-1 text-center text-[9px] leading-4 tabular-nums text-[#fff8eb] "+(fishingTools?"left-1/2 -translate-x-1/2":"-right-1")}>{goldLoading?'…':wallet.inventory[selected]??0}</span></button>
  const displayPrepared=gameOpen?prepared:state?.prepared
  const displayBaitSource=state?.baits.find(item=>item.id===(displayPrepared?.bait_id??selected))
  const displayBait=displayBaitSource?fishingDisplayBait(displayBaitSource,displayPrepared):undefined
 const castLabel=busy?'낚시하는 중…':practice?`${rarities[practice].label} 테스트 시작`:uncertain?'결과 다시 확인':state?.prepared?'진행 중인 낚시 이어하기':`${bait?.name??'미끼'} 1개로 낚시하기`
 const castDisabled=busy||castOpen||revealing||(!practice&&(goldBusy||goldLoading||!!goldError||(!uncertain&&!state?.prepared&&!(wallet.inventory[selected]>0))))
 const castCaption=busy?'준비 중…':practice?`${rarities[practice].label} 테스트 시작`:uncertain?'결과 확인':state?.prepared?'이어하기':'낚시 시작'
 const baitList=(<ul className="space-y-3">{state?.baits.map(item=><li key={item.id} className={`rounded-xl border p-3 ${regionId&&selected===item.id?'border-primary/40 bg-primary/5':''}`}><div className="flex gap-3"><img src={item.image_path} alt="" className="size-12 shrink-0 object-contain"/><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h3 className="text-sm font-semibold">{item.name}</h3><span className="text-xs tabular-nums text-muted-foreground">보유 {goldLoading?'…':wallet.inventory[item.id]??0}개</span></div><p className="mt-2 text-xs leading-6 text-muted-foreground">{item.description}</p><p className="mt-2 text-xs leading-5 text-primary">{item.effect_description}</p></div></div><div className="mt-3 flex gap-2">{regionId&&<Button variant={selected===item.id?'default':'outline'} data-selection-icons aria-pressed={selected===item.id} className="min-h-11 flex-1" disabled={busy||goldBusy||uncertain} onClick={()=>setSelected(item.id)}>{selected===item.id?'선택됨':'선택'}</Button>}{item.price!==null?<Button variant="outline" className="min-h-11 flex-1" disabled={busy||goldBusy||goldLoading||!!goldError||uncertain||wallet.gold<item.price} onClick={()=>void buy(item.id)} aria-label={`${item.name} 1개 구매 ${item.price} 골드`}><GoldIcon className="size-5"/>{item.price} · 1개 구매</Button>:<span className="flex min-h-11 flex-1 items-center justify-center text-xs text-muted-foreground">획득 전용 · 획득처 준비 중</span>}</div></li>)}</ul>)
 const rodControl=<FishingRodSelector dock equipment={!!fishingTools} regionId={regionId!} disabled={gameOpen||busy||uncertain||revealing||castOpen}/>
 const equipmentControls=<>
   <FishingStorageDialog iconOnly={!!fishingTools} catches={catches} disabled={gameOpen||busy||uncertain||revealing||castOpen} onSold={ids=>setTrip(previous=>({userId,items:previous.items.filter(item=>!item.collectible_id||!ids.includes(item.collectible_id))}))}/>
   {!fishingTools&&rodControl}
   <CollectionDialog fishing dock iconOnly={!!fishingTools} disabled={gameOpen||busy||uncertain||revealing||castOpen}/>
  </>
 return <div className={regionId?"relative isolate min-h-0 flex-1 bg-[#123c68]":"space-y-5"}>
  {regionId&&<FirstDayFishingGuide/>}
  {regionId&&sceneHeader}
  {regionId&&oddsTarget&&createPortal(<FishingOdds bait={displayBait??bait} successChanceBp={state?.successChanceBp} rod={rods.find(r=>r.id===equippedRod)} baseChanceBp={state?.baits.find(b=>b.id==='bait')?.baseSuccessChanceBp}/>,oddsTarget)}
  {regionId&&<FishingLeaveGuard active={gameOpen||uncertain||busy} practice={!!practice} busy={busy} onPause={setLeavePaused} onLeave={leaveFishing}/>}
  {regionId?(fishingTools?<>
   {fishingTools.rodTarget&&createPortal(rodControl,fishingTools.rodTarget)}
   {fishingTools.baitTarget&&createPortal(baitControl,fishingTools.baitTarget)}
   {fishingTools.equipmentTarget&&createPortal(equipmentControls,fishingTools.equipmentTarget)}
  </>:<div role="group" aria-label="낚시 준비 도구" className="absolute bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-2 z-20 grid w-40 grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#D5B797] bg-[#D5B797] shadow-sm">{baitControl}{equipmentControls}</div>):<div className="flex items-center justify-between"><h2 className="font-semibold">미끼 인벤토리</h2><span className="flex items-center gap-1 text-sm"><GoldIcon/>{wallet.gold.toLocaleString('ko-KR')}</span></div>}
  {!state&&!error&&<p role="status" className={regionId?"sr-only":"text-sm"}>미끼를 불러오는 중…</p>}
  {error&&<div role="alert" className={regionId?"absolute inset-x-4 top-28 z-20 space-y-2 rounded-xl bg-background/95 p-3 text-sm text-destructive":"space-y-2 text-sm text-destructive"}><p>{error}</p>{!uncertain&&<Button variant="outline" onClick={()=>void Promise.all([reload(),refresh()])}>다시 불러오기</Button>}</div>}
  {goldError&&<p role="alert" className={regionId?"absolute inset-x-4 top-28 z-20 rounded-xl bg-background/95 p-3 text-sm text-destructive":"text-sm text-destructive"}>{goldError}</p>}
  {regionId?<Dialog open={baitOpen} onOpenChange={setBaitOpen}><DialogContent className="notification-sheet bottom-0 top-auto left-0 flex max-h-[85dvh] max-w-full translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-2xl rounded-b-none pb-0 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2"><DialogHeader className="shrink-0 pr-7"><DialogTitle className="flex items-center gap-2"><img src="/branding/pongi-starfish.png" alt="" className="size-6 object-contain"/>미끼통</DialogTitle><DialogDescription className="sr-only">사용할 미끼를 선택하세요.</DialogDescription></DialogHeader><ul className="-mx-4 min-h-0 divide-y border-t overflow-y-auto overscroll-contain">{state?.baits.filter(item=>wallet.inventory[item.id]>0).map(item=><li key={item.id}><button type="button" aria-label={item.name+' 선택'} aria-pressed={draftBait===item.id} disabled={busy||goldBusy||uncertain||!(wallet.inventory[item.id]>0)} onClick={()=>setDraftBait(item.id)} className={'flex min-h-20 w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-40 '+(draftBait===item.id?'bg-secondary':'hover:bg-secondary/40')}><span className="relative size-12 shrink-0"><LandscapeImage retryable={false} src={item.image_path} alt="" className="absolute inset-0 size-full object-contain"/></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5 text-sm">{item.name}</span><span className="mt-1 block">{item.mechanicsVersion===2?<><BaitTarget bait={item}/>{item.alternating&&<span className="block text-[11px] leading-5 text-primary">다음: {item.nextRarity==='rare'?'희귀':'일반'} 전용</span>}</>:<span className="text-xs leading-5 text-muted-foreground">{fishingBaitSummary(item)}</span>}</span></span><span className="flex min-w-16 shrink-0 flex-col items-end gap-0.5 border-l border-border pl-3"><span className="text-[10px] text-muted-foreground">보유</span><span className="text-base font-semibold tabular-nums text-primary">{(wallet.inventory[item.id]??0).toLocaleString('ko-KR')}<span className="ml-0.5 text-xs font-normal">개</span></span></span></button></li>)}</ul><div className="-mx-4 grid shrink-0 grid-cols-2 border-t bg-background pb-[env(safe-area-inset-bottom)]"><Link to="/shop?tab=bait" aria-label="미끼 상점으로" className="flex h-14 items-center justify-center gap-1 border-r bg-secondary/40 text-sm text-primary outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">상점<span aria-hidden="true">→</span></Link><Button aria-label="선택한 미끼 사용하기" className="h-14 w-full rounded-none" disabled={busy||goldBusy||uncertain||!(wallet.inventory[draftBait]>0)} onClick={()=>{setSelected(draftBait);setBaitOpen(false)}}>사용</Button></div></DialogContent></Dialog>:baitList}
  {regionId&&<TensionFishingGame backgroundMusic onStartFight={!practice&&prepared?.confirm_bite?beginFight:undefined} serverNow={practice?undefined:prepared?.server_now} expiresAt={practice?undefined:prepared?.expires_at} baitImage={state?.baits.find(item=>item.id===(prepared?.bait_id??selected))?.image_path} start={bait&&!castOpen&&!revealing?{label:castLabel,caption:castCaption,disabled:castDisabled,onStart:()=>void cast()}:undefined} regionId={regionId} regionName={regionName} toolbarTarget={toolbarTarget} castId={gameOpen?(prepared?.operation_id??'practice-'+practice):"ready"} active={gameOpen} paused={leavePaused} quiet={!gameOpen&&(revealing||castOpen)} challenge={{confirmBite:practice?undefined:prepared?.confirm_bite,rarity:practice??prepared?.rarity??'common',wait:prepared?.wait_seconds,failureAt:prepared&&!prepared.eligible?preparedFailureSeconds:undefined,failureReason:prepared?.failure_reason}} outline={practice?practiceSpecies(practice):prepared?.species} practice={!!practice} onCancel={()=>void settle(false,'cancelled')} onFailed={reason=>void settle(false,reason)} onCaught={()=>void settle(true)}/>}
  {regionId&&!toolbarTarget&&tools(<>
   <div className={toolbarTarget?"order-10":"absolute right-16 top-3 z-20"}><TooltipProvider><Tooltip><TooltipTrigger render={<Link to="/harbor" aria-label="지도" className="flex size-11 items-center justify-center rounded-full border border-white/20 bg-slate-950/20 text-xl text-white backdrop-blur-sm hover:bg-slate-950/35"/>}><Map className="size-6" aria-hidden="true"/></TooltipTrigger><TooltipContent>지도</TooltipContent></Tooltip></TooltipProvider></div>
  </>)}
  {regionId&&gameOpen&&practice&&<span className="pointer-events-none absolute left-3 top-16 z-20 rounded-full sm:top-3 bg-black/20 px-3 py-1 text-xs text-white">{rarities[practice].label} 힘 테스트</span>}

  {revealing&&result?.species&&<CatchReveal species={result.species} firstDiscovery={result.firstDiscovery} practice={!!practice} regionName={regionName} caughtAt={result.created_at} onShare={!practice&&session?.user.id&&result.operation_id!=='practice'?()=>{const id=startShowcaseDraft({owner:session.user.id,operationId:result.operation_id,firstDiscovery:!!result.firstDiscovery,renderVersion:1,species:result.species!,regionName:regionName??'퐁당섬 앞바다',caughtAt:result.created_at,preview:false});setRevealing(false);navigate('/showcase/new',{state:{showcaseDraft:id}})}:undefined} onDismiss={()=>{setRevealing(false);setResult(null)}}/> }
  {presentation&&castOpen&&!result?.species&&(castError?<div className="absolute inset-x-4 top-1/2 z-30 mx-auto max-h-[80%] max-w-sm -translate-y-1/2 overflow-y-auto rounded-2xl bg-background/95"><FishingResultCard result={null} pending={busy} error={castError} practice={!!practice} failure={failureText||presentation.failure} onContinue={()=>setCastOpen(false)} onRetry={()=>void cast()}/></div>:!busy&&<CatchReveal failureReason={failureReason} failureLabel={failureLabel} failure={failureText||presentation.failure} practice={!!practice} onDismiss={()=>setCastOpen(false)}/>)}

  {regionId&&!toolbarTarget&&!gameOpen&&!busy&&!revealing&&!castOpen&&!uncertain&&tools(<div className={toolbarTarget?"relative order-50 text-white":"absolute left-3 top-3 z-20 text-white"}>
   <TooltipProvider><Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="힘 테스트" aria-expanded={testOpen} className="size-11 rounded-full border border-white/20 bg-slate-950/20 text-white hover:bg-slate-950/35 hover:text-white" onClick={()=>setTestOpen(value=>!value)}/> }><FlaskConical className="size-5"/></TooltipTrigger><TooltipContent>낚시 힘 테스트</TooltipContent></Tooltip></TooltipProvider>
   {testOpen&&<div className="absolute right-0 top-full mt-2 w-36 rounded-2xl border border-white/15 bg-slate-950/85 p-2 shadow-xl backdrop-blur-md"><p className="px-2 py-1 text-[10px] text-white/50">미끼·보상 없는 연습</p><div className="flex flex-col gap-1"><Button variant="ghost" className="min-h-10 justify-start px-2 text-xs text-white hover:bg-white/15 hover:text-white" data-selection-icons aria-pressed={practice===null} onClick={()=>{setPractice(null);setTestOpen(false)}}>실전</Button>{(Object.keys(rarities) as Rarity[]).map(rarity=><Button key={rarity} variant="ghost" className="min-h-10 justify-start gap-2 px-2 text-xs text-white hover:bg-white/15 hover:text-white" disabled={!!state?.prepared} data-selection-icons aria-pressed={practice===rarity} onClick={()=>{setPractice(rarity);setTestOpen(false)}}><span className="size-2 rounded-sm" style={{backgroundColor:rarities[rarity].effectColor}}/>{rarities[rarity].label}</Button>)}</div></div>}
  </div>)}
  {regionId&&<Link to="/aquarium" className="sr-only focus:not-sr-only focus:absolute focus:bottom-2 focus:z-30">아쿠아리움 보관함으로</Link>}
 </div>
}
