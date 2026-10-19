import {useEffect,useState} from 'react'
import {Link} from 'react-router'
import {Clock,Fish,Plus} from 'lucide-react'
import {useAuth} from '@/components/auth-provider'
import {appArt} from '@/components/app-art'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog'
import {ConfirmDialog} from '@/components/confirm-dialog'
import {LandscapeImage} from '@/components/landscape-image'
import {GoldIcon,useGold} from '@/features/gold/gold-provider'
import {ExpeditionResults} from '@/features/expeditions/expedition-results'
import {duration} from '@/features/expeditions/api'
import {randomId} from '@/lib/random-id'
import type {HarborAction,HarborResult,HarborVessel,HarborVoyage,HarborBoat} from './api'
import {BoatSprite} from './boat-sprite'
import {useHarbor} from './use-harbor'
import {FleetDialog} from './fleet-dialog'

export function PortPage({shipyard=false}:{shipyard?:boolean}){
 const {session}=useAuth()
 return <AccountPort key={`${session?.user.id}:${shipyard}`} shipyard={shipyard}/>
}
function VesselStats({vessel}:{vessel:Pick<HarborVessel,'duration_minutes'|'fishing_count'|'fuel_cost'>}){
 return <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Clock className="size-3.5"/>{duration(vessel.duration_minutes)}</span><span className="flex items-center gap-1"><Fish className="size-3.5"/>낚시 {vessel.fishing_count}회</span><span className="flex items-center gap-1"><appArt.fuel className="size-5"/>기름 {vessel.fuel_cost}</span></div>
}
function AccountPort({shipyard}:{shipyard:boolean}){
 const harbor=useHarbor(),{wallet}=useGold()
 const [selected,setSelected]=useState<string|null>(null),[confirm,setConfirm]=useState<HarborAction|null>(null)
 const [fuelOpen,setFuelOpen]=useState(false),[quantity,setQuantity]=useState(1),[dismissedResults,setDismissedResults]=useState<HarborResult[]|undefined>(undefined)
 const [fleetOpen,setFleetOpen]=useState(false),[fleetSlot,setFleetSlot]=useState<number|null>(null)
 const {state,busy,error,pending,now}=harbor
 const vessel=state?.boats.find(v=>v.id===selected)
 const voyage=state?.voyages.find(v=>v.boat_id===selected)
 const ready=state?.voyages.filter(v=>Date.parse(v.returns_at)<=now)??[]
 const buying=state?.vessels.find(v=>v.id===(confirm?.p_vessel_id??state.boats.find(b=>b.id===confirm?.p_boat_id)?.vessel_id))
 function request(p_action:HarborAction['p_action'],extras:Partial<HarborAction>={}){setConfirm({p_action,p_operation_id:randomId(),...extras})}
 async function execute(args:HarborAction){
  const success=await harbor.run(args)
  if(success){setConfirm(null);setSelected(null);setFuelOpen(false)}
 }
 // The returned receipt remains in server state, including when a request is retried.
 const results=state?.receipt?.results
 return <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
  <div className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 py-2">
   {!shipyard&&<h1 className="flex items-center gap-2 text-sm"><appArt.port className="size-7"/>항구</h1>}
   <Link to={shipyard?'/port':'/shipyard'} className="flex min-h-10 items-center gap-2 text-xs text-primary">{shipyard?<appArt.port className="size-6"/>:<appArt.shipyard className="size-6"/>}{shipyard?'내 항구로':'조선소'}</Link>
   {!shipyard&&<Button variant="ghost" className="min-h-10 px-2 text-xs" disabled={!state||busy||!!pending} onClick={()=>{setFleetSlot(null);setFleetOpen(true)}}>보유한 배</Button>}
   {!shipyard&&<Button variant="secondary" className="min-h-10 gap-1.5 rounded-full px-3 text-xs" disabled={!state||busy||!!pending} onClick={()=>{setQuantity(1);setFuelOpen(true)}}><appArt.fuel className="size-6"/><span className="tabular-nums">{state?.fuel??'…'}</span><Plus className="ml-1 size-3.5"/><span className="sr-only">기름 구매</span></Button>}
   {shipyard&&<p className="text-[11px] text-muted-foreground">항구에서 조업하는 나만의 배</p>}
  </div>
  {(error||pending)&&!confirm&&<div role="alert" className="shrink-0 border-b bg-background px-4 py-3 text-xs leading-5"><p>{error||'이전 요청의 결과를 확인해 주세요.'}</p><Button variant="outline" className="mt-2 min-h-10 text-xs" disabled={busy} onClick={()=>pending?void execute(pending):void harbor.reload()}>{pending?'요청 결과 다시 확인':'다시 불러오기'}</Button></div>}
  {!state&&!error&&<p role="status" className="p-8 text-center text-xs text-muted-foreground">항구를 준비하는 중…</p>}
  {shipyard?<div className="min-h-0 flex-1 overflow-y-auto"><div className="grid grid-cols-2">{state?.vessels.map(v=><article key={v.id} className="flex min-w-0 flex-col border-b p-4 odd:border-r"><BoatSprite src={v.sprite_path} name={v.name} animate={false} className="mx-auto w-full max-w-44"/><h2 className="mb-3 text-center text-sm">{v.name}</h2><VesselStats vessel={v}/><p className="mt-3 text-center text-[10px] leading-5 text-muted-foreground">일반 미끼 확률 · 미끼 소모 없음<br/>보유 {v.ownedCount} / 2척</p><Button className="mt-4 min-h-11 w-full rounded-xl" variant={v.ownedCount>=2?'secondary':'default'} disabled={v.ownedCount>=2||busy||!!pending||wallet.gold<v.price} onClick={()=>request('buy',{p_vessel_id:v.id})} aria-label={v.ownedCount>=2?`${v.name} 보유 한도 2척`:`${v.name} 구매 ${v.price} 골드`}>{v.ownedCount>=2?'2척 보유 중':<><GoldIcon className="size-4"/>{v.price.toLocaleString('ko-KR')}</>}</Button></article>)}</div></div>:<>
   <div className="relative isolate min-h-64 flex-1 overflow-hidden bg-[#70b8bd]" aria-label="내 항구의 선착장과 바다">
    <LandscapeImage src="/port/harbor-scene.png" alt="왼쪽 나무 선착장과 오른쪽으로 펼쳐진 잔잔한 바다" className="pointer-events-none absolute inset-0 size-full object-cover"/>
    {[1,2].map(slot=>{
     const boat=state?.boats.find(b=>b.dock_slot===slot),trip=boat?state?.voyages.find(t=>t.boat_id===boat.id):undefined
     const isReady=!!trip&&Date.parse(trip.returns_at)<=now
     return <div key={slot} data-dock-slot={slot}>
      <button type="button" className="absolute left-2 z-10 min-h-11 max-w-[44%] rounded-xl border border-white/50 bg-[#fff7e7]/95 px-3 py-2 text-left text-[#654932] shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" style={{top:`${31+(slot-1)*31}%`}} disabled={!state||busy||!!pending} onClick={()=>{if(boat)setSelected(boat.id);else{setFleetSlot(slot);setFleetOpen(true)}}} aria-label={boat?`${boat.name} ${boat.instance_no}호 · ${!trip?'출항 준비':isReady?'수확 가능':'조업 중'}`:`${slot}번 선착장 배 배치`}>
       <span className="mb-1 block text-[9px] text-[#9b7d60]">{slot}번 선착장{trip?' · 귀항 자리':''}</span><span className="block text-xs">{boat?`${boat.name} ${boat.instance_no}호`:'배 배치하기'}</span><span className="mt-1 block text-[10px] text-[#927258]">{!boat?'보유한 배에서 선택':!trip?'출항 준비':isReady?'귀항 완료 · 수확 가능':remainingTime(trip.returns_at,now)}</span>
      </button>
      {boat&&<MooredBoat key={boat.id} vessel={boat} voyage={trip} now={now} index={slot-1} departure={harbor.departure} onSelect={()=>setSelected(boat.id)} onArrival={harbor.acknowledgeArrival}/>}
     </div>
    })}
    {state&&!state.boats.length&&<div className="pointer-events-none absolute inset-x-6 bottom-5 rounded-xl bg-[#fff7e7]/90 p-3 text-center text-xs leading-6 text-[#795b42]">조선소에서 첫 배를 데려와 보세요.</div>}
   </div>
   <div className="shrink-0 border-t bg-background px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]"><p className="mb-2 text-center text-[10px] text-muted-foreground">퐁당섬 앞바다 · 일반 미끼 확률로 자동 낚시</p><Button className="min-h-12 w-full rounded-xl" disabled={!ready.length||busy||!!pending} onClick={()=>request('claim_all')}><appArt.storage className="size-6"/>돌아온 배 모두 수확{ready.length?` · ${ready.length}척`:''}</Button></div>
  </>}
  <Dialog open={!!vessel} onOpenChange={open=>{if(!open)setSelected(null)}}><DialogContent className="max-w-sm rounded-2xl"><DialogHeader><DialogTitle className="text-center text-base font-normal">{vessel?.name}</DialogTitle><DialogDescription className="text-center">{!voyage?'기름을 채우고 느긋하게 바다로 떠나요.':Date.parse(voyage.returns_at)>now?'먼바다에서 조업하고 있어요.':'조업을 마치고 선착장에 돌아왔어요.'}</DialogDescription></DialogHeader>{vessel&&<><BoatSprite src={vessel.sprite_path} name={vessel.name} className="mx-auto w-40"/><VesselStats vessel={vessel}/><p className="text-center text-xs text-muted-foreground">{voyage&&Date.parse(voyage.returns_at)>now?remainingTime(voyage.returns_at,now):`보유 기름 ${state?.fuel??0}개`}</p><Button className="min-h-12 rounded-xl" disabled={busy||!!pending||!!voyage&&Date.parse(voyage.returns_at)>now||!voyage&&(state?.fuel??0)<vessel.fuel_cost} onClick={()=>{setSelected(null);if(voyage)request('claim',{p_voyage_id:voyage.id});else request('depart',{p_vessel_id:vessel.vessel_id,p_boat_id:vessel.id})}}>{voyage?'조업 결과 수확':`기름 ${vessel.fuel_cost}개로 출항`}</Button></>}</DialogContent></Dialog>
  <FleetDialog open={fleetOpen} onOpenChange={setFleetOpen} state={state} slot={fleetSlot} onSlotChange={setFleetSlot} disabled={busy||!!pending} onRequest={request}/>
  <Dialog open={fuelOpen} onOpenChange={setFuelOpen}><DialogContent className="max-w-sm rounded-2xl"><DialogHeader><DialogTitle className="flex items-center justify-center gap-2 text-base font-normal"><appArt.fuel className="size-8"/>기름 채우기</DialogTitle><DialogDescription className="text-center">배가 먼바다로 떠날 때 사용하는 기름이에요.</DialogDescription></DialogHeader><div className="flex items-center gap-3"><Input aria-label="구매할 기름 수량" type="number" inputMode="numeric" min={1} max={100} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(100,Math.floor(Number(e.target.value))||1)))}/>{[1,5,10].map(n=><Button key={n} variant="secondary" className="min-h-11 px-3" onClick={()=>setQuantity(n)}>{n}개</Button>)}</div><Button className="min-h-12 rounded-xl" disabled={busy||!!pending||wallet.gold<quantity*(state?.fuelPrice??50)} onClick={()=>{setFuelOpen(false);request('fuel',{p_quantity:quantity})}}><GoldIcon/>{(quantity*(state?.fuelPrice??50)).toLocaleString('ko-KR')} 골드로 구매</Button></DialogContent></Dialog>
  <ConfirmDialog open={!!confirm} onOpenChange={open=>{if(!open&&!pending)setConfirm(null)}} illustration={confirm?.p_action==='buy'||confirm?.p_action==='fuel'?'purchase':confirm?.p_action==='depart'?'dispatch':'return'} title={confirm?.p_action==='buy'?`${buying?.name??'배'}를 구매할까요?`:confirm?.p_action==='fuel'?`기름 ${confirm.p_quantity}개를 채울까요?`:confirm?.p_action==='depart'?`${buying?.name??'배'}를 출항시킬까요?`:confirm?.p_action==='dock'?`${confirm.p_slot}번 선착장의 배를 교체할까요?`:confirm?.p_action==='store'?'이 배를 보관할까요?':'돌아온 배의 조업 결과를 수확할까요?'} description={confirm?.p_action==='buy'?`${buying?.price??0}골드 · 구매한 배는 항구에서 계속 사용할 수 있어요.`:confirm?.p_action==='fuel'?`${(confirm.p_quantity??1)*(state?.fuelPrice??50)}골드가 소모돼요.`:confirm?.p_action==='depart'?`기름 ${buying?.fuel_cost??0}개 · ${duration(buying?.duration_minutes??0)} 동안 낚시 ${buying?.fishing_count??0}회. 출항 후에는 취소할 수 없어요.`:confirm?.p_action==='dock'?'기존 배는 보유한 배 목록으로 옮겨져요. 조업 중인 자리는 교체할 수 없어요.':confirm?.p_action==='store'?'보유한 배 목록에서 다시 배치할 수 있어요.':'획득한 개체는 보관함으로 들어가요. 낚시는 실패할 수도 있어요.'} busy={busy} error={error} onConfirm={()=>{if(confirm)void execute(pending??confirm)}}/>
  <Dialog open={!!results&&results!==dismissedResults} onOpenChange={open=>{if(!open)setDismissedResults(results)}}><DialogContent className="max-h-[85dvh] max-w-sm overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle className="text-base font-normal">항구의 조업 결과</DialogTitle><DialogDescription>돌아온 배들이 가져온 바다의 선물이에요.</DialogDescription></DialogHeader>{results?.length?results.map(r=><div key={r.voyageId}><h3 className="mb-3 text-sm">{r.vesselName}</h3><ExpeditionResults outcome={r}/></div>):<p className="py-4 text-center text-sm text-muted-foreground">수확할 배가 없어요.</p>}<Link to="/aquarium" className="flex min-h-11 items-center justify-center rounded-xl bg-secondary text-sm text-primary">보관함 보기</Link></DialogContent></Dialog>
 </section>
}

function remainingTime(returnsAt:string,now:number){const seconds=Math.max(0,Math.ceil((Date.parse(returnsAt)-now)/1000));return seconds>=60?`${duration(Math.ceil(seconds/60))} 후 귀항`:`${seconds}초 후 귀항`}
function MooredBoat({vessel,voyage,now,index,departure,onSelect,onArrival}:{vessel:HarborBoat;voyage?:HarborVoyage;now:number;index:number;departure:string|null;onSelect:()=>void;onArrival:(id:string)=>Promise<void>}){
 const ready=!!voyage&&Date.parse(voyage.returns_at)<=now
 const [departed,setDeparted]=useState<string|null>(null),[arrived,setArrived]=useState<string|null>(null)
 const leaving=!!voyage&&!ready&&departure===voyage.id&&departed!==voyage.id
 const arriving=ready&&!voyage.arrival_seen_at&&arrived!==voyage.id
 const voyageId=voyage?.id
 useEffect(()=>{if(!voyageId)return;const id=voyageId;if(leaving){const timer=setTimeout(()=>setDeparted(id),1800);return()=>clearTimeout(timer)}if(arriving){const timer=setTimeout(()=>{setArrived(id);void onArrival(id)},1800);return()=>clearTimeout(timer)}},[voyageId,leaving,arriving,onArrival])
 if(voyage&&!ready&&!leaving)return null
 return <button type="button" className="port-vessel absolute left-[38%] z-0 w-[42%] max-w-48 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" style={{top:`${24+index*31}%`}} data-phase={leaving?'departing':arriving?'arriving':'moored'} onClick={onSelect} aria-label={`${vessel.name} ${ready?'수확하기':'출항 준비'}`} disabled={leaving||arriving}>
  <span className="port-boat-bob block"><span className="port-boat-wake"/><span className={arriving?'block -scale-x-100':'block'}><BoatSprite src={vessel.sprite_path} name={vessel.name}/></span></span>{ready&&!arriving&&<span className="absolute right-0 top-1 rounded-full border border-[#e4c59d] bg-[#fff8e9] px-2 py-1 text-[10px] text-[#85613d] shadow-sm">수확</span>}
 </button>
}
