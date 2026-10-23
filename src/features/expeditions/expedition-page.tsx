import {playPurchaseSound} from '@/features/gold/purchase-sound'
import {TrapResultPreview} from './trap-result-preview'
import {ExpeditionResults} from './expedition-results'
import {ActiveExpeditionCard} from './active-expedition-card'
import {useEffect,useEffectEvent,useRef,useState} from 'react'
import {Link,useSearchParams} from 'react-router'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {BoatImage,RegionPicker,BaitCargoSheet} from './expedition-controls'
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {useGold} from '@/features/gold/gold-provider'
import {loadRegionMap} from '@/features/regions/api'
import type {Region} from '@/features/regions/api'
import {randomId} from '@/lib/random-id'
import {changeExpedition,duration,expeditionError,loadExpeditions,fixedExpeditionVessel} from './api'
import type {ExpeditionOutcome,ExpeditionAction,ExpeditionState} from './api'

export function ExpeditionPage(){const {session}=useAuth();return <AccountExpeditions key={session?.user.id}/>}
function AccountExpeditions(){
 const {wallet,refresh}=useGold();const [params]=useSearchParams()
 const [state,setState]=useState<ExpeditionState|null>(null),[regions,setRegions]=useState<Region[]>([])
 const vesselId='dinghy';const [regionId,setRegionId]=useState(params.get('region')??'pongdang'),[cargo,setCargo]=useState<Record<string,number>>({})
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState<ExpeditionAction|null>(null),[result,setResult]=useState<ExpeditionOutcome|null>(null),[now,setNow]=useState(0)
 const [pending,setPending]=useState<ExpeditionAction|null>(null)
 const [cargoOpen,setCargoOpen]=useState(false)
 const [baitInfo,setBaitInfo]=useState<string|null>(null)
 const inspectedBait=state?.baits.find(b=>b.id===baitInfo)
 const offset=useRef(0),locked=useRef(false),alive=useRef(true),revision=useRef(0)
 function apply(data:ExpeditionState){if(!alive.current)return;offset.current=Date.parse(data.serverNow)-Date.now();setState(data);setNow(Date.now()+offset.current)}
 async function reload(){if(locked.current)return;const version=++revision.current;try{const [data,map]=await Promise.all([loadExpeditions(),loadRegionMap()]);if(alive.current&&version===revision.current&&!locked.current){apply(data);setRegions(map.regions.filter(r=>r.unlocked));setError('')}}catch(e){if(alive.current&&version===revision.current&&!locked.current)setError(expeditionError(e))}}
 const onFocus=useEffectEvent(()=>{void reload();void refresh()})
 useEffect(()=>{alive.current=true;onFocus();const timer=setInterval(()=>setNow(Date.now()+offset.current),1000);const focus=()=>{if(document.visibilityState!=='hidden')onFocus()};const poll=setInterval(focus,30000);window.addEventListener('focus',focus);window.addEventListener('online',focus);window.addEventListener('expedition-changed',focus);document.addEventListener('visibilitychange',focus);return()=>{alive.current=false;revision.current++;clearInterval(timer);clearInterval(poll);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);window.removeEventListener('expedition-changed',focus);document.removeEventListener('visibilitychange',focus)}},[])
 async function act(args:ExpeditionAction){if(locked.current)return;locked.current=true;revision.current++;setBusy(true);setError('');setPending(args);try{const data=await changeExpedition(args);if(!alive.current)return;apply(data);if(args.p_action==='buy')playPurchaseSound(args.p_operation_id);setPending(null);setConfirm(null);if(args.p_action==='claim')setResult(data.receipt?.result??{items:[]});if(args.p_action==='depart'){setCargo({});setResult(null)}await refresh()}catch(e){if(alive.current){setError(expeditionError(e));if((e as {code?:string}).code)setPending(null)}}finally{locked.current=false;if(alive.current)setBusy(false)}}
 function request(action:ExpeditionAction['p_action'],extras:Partial<ExpeditionAction>={}){setError('');setConfirm({p_action:action,p_operation_id:randomId(),...extras})}
 const vessel=state?fixedExpeditionVessel:undefined,active=state?.active,total=Object.values(cargo).reduce((a,b)=>a+b,0),remaining=active?Math.max(0,Date.parse(active.returns_at)-now):0
 const lureMinutes=total*(state?.minutesPerBait??fixedExpeditionVessel.duration_minutes)
 return <section className={`mx-auto flex min-h-0 w-full min-w-0 max-w-lg flex-1 flex-col gap-3 py-3 ${active?'overflow-y-auto overscroll-contain':'overflow-hidden'}`}>
  {(error||pending)&&!confirm&&<div role="alert" className="rounded-xl border p-4 text-sm">{error||'이전 요청의 결과를 다시 확인해주세요.'}<Button variant="outline" className="mt-3 block" onClick={()=>pending?void act(pending):void reload()} disabled={busy}>{pending?'요청 결과 다시 확인':'다시 불러오기'}</Button></div>}
  {!state&&!error&&<p role="status" className="py-12 text-center text-sm text-muted-foreground">통발을 준비하는 중…</p>}
  {active?<ActiveExpeditionCard expedition={active} baits={state?.baits??[]} regionName={regions.find(r=>r.id===active.region_id)?.name??active.region_id} remaining={remaining}>{!remaining?<Button className="w-full min-h-11" disabled={busy||!!pending} onClick={()=>void act({p_action:'claim',p_operation_id:randomId(),p_expedition_id:active.id})}>결과 수령하기</Button>:null}</ActiveExpeditionCard>:state&&<>
   {result?<div className="flex min-h-0 flex-1 flex-col gap-3"><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1"><ExpeditionResults outcome={result}/></div><div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border/60 bg-background pt-3 pb-[env(safe-area-inset-bottom)]"><Link to="/aquarium" className="flex min-h-12 items-center justify-center rounded-xl border border-border text-xs text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">보관함 보기</Link><Button className="min-h-12 rounded-xl text-xs" onClick={()=>setResult(null)}>다시 설치하기</Button></div></div>:<>
   <div inert={busy||!!pending} aria-busy={busy} className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-3">
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-1 pb-1"><div className="flex w-full shrink-0 items-center gap-3 rounded-2xl bg-secondary/30 px-4 py-3"><BoatImage id="dinghy" name="꼬마 통발" className="h-[clamp(72px,14dvh,112px)] w-24 shrink-0"/><div className="min-w-0 flex-1 space-y-1"><h2 className="text-base">꼬마 통발</h2><p className="text-xs leading-5 text-primary">예상 유인 시간 {duration(lureMinutes)}</p></div></div>
    <RegionPicker regions={regions} value={regionId} onChange={setRegionId}/>
    <div className="shrink-0 space-y-2"><div className="flex min-h-9 items-center justify-between gap-2"><h2 className="flex items-center gap-1.5 text-sm text-muted-foreground"><img src="/app-icons/bait.png" alt="" aria-hidden="true" className="size-5 shrink-0 object-contain"/>넣은 미끼</h2>{total>0&&<button type="button" className="min-h-9 px-2 text-xs text-primary" aria-label="미끼 변경" onClick={()=>setCargoOpen(true)}>변경</button>}</div>
     {total>0&&<div aria-label="넣은 미끼 목록" className="grid grid-cols-3 gap-1.5">{state.baits.filter(b=>(cargo[b.id]??0)>0).map(b=><button type="button" key={b.id} aria-label={b.name+' '+cargo[b.id]+'개 정보'} onClick={()=>setBaitInfo(b.id)} className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-secondary/35 px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={b.image_path} alt={b.name} className="size-8 shrink-0 object-contain"/><span className="text-xs font-semibold tabular-nums text-primary">×{cargo[b.id]}</span></button>)}</div>}
    </div>
    <div className="flex flex-col">{vessel&&<BaitCargoSheet open={cargoOpen} onOpenChange={setCargoOpen} baits={state.baits} inventory={wallet.inventory} cargo={cargo} vessel={vessel} onChange={(id,n)=>setCargo(old=>{const next={...old};if(n)next[id]=n;else delete next[id];return next})}/>}
    {!state.baits.some(b=>wallet.inventory[b.id])&&<p className="text-sm text-muted-foreground">미끼가 없어요. <Link to="/shop?tab=bait" className="text-primary underline">상점에서 준비하기</Link></p>}
    </div></div><div className="shrink-0 space-y-2 border-t border-border bg-background pt-1 pb-[env(safe-area-inset-bottom)]">
     <div className="flex min-h-9 items-center justify-between gap-2 text-xs"><span className="text-muted-foreground">넣은 미끼 <strong className="font-medium tabular-nums text-foreground">{total}개</strong><span className="ml-1.5 text-muted-foreground">· 최대 {vessel?.max_baits??30}개</span></span></div>
     <div role="progressbar" aria-label="미끼 넣기 현황" aria-valuemin={0} aria-valuemax={vessel?.max_baits??30} aria-valuenow={total} className="h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{width:Math.min(100,total/(vessel?.max_baits??30)*100)+'%'}}/></div>
     <div className="flex gap-2 [&>button:first-child]:min-w-0 [&>button:first-child]:flex-1 [&>button:first-child]:w-auto"><Button aria-label={vessel&&total>=vessel.min_baits?'통발 설치하기':undefined} className="min-h-12 w-full rounded-xl text-base" disabled={!vessel||total>vessel.max_baits||!regions.some(r=>r.id===regionId)} onClick={()=>{if(vessel&&total<vessel.min_baits)setCargoOpen(true);else request('depart',{p_vessel_id:vesselId,p_region_id:regionId,p_cargo:cargo})}}>{vessel&&total<vessel.min_baits?'미끼 넣기':'통발 설치하기'}</Button><TrapResultPreview/></div></div>
   </div></>}
  </>}

  <Dialog open={!!inspectedBait} onOpenChange={open=>{if(!open)setBaitInfo(null)}}><DialogContent className="max-w-xs rounded-2xl"><DialogHeader><DialogTitle className="text-center text-base">{inspectedBait?.name}</DialogTitle><DialogDescription className="text-center">통발에 넣은 미끼 {baitInfo?cargo[baitInfo]??0:0}개</DialogDescription></DialogHeader>{inspectedBait&&<img src={inspectedBait.image_path} alt={inspectedBait.name} className="mx-auto size-24 object-contain"/>}</DialogContent></Dialog>
  <ConfirmDialog illustration="trap" open={!!confirm} onOpenChange={open=>{if(!open&&!pending)setConfirm(null)}} title="미끼를 넣고 통발을 설치할까요?" description={`${total}개의 미끼로 ${duration(lureMinutes)} 동안 물고기를 유인해요. 설치 후에는 취소할 수 없어요.`} busy={busy} error={error} onConfirm={()=>{if(confirm)void act(pending??confirm)}}/>
 </section>
}
