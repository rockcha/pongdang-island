import {ExpeditionResults} from './expedition-results'
import {ActiveExpeditionCard} from './active-expedition-card'
import {useEffect,useEffectEvent,useRef,useState} from 'react'
import {Link,useSearchParams} from 'react-router'
import {ArrowRight} from 'lucide-react'
import {toast} from 'sonner'
import {useAuth} from '@/components/auth-provider'
import {Button} from '@/components/ui/button'
import {BoatImage,BoatPicker,RegionPicker,BaitCargoSheet,VesselStats,CargoMeter} from './expedition-controls'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {TradeQuestion} from '@/components/trade-question'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {loadRegionMap} from '@/features/regions/api'
import type {Region} from '@/features/regions/api'
import {randomId} from '@/lib/random-id'
import {changeExpedition,duration,expeditionError,loadExpeditions} from './api'
import type {ExpeditionOutcome,ExpeditionAction,ExpeditionState,Vessel} from './api'

export function ExpeditionPage({shipyard=false}:{shipyard?:boolean}){const {session}=useAuth();return <AccountExpeditions key={`${session?.user.id}:${shipyard}`} shipyard={shipyard}/>}
function AccountExpeditions({shipyard}:{shipyard:boolean}){
 const {wallet,refresh}=useGold();const [params]=useSearchParams()
 const [state,setState]=useState<ExpeditionState|null>(null),[regions,setRegions]=useState<Region[]>([])
 const [vesselId,setVesselId]=useState('dinghy'),[regionId,setRegionId]=useState(params.get('region')??'pongdang'),[cargo,setCargo]=useState<Record<string,number>>({})
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState<ExpeditionAction|null>(null),[result,setResult]=useState<ExpeditionOutcome|null>(null),[now,setNow]=useState(0)
 const [pending,setPending]=useState<ExpeditionAction|null>(null)
 const [cargoOpen,setCargoOpen]=useState(false)
 const offset=useRef(0),locked=useRef(false),alive=useRef(true),revision=useRef(0)
 function apply(data:ExpeditionState){if(!alive.current)return;offset.current=Date.parse(data.serverNow)-Date.now();setState(data);setNow(Date.now()+offset.current)}
 async function reload(){if(locked.current)return;const version=++revision.current;try{const [data,map]=await Promise.all([loadExpeditions(),loadRegionMap()]);if(alive.current&&version===revision.current&&!locked.current){apply(data);setRegions(map.regions.filter(r=>r.unlocked));setError('')}}catch(e){if(alive.current&&version===revision.current&&!locked.current)setError(expeditionError(e))}}
 const onFocus=useEffectEvent(()=>{void reload();void refresh()})
 useEffect(()=>{alive.current=true;onFocus();const timer=setInterval(()=>setNow(Date.now()+offset.current),1000);const focus=()=>{if(document.visibilityState!=='hidden')onFocus()};const poll=setInterval(focus,30000);window.addEventListener('focus',focus);window.addEventListener('online',focus);window.addEventListener('expedition-changed',focus);document.addEventListener('visibilitychange',focus);return()=>{alive.current=false;revision.current++;clearInterval(timer);clearInterval(poll);window.removeEventListener('focus',focus);window.removeEventListener('online',focus);window.removeEventListener('expedition-changed',focus);document.removeEventListener('visibilitychange',focus)}},[])
 async function act(args:ExpeditionAction){if(locked.current)return;locked.current=true;revision.current++;setBusy(true);setError('');setPending(args);try{const data=await changeExpedition(args);if(!alive.current)return;apply(data);setPending(null);setConfirm(null);if(args.p_action==='claim')setResult(data.receipt?.result??{items:[]});if(args.p_action==='buy')toast.success('어선을 구매했습니다.');if(args.p_action==='depart'){setCargo({});setResult(null)}await refresh()}catch(e){if(alive.current){setError(expeditionError(e));if((e as {code?:string}).code)setPending(null)}}finally{locked.current=false;if(alive.current)setBusy(false)}}
 function request(action:ExpeditionAction['p_action'],extras:Partial<ExpeditionAction>={}){setError('');setConfirm({p_action:action,p_operation_id:randomId(),...extras})}
 const vessel=state?.vessels.find(v=>v.id===vesselId),active=state?.active,total=Object.values(cargo).reduce((a,b)=>a+b,0),remaining=active?Math.max(0,Date.parse(active.returns_at)-now):0
 const buying=state?.vessels.find(v=>v.id===confirm?.p_vessel_id)
 return <section className={`mx-auto w-full min-w-0 max-w-lg ${shipyard?'flex min-h-0 flex-1 flex-col overflow-hidden':`flex min-h-0 flex-1 flex-col gap-3 py-3 ${active?'overflow-y-auto overscroll-contain':'overflow-hidden'}`}`}>
  {shipyard&&<div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2"><p className="text-xs leading-5 text-muted-foreground">다음 항해에 함께할 어선을 만나보세요.</p><Link className="shrink-0 text-xs text-primary underline underline-offset-4" to="/expeditions">파견 준비 <ArrowRight className="inline size-3"/></Link></div>}
  {(error||pending)&&!confirm&&<div role="alert" className="rounded-xl border p-4 text-sm">{error||'이전 요청의 결과를 다시 확인해주세요.'}<Button variant="outline" className="mt-3 block" onClick={()=>pending?void act(pending):void reload()} disabled={busy}>{pending?'요청 결과 다시 확인':'다시 불러오기'}</Button></div>}
  {!state&&!error&&<p role="status" className="py-12 text-center text-sm text-muted-foreground">항구를 준비하는 중…</p>}
  {shipyard?<div aria-label="어선 목록" className="min-h-0 flex-1 overflow-y-auto overscroll-contain"><div className="grid grid-cols-2">{state?.vessels.map(v=><article key={v.id} className="flex min-w-0 flex-col border-b border-border p-3 odd:border-r"><BoatImage id={v.id} name={v.name} className="h-28 w-full"/><div className="flex-1"><VesselDetails vessel={v}/></div><div className="mt-3 border-t border-border pt-3"><Button aria-label={v.owned?v.name+' 보유 중':v.name+' 구매 '+v.price+' 골드'} className="min-h-11 w-full gap-1.5 rounded-lg" variant={v.owned?'secondary':'default'} disabled={v.owned||busy||!!pending||wallet.gold<v.price} onClick={()=>request('buy',{p_vessel_id:v.id})}>{v.owned?'보유 중':<><GoldIcon className="size-4"/>{v.price.toLocaleString('ko-KR')}</>}</Button></div></article>)}</div></div>:<>
  {active?<ActiveExpeditionCard expedition={active} baits={state?.baits??[]} regionName={regions.find(r=>r.id===active.region_id)?.name??active.region_id} remaining={remaining}>{!remaining?<Button className="w-full min-h-11" disabled={busy||!!pending} onClick={()=>void act({p_action:'claim',p_operation_id:randomId(),p_expedition_id:active.id})}>결과 수령하기</Button>:null}</ActiveExpeditionCard>:state&&<>
   {result?<div className="flex min-h-0 flex-1 flex-col gap-3"><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1"><ExpeditionResults outcome={result}/></div><div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border/60 bg-background pt-3 pb-[env(safe-area-inset-bottom)]"><Link to="/aquarium" className="flex min-h-12 items-center justify-center rounded-xl border border-border text-xs text-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">보관함 보기</Link><Button className="min-h-12 rounded-xl text-xs" onClick={()=>setResult(null)}>다시 파견하기</Button></div></div>:<>
   <fieldset disabled={busy||!!pending} className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-3 disabled:opacity-70">
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-1 pb-2"><BoatPicker vessels={state.vessels.filter(v=>v.owned)} disabled={busy||!!pending} value={vesselId} onChange={id=>{setVesselId(id);setCargo({})}}/>
    <RegionPicker regions={regions} value={regionId} onChange={setRegionId}/>
    <div className="flex flex-col">{vessel&&<BaitCargoSheet open={cargoOpen} onOpenChange={setCargoOpen} baits={state.baits} inventory={wallet.inventory} cargo={cargo} vessel={vessel} onChange={(id,n)=>setCargo(old=>{const next={...old};if(n)next[id]=n;else delete next[id];return next})}/>}
    {total>0&&<div className="space-y-2"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">실은 미끼 {total}개</span><button type="button" className="min-h-9 px-2 text-primary" aria-label="미끼 변경" onClick={()=>setCargoOpen(true)}>변경</button></div><div aria-label="적재된 미끼 목록" className="grid grid-cols-2 gap-2">{state.baits.filter(b=>(cargo[b.id]??0)>0).map(b=><span key={b.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-secondary/35 px-2 py-2 text-xs"><img src={b.image_path} alt={b.name} className="size-9 shrink-0 object-contain"/><span className="min-w-0 flex-1 break-words leading-5">{b.name}</span><span className="shrink-0 font-semibold tabular-nums text-primary">×{cargo[b.id]}</span></span>)}</div></div>}
    {!state.baits.some(b=>wallet.inventory[b.id])&&<p className="text-sm text-muted-foreground">미끼가 없어요. <Link to="/shop?tab=bait" className="text-primary underline">상점에서 준비하기</Link></p>}
    </div></div><div className="shrink-0 border-t border-border bg-background pt-3 pb-[env(safe-area-inset-bottom)]">{vessel&&<CargoMeter total={total} min={vessel.min_baits} max={vessel.max_baits}/>}<Button aria-label={vessel&&total>=vessel.min_baits?'어선 파견하기':undefined} className="min-h-14 w-full rounded-xl text-base" disabled={!vessel||total>vessel.max_baits||!regions.some(r=>r.id===regionId)} onClick={()=>{if(vessel&&total<vessel.min_baits)setCargoOpen(true);else request('depart',{p_vessel_id:vesselId,p_region_id:regionId,p_cargo:cargo})}}>{vessel&&total<vessel.min_baits?'미끼 선택하기':'어선 파견하기'}</Button></div>
   </fieldset></>}
  </>}

  </>}
  <ConfirmDialog illustration={confirm?.p_action==='buy'?'purchase':confirm?.p_action==='instant'?'return':'dispatch'} open={!!confirm} onOpenChange={open=>{if(!open&&!pending)setConfirm(null)}} title={confirm?.p_action==='buy'&&buying?<TradeQuestion name={buying.name} price={buying.price}/>:confirm?.p_action==='instant'?'조업을 마치고 바로 귀항할까요?':'미끼를 맡기고 어선을 파견할까요?'} description={confirm?.p_action==='buy'?'구매한 어선은 다음 파견에서도 계속 사용할 수 있어요.':confirm?.p_action==='instant'?'테스트용 기능이에요. 귀항 후 결과 수령 버튼을 눌러주세요.':`${total}개의 미끼로 ${vessel?duration(vessel.duration_minutes):''} 동안 조업해요. 출항 후에는 취소할 수 없어요.`} busy={busy} error={error} onConfirm={()=>{if(confirm)void act(pending??confirm)}}/>
 </section>
}
function VesselDetails({vessel:v}:{vessel:Vessel}){return <><h2 className="text-sm leading-5">{v.name}</h2><VesselStats vessel={v}/></>}
